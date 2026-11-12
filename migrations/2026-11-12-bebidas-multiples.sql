-- Bebidas y extras con cantidad (varias unidades de cada uno).
-- Ejecutar UNA vez en Supabase → SQL Editor, ANTES de usar la nueva versión de la app.
-- Se puede ejecutar más de una vez sin problema (es idempotente).
--
-- Formato:  bebidas = {"cola": 2, "agua": 1}
--           extras  = {"extra_cocolon": 2, "extra_toston": 1}
-- Las columnas antiguas (`bebida` y los booleanos extra_*) se mantienen y la app las
-- sigue llenando, así nada de lo anterior se rompe.

alter table orders
  add column if not exists bebidas jsonb not null default '{}'::jsonb,
  add column if not exists extras  jsonb not null default '{}'::jsonb;

-- Pasar pedidos existentes (una sola bebida) al nuevo formato
update orders
set bebidas = jsonb_build_object(bebida, 1)
where bebida <> 'ninguna'
  and bebidas = '{}'::jsonb;

-- Pasar extras existentes (booleanos) al nuevo formato, con cantidad 1
update orders
set extras = jsonb_strip_nulls(jsonb_build_object(
  'extra_sal_prieta',    case when extra_sal_prieta    then 1 end,
  'extra_mani_quebrado', case when extra_mani_quebrado then 1 end,
  'extra_cocolon',       case when extra_cocolon       then 1 end,
  'extra_toston',        case when extra_toston        then 1 end
))
where extras = '{}'::jsonb
  and (extra_sal_prieta or extra_mani_quebrado or extra_cocolon or extra_toston);
