-- ============================================================
-- PASO 1: Borrar todo del Mundial (CASCADE borra dependencias)
-- ============================================================

-- Cevichao (por si ya existen de una corrida anterior)
drop table if exists orders cascade;

-- Mundial
drop table if exists match_favorites cascade;
drop table if exists push_subscriptions cascade;
drop table if exists prediction_attempts cascade;
drop table if exists bets cascade;
drop table if exists tournament_awards cascade;
drop table if exists tournament_predictions cascade;
drop table if exists predictions cascade;
drop table if exists players cascade;
drop table if exists matches cascade;
drop table if exists teams cascade;
drop table if exists site_settings cascade;
drop table if exists profiles cascade;

-- Funciones del Mundial
drop function if exists handle_new_user() cascade;
drop function if exists update_updated_at() cascade;
drop function if exists calculate_points(int, int, int, int) cascade;
drop function if exists update_match_points(uuid) cascade;
drop function if exists lock_started_matches() cascade;
drop function if exists set_updated_at() cascade;
drop function if exists update_lead_tracking() cascade;

-- ============================================================
-- PASO 2: Crear tablas de Cevichao
-- ============================================================

create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  is_admin boolean default false,
  created_at timestamptz default now()
);

alter table profiles enable row level security;
create policy "view_profiles" on profiles for select using (true);
create policy "update_own_profile" on profiles for update using (auth.uid() = id);
create policy "insert_own_profile" on profiles for insert with check (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
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

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  order_date date not null default current_date,

  protein text not null check (protein in ('pescado', 'mixto', 'camaron', 'no_por_hoy')),
  base text not null check (base in ('chifles', 'doritos_verdes', 'jalapeños', 'patacones', 'no_gracias')),

  extra_mani boolean default false,
  extra_guacamole boolean default false,
  extra_sal_prieta boolean default false,
  extra_mani_quebrado boolean default false,
  extra_cocolon boolean default false,
  extra_toston boolean default false,
  bebida text default 'ninguna' check (bebida in ('ninguna','agua','agua_mineral','te_helado','cola','imperial')),

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

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger orders_updated_at before update on orders
  for each row execute function set_updated_at();

-- ============================================================
-- PASO 3: Hacerte admin (cambia el email por el tuyo)
-- ============================================================

-- update profiles set is_admin = true
-- where id = (select id from auth.users where email = 'jortega@b-tech.ai');
