-- ============================================================
-- Cevichao App — Database Schema
-- Ejecutar en: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. Perfiles
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "view_profiles" on profiles for select using (true);
create policy "update_own_profile" on profiles for update using (auth.uid() = id);
create policy "insert_own_profile" on profiles for insert with check (auth.uid() = id);

-- 2. Trigger: crear perfil automáticamente al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- 3. Pedidos
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  order_date date not null default current_date,

  -- Proteína
  protein text not null check (protein in ('pescado', 'mixto', 'camaron', 'no_por_hoy')),

  -- Base
  base text not null check (base in ('chifles', 'doritos_verdes', 'jalapeños', 'patacones', 'no_gracias')),

  -- Extras pagados ($1 c/u)
  extra_mani boolean default false,
  extra_cocolon boolean default false,
  extra_guacamole boolean default false,

  -- Salsas gratis con cantidad
  sauce_tomate text default 'no' check (sauce_tomate in ('no','poco','medio','mucho')),
  sauce_limon text default 'no' check (sauce_limon in ('no','poco','medio','mucho')),
  sauce_mostaza text default 'no' check (sauce_mostaza in ('no','poco','medio','mucho')),
  sauce_aji text default 'no' check (sauce_aji in ('no','poco','medio','mucho')),

  comentarios text,
  total numeric(10,2) not null default 0,
  paid boolean default false,
  paid_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),

  unique (user_id, order_date)
);

alter table orders enable row level security;
create policy "view_orders" on orders for select using (true);
create policy "insert_own_order" on orders for insert with check (auth.uid() = user_id);
create policy "update_own_order" on orders for update using (auth.uid() = user_id);

-- 4. Trigger updated_at
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_updated_at on orders;
create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- 5. Hacer admin a un usuario (reemplaza el email)
-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'tu@email.com');
