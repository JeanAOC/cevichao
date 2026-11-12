-- Pantalla de Pagos: rol de cobrador + cierre de un hueco de seguridad en profiles.
-- Ejecutar UNA vez en Supabase → SQL Editor. Es seguro ejecutarlo más de una vez.

-- 1) Rol "cobrador": puede entrar a Pagos (marcar pagados, cerrar pedidos, datos de cobro)
--    sin poder cambiar precios ni borrar pedidos. Los admins también entran a Pagos.
alter table profiles
  add column if not exists can_collect boolean not null default false;

-- Dar el permiso a alguien (cambia el nombre tal como aparece en la app):
-- update profiles set can_collect = true where display_name = 'Jeremy Muñoz';

-- 2) Seguridad: hoy la política "update_own_profile" deja que cualquier usuario edite SU
--    PROPIA fila entera desde la API pública, incluidas is_admin y can_collect (podría
--    hacerse admin solo). Se limita a que solo pueda cambiar su nombre.
--    La app no actualiza perfiles desde el navegador, así que no cambia nada visible.
revoke update on profiles from authenticated, anon;
grant update (display_name) on profiles to authenticated;

-- Los datos de cobro (texto y QR), el pagador del día y el cierre de pedidos se guardan en
-- la tabla `settings` que ya existe (claves: payment_info, payment_qr, payer, orders_locked).
