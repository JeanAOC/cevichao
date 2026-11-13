-- Módulo Cevichocho: menú propio (editable desde la app) y pedidos del día.
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro ejecutarlo más de una vez.
-- No toca las tablas del Cevichao. Pagador, cierre y datos de cobro usan la tabla `settings`
-- con claves propias (chocho_orders_locked, chocho_payer, chocho_payment_info, chocho_payment_qr): no hay que crear nada para eso.

create table if not exists chocho_menu (
  id         uuid primary key default gen_random_uuid(),
  -- Identificador estable que se guarda en los pedidos; no cambia aunque se renombre el plato.
  key        text not null unique,
  label      text not null,
  price      numeric(10,2) not null default 0 check (price >= 0),
  -- false = oculto del formulario, pero los pedidos viejos lo siguen mostrando.
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists chocho_orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles(id) on delete cascade,
  order_date  date not null,
  -- { "clave_del_plato": cantidad }
  items       jsonb not null default '{}'::jsonb,
  comentarios text not null default '',
  -- Se guarda el total del momento: cambiar precios después no cambia pedidos ya hechos.
  total       numeric(10,2) not null default 0,
  paid        boolean not null default false,
  paid_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, order_date)
);

create index if not exists chocho_orders_date_idx on chocho_orders (order_date);

-- Todos los usuarios con sesión pueden VER el menú y los pedidos (la tabla del día es pública, como en Cevichao).
-- NO hay políticas de insertar/editar/borrar: todo se escribe desde la app (service role) después de validar
-- el pedido y recalcular el total en el servidor, así nadie puede ponerse un total o un «pagado» desde la API pública.
alter table chocho_menu enable row level security;
alter table chocho_orders enable row level security;
drop policy if exists "view_chocho_menu" on chocho_menu;
create policy "view_chocho_menu" on chocho_menu for select to authenticated using (true);
drop policy if exists "view_chocho_orders" on chocho_orders;
create policy "view_chocho_orders" on chocho_orders for select to authenticated using (true);

-- Menú del cartel (revisa los precios en Cevichocho → Pagos → Menú si alguno no coincide)
insert into chocho_menu (key, label, price, active, sort) values
  ('vegetariano',               'Cevichocho vegetariano',                          1.50, true,  1),
  ('cuero_cocinado',            'Cevichocho con cuero cocinado',                   2.00, true,  2),
  ('cuero_reventado',           'Cevichocho con cuero reventado',                  2.00, true,  3),
  ('cuero_cocinado_reventado',  'Cevichocho con cuero cocinado + reventado',       3.00, true,  4),
  ('volquetero',                'Volquetero',                                      3.00, true,  5),
  ('corvina',                   'Cevichocho con corvina',                          3.00, true,  6),
  ('fritada',                   'Cevichocho con fritada',                          3.50, true,  7),
  ('mixto_cuero_corvina',       'Mixto cuero cocinado + corvina',                  3.50, true,  8),
  ('camaron',                   'Cevichocho con camarón',                          4.50, true,  9),
  ('mixto_fritada_cuero',       'Mixto fritada + cuero cocinado',                  4.50, true, 10),
  ('mixto_fritada_reventado',   'Mixto fritada + cuero reventado',                 4.50, true, 11),
  ('mixto_cuero_atun',          'Mixto cuero cocinado + atún',                     4.50, true, 12),
  ('ceviche_camaron',           'Ceviche de camarón',                              4.50, true, 13),
  ('ceviche_pescado',           'Ceviche de pescado',                              4.50, true, 14),
  ('mixto_atun_camaron',        'Mixto atún + camarón',                            5.00, true, 15),
  ('mixto_corvina_camaron',     'Mixto corvina + camarón',                         5.00, true, 16),
  ('mixto_cuero_camaron',       'Mixto cuero cocinado + camarón',                  5.00, true, 17),
  ('solo_fritada',              'Solo fritada',                                    5.60, true, 18),
  ('mixto_fritada_camaron',     'Mixto fritada + camarón',                         6.00, true, 19),
  ('fritada_cuero_reventado',   'Fritada + cuero cocinado + reventado',            6.00, true, 20),
  ('fritada_cuero_corvina',     'Fritada + cuero cocinado + corvina',              6.50, true, 21),
  ('fritada_cuero_camaron',     'Fritada + cuero cocinado + camarón',              7.00, true, 22),
  ('bandera',                   'Bandera: fritada + camarón + corvina',            7.00, true, 23)
on conflict (key) do nothing;
