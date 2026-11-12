-- Menú editable desde la app (precios, nombres y opciones nuevas de proteínas, bases, extras y bebidas).
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro ejecutarlo más de una vez.
-- Requiere haber corrido antes 2026-11-12-bebidas-multiples.sql (columnas bebidas/extras en orders).

create table if not exists menu_items (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null check (kind in ('protein', 'base', 'extra', 'bebida')),
  -- Identificador estable que se guarda en los pedidos; no cambia aunque se renombre el item.
  key        text not null,
  label      text not null,
  price      numeric(10,2) not null default 0 check (price >= 0),
  -- false = oculto del menú y del formulario, pero los pedidos viejos lo siguen mostrando.
  active     boolean not null default true,
  sort       integer not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, key)
);

-- Todos los usuarios con sesión pueden VER el menú. Solo se modifica desde la app (service role).
alter table menu_items enable row level security;
drop policy if exists "view_menu" on menu_items;
create policy "view_menu" on menu_items for select using (true);

-- Menú actual (si ya existen, no se tocan los precios que hayas cambiado)
insert into menu_items (kind, key, label, price, active, sort) values
  ('protein', 'pescado',        'Pescado',        2.25, true,  1),
  ('protein', 'mixto',          'Mixto',          2.50, true,  2),
  ('protein', 'camaron',        'Camarón',        2.50, true,  3),
  ('protein', 'no_por_hoy',     'No por hoy',     0,    false, 4),
  ('base',    'chifles',        'Chifles',        0,    true,  1),
  ('base',    'doritos_verdes', 'Doritos Verdes', 0,    true,  2),
  ('base',    'jalapeños',      'Jalapeños',      0,    true,  3),
  ('base',    'patacones',      'Patacones',      1.00, true,  4),
  ('base',    'no_gracias',     'No gracias',     0,    false, 5),
  ('extra',   'extra_sal_prieta',    'Salprieta',     1.00, true, 1),
  ('extra',   'extra_mani_quebrado', 'Maní Quebrado', 1.00, true, 2),
  ('extra',   'extra_cocolon',       'Cocolón',       1.00, true, 3),
  ('extra',   'extra_toston',        'Tostón',        1.50, true, 4),
  ('bebida',  'agua',           'Agua',           0.50, true,  1),
  ('bebida',  'agua_mineral',   'Agua Mineral',   0.75, true,  2),
  ('bebida',  'te_helado',      'Té Helado',      1.00, true,  3),
  ('bebida',  'cola',           'Cola',           0.50, true,  4),
  ('bebida',  'imperial',       'Imperial',       0.75, true,  5)
on conflict (kind, key) do nothing;

-- Los pedidos deben poder guardar proteínas y bases nuevas: se quitan las listas fijas de valores.
alter table orders drop constraint if exists orders_protein_check;
alter table orders drop constraint if exists orders_base_check;
alter table orders drop constraint if exists orders_bebida_check;
