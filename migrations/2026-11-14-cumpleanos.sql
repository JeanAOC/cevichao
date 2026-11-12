-- Pedidos de cumpleaños (reemplaza el Excel "Pedidos Cumpleaños").
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro ejecutarlo más de una vez.

-- 1) Rol "organizador": puede crear eventos, elegir cumpleañero y pagador, marcar pagos y exportar a Excel.
--    Los admins también son organizadores.
alter table profiles
  add column if not exists can_organize boolean not null default false;

-- Dar el permiso a alguien (cambia el nombre tal como aparece en la app):
-- update profiles set can_organize = true where display_name = 'Jean Ortega';

-- 2) Eventos (una pestaña del Excel = un evento: "Cumple Andy")
create table if not exists events (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  event_date   date not null default current_date,
  -- IVA que se suma al valor de cada pedido (15 = 15 %)
  iva_rate     numeric(5,2) not null default 15 check (iva_rate >= 0 and iva_rate <= 100),
  status       text not null default 'open' check (status in ('open', 'closed')),
  -- Datos de cobro de quien pagó la cuenta: texto JSON (banco, cuenta...) y QR (imagen en base64)
  payment_info text not null default '',
  payment_qr   text not null default '',
  created_by   uuid references profiles on delete set null,
  created_at   timestamptz not null default now()
);

-- 3) Pedidos de cada persona dentro de un evento (una fila del Excel)
create table if not exists event_orders (
  id            uuid primary key default gen_random_uuid(),
  event_id      uuid not null references events on delete cascade,
  -- null = invitado sin cuenta en la app (lo agrega el organizador)
  user_id       uuid references profiles on delete cascade,
  name          text not null,
  -- false = "Esta vez no": no pide, pero igual paga su parte del cumpleañero
  attending     boolean not null default true,
  description   text not null default '',
  amount        numeric(10,2) not null default 0 check (amount >= 0),         -- "Valor"
  extras_amount numeric(10,2) not null default 0 check (extras_amount >= 0),  -- "Bebidas y extras"
  -- cumpleañero(s): no pagan; su pedido se reparte entre los demás
  is_birthday   boolean not null default false,
  paid          boolean not null default false,
  paid_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (event_id, user_id)
);

-- Quién pagó la cuenta (su pedido cuenta como pagado). Se agrega después porque las tablas se referencian.
alter table events
  add column if not exists payer_order_id uuid references event_orders(id) on delete set null;

-- Todos los usuarios con sesión pueden VER eventos y pedidos. Toda escritura pasa por la app (service role).
alter table events enable row level security;
alter table event_orders enable row level security;
drop policy if exists "view_events" on events;
create policy "view_events" on events for select using (true);
drop policy if exists "view_event_orders" on event_orders;
create policy "view_event_orders" on event_orders for select using (true);

drop trigger if exists event_orders_updated_at on event_orders;
create trigger event_orders_updated_at before update on event_orders
  for each row execute function set_updated_at();
