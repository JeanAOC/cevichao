@AGENTS.md

# Pedidos (cevichao-app) — contexto del proyecto

App web en español para un equipo. Antes era solo "Cevichao" (pedir ceviche cada día); ahora se llama **Pedidos** y tiene dos módulos
que se eligen en `/inicio` después de loguearse:

1. **🐟 Cevichao** — pedir el ceviche del día, tabla pública con filtros, historial y cobros.
2. **🎂 Cumpleaños** — reemplaza un Excel ("Pedidos Cumpleaños"): cada persona pone qué pide y cuánto cuesta; el cumpleañero no paga y su
   pedido se reparte entre los demás; se marca quién pagó; se exporta a Excel.

Stack: Next.js 16.3 (App Router, Turbopack), React 19, Tailwind 4, Supabase (auth + Postgres), `exceljs`. TypeScript.
Todo el texto de la interfaz está en español (Ecuador). Los comandos de verificación son `npx tsc --noEmit` y `npx eslint <ruta>`.

## Next 16 (ojo, lo dice AGENTS.md)
- `middleware.ts` ahora es **`src/proxy.ts`** (función `proxy`). Redirige a `/login` sin sesión y a `/inicio` si ya hay sesión en `/login`.
- Antes de usar APIs de Next, leer `node_modules/next/dist/docs/`.

## Mapa de rutas
| Ruta | Qué es |
|---|---|
| `/login` | Login/registro (logo `AppLogo`, SVG propio: tazón de ceviche con velita) |
| `/inicio` | Elegir módulo (grupo `(hub)`) |
| `/dashboard` | **Menú** de Cevichao (página principal del módulo) |
| `/pedir`, `/mi-pedido`, `/tabla`, `/historial` | Cevichao: pedir, ver mi pedido (+ cómo pagar), tabla del día, historial |
| `/pagos?tab=` | Cobros de Cevichao (pestañas: cobros, pagador, cierre, datos). Solo `canCollect` |
| `/admin?tab=` | Solo admins: pestañas pedidos, proteínas, bases, extras, bebidas (editar menú y precios, editar/borrar pedidos) |
| `/admin/editar/[orderId]` | Editar un pedido ajeno (mismo `OrderForm` con `adminEdit`) |
| `/cumple`, `/cumple/[id]?tab=` | Eventos de cumpleaños. Pestañas: pedido, resumen; organizador: pagos, cuenta, organizar |
| `/api/orders/save`, `/api/orders/cancel` | Guardar/cancelar mi pedido (valida y recalcula el total en el servidor) |
| `/api/admin/{menu,update-order,delete-order,mark-paid,lock}` | Acciones de admin / cobrador |
| `/api/pagos/{mark-all,payer,payment-info}` | Cobros de Cevichao |
| `/api/cumple/{me,manage,export}` | Cumpleaños: acciones del participante, del organizador y exportar `.xlsx` |

Grupos de layout: `(app)` = Cevichao con su navbar, `(hub)` = `/inicio`, `cumple/` = layout propio. El `Navbar` (`src/components/Navbar.tsx`)
es genérico (props `items`, `brand`) y tiene el botón **⇄ Módulos**.

## Roles y permisos (`src/lib/auth.ts`)
`getStaff()` devuelve `{ isAdmin, canCollect, canOrganize }`. Los admins son superset.
- `profiles.is_admin` — administra menú/precios y pedidos.
- `profiles.can_collect` — entra a **Pagos** de Cevichao (marcar pagados, cerrar pedidos, datos de cobro).
- `profiles.can_organize` — crea y maneja **eventos de cumpleaños**.
- Las rutas API usan `requireCollector()` / `requireOrganizer()` / `getStaff()`. Las escrituras sensibles usan `createAdminClient()` (service role) **después** de validar permisos.

## Base de datos (Supabase) — migraciones en `migrations/`
El esquema inicial está en `schema.sql` / `reset-and-setup.sql` (desactualizados: no incluyen `settings`). Las migraciones se **ejecutan a mano en Supabase → SQL Editor** (el agente no puede). En orden:
1. `2026-11-12-bebidas-multiples.sql` — columnas `orders.bebidas` y `orders.extras` (jsonb con cantidades). Se mantienen las columnas antiguas (`bebida`, `extra_*` booleanos) y la app las sigue llenando.
2. `2026-11-12-pagos.sql` — `profiles.can_collect` + cierra un hueco: la política `update_own_profile` dejaba a cualquiera editar su `is_admin`; ahora solo puede cambiar `display_name`.
3. `2026-11-13-menu-editable.sql` — tabla `menu_items` (kind: protein/base/extra/bebida; key estable, label, price, active, sort) + siembra + quita los `check` fijos de `orders.protein/base/bebida`.
4. `2026-11-14-cumpleanos.sql` — `profiles.can_organize`, tablas `events` y `event_orders`.

Tabla `settings` (key/value) guarda: `orders_locked`, `payer` (`YYYY-MM-DD|userId`), `payment_info` (JSON de la cuenta), `payment_qr` (data URL).
**Si un SQL no se corrió, la app no se cae**: `loadMenu()` cae al menú por defecto y las pantallas muestran un aviso pidiendo ejecutar el archivo, pero **guardar pedidos falla** sin las columnas de la migración 1.

## Cevichao: cómo funciona
- **El menú vive en la base de datos** (`menu_items`), no en el código. `src/lib/menu.ts` (tipos y funciones puras: `itemsOf`, `labelOf`, `priceOf`, `slugify`, `defaultMenu`) y `src/lib/menu-server.ts` (`loadMenu()`).
- `src/lib/pricing.ts`: salsas (fijas), límites, `calculateTotal(menu, order)`, `extrasOf`, `bebidasOf`. Las claves de proteína/base/extra/bebida son `string` (vienen del menú).
- **Maní y guacamole** (gratis, los pone la señora) y las **salsas** (tomate, limón, mostaza, ají: no/poco/medio/mucho) son fijos, no editables.
- Extras y bebidas se piden **por cantidad** (componente `QtyRow` en `OrderForm`, botones de 44 px para celular, máx. 10).
- Patacones cuesta +$1.00 (precio de la base, editable). Se quitaron "No por hoy" y "No gracias" del formulario (los datos viejos con esos valores siguen mostrándose).
- Los pedidos guardan su `total` al momento: cambiar precios **no** cambia pedidos ya hechos (por eso "Mi pedido" ya no muestra precio por ítem).
- Seguridad: `sanitizeOrder(raw, menu, {allowInactive})` en `src/lib/orders.ts` valida contra el menú y **recalcula el total en el servidor**; el cliente nunca decide `user_id`, fecha ni total.
- Fecha de hoy: `todayDate()` en `src/lib/date.ts` (zona `America/Guayaquil`).
- Tabla pública `/tabla`: resumen del día (para saber cuánto pedir en el local), filtros (`FilterBar`, solo opciones que existen), cuadro grande "N + qué se cuenta + total".
- Pagos: quien "pagó en el local" queda con su pedido pagado; "Datos de cobro" = formulario por campos (bancos de Ecuador en `src/lib/payment.ts`) + QR (se reduce a 480 px en el navegador y se guarda como data URL). Se ve en "Mi pedido" mientras no se haya pagado.

## Cumpleaños: reglas de negocio (salen del Excel original)
Lógica en `src/lib/cumple.ts` (`computeSummary`). Verificada contra la hoja "Cumple Andy" (8 de 9 totales coinciden; el 9.º difiere porque en el Excel el pedido del cumpleañero estaba tecleado como subtotal).
- `IVA = (Valor + Bebidas y extras) × iva_rate` (15 % por defecto, editable por evento).
- **Cumpleañero(s)**: no pagan; su subtotal se divide entre todos los demás participantes ("Invitado" en el Excel). Quien dice **"Esta vez no"** paga solo esa parte.
- **No se redondea en el medio** (igual que el Excel): solo se redondea el total de cada persona a centavos. Por eso `money()` usa `Math.round(n + EPSILON)`.
- Quien pagó la cuenta cuenta como pagado (`events.payer_order_id`); pagado/no pagado es un booleano (sin pagos parciales).
- Participantes = usuarios que ponen su pedido + invitados sin cuenta (`user_id` null) que agrega el organizador. Quien no responde no aparece ni paga.
- Exportar: `/api/cumple/export` genera `.xlsx` con las columnas Nombre, Pedido, Valor, Bebidas y extras, IVA, Subtotal, Invitado, Total a pagar, Pagado, Saldo, con fórmulas vivas y el cumpleañero en amarillo.

## Convenciones de UI
- Colores solo con variables CSS de `src/app/globals.css` (tema claro/oscuro con `data-theme`). Chips semánticos: `.chip chip-ok|warn|info|neutral|poco|medio|mucho`.
- Pestañas: `TabNav` (en la URL `?tab=`), usado en `/pagos`, `/admin` y `/cumple/[id]`. (`/pagos` aún tiene su propia copia de ese código.)
- Acciones de servidor desde botones: `ActionButton` (con confirmación en dos pasos opcional).
- Mobile primero: padding 16-24 px, objetivos táctiles ≥ 44 px, pestañas con scroll horizontal.

## Trampas conocidas (importante)
- **PowerShell 5.1 corrompe UTF-8**: `Get-Content -Raw` + `Set-Content` convierte acentos y emojis en `MenÃº`. No reescribir archivos con PowerShell; usar las herramientas Edit/Write. Ya pasó una vez y hubo que repararlo.
- La herramienta **Bash** de este entorno se cuelga (timeouts); usar PowerShell para comandos, sobre todo `git`.
- En PowerShell, los mensajes de commit con comillas rompen el comando: guardar el mensaje en un archivo y usar `git commit -F`.
- El error de hidratación con `bis_skin_checked` en dev **lo causa una extensión del navegador** (Bitdefender), no el código. `<html>` y `<body>` ya tienen `suppressHydrationWarning` por el script del tema.
- Errores de eslint **anteriores a este trabajo** (no tocar sin pedir): `react/no-unescaped-entities` en `historial/page.tsx` y `admin/page.tsx`, y `set-state-in-effect` en `Navbar.tsx`.
- Las claves `sb_secret_…` de Supabase solo van en el header `apikey` (no como `Bearer`). `.env.local` está en `.gitignore`: **nunca** subir claves ni datos bancarios al repo; los datos de cobro se guardan solo en la base de datos.
- Un login con `invalid_credentials` en local suele ser un proyecto de Supabase distinto al de producción; las 3 variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) deben ser del mismo proyecto.

## Estado del trabajo
- Rama de trabajo: `feature/pagos-y-menu` (existe en `origin`; `main` sigue en el estado anterior). **No mezclar a `main` sin haber corrido las 4 migraciones**: producción probablemente se despliega sola desde `main` y el código nuevo escribe columnas que aún no existen.
- Ya está en la rama remota: Pagos, cantidades en bebidas/extras, menú como página principal, validación en servidor. **Sin commit todavía** (último trabajo local): menú editable en BD + `/admin` con pestañas, módulo de Cumpleaños completo, pantalla `/inicio`, `AppLogo`, y el plugin `awesome-claude-skills`.
- **Nada de lo reciente se probó contra la base de datos real** (solo `tsc` y pruebas de la lógica con números del Excel). Pendiente verificar en el navegador: crear evento, agregar personas, marcar cumpleañero, exportar Excel, editar precios del menú.
- Pendientes que el usuario aún debe hacer: correr las migraciones 3 y 4 (y 1 y 2 si no las corrió), dar los permisos con `update profiles set can_collect/can_organize = true where display_name = '…'`, y poner una `SUPABASE_SERVICE_ROLE_KEY` válida (la que pegó antes daba 401).
- Ideas mencionadas pero no hechas: favicon con el logo, hacer editables maní/guacamole/salsas, pagos parciales en cumpleaños, unificar las pestañas de `/pagos` con `TabNav`, revisar los precios del cartel físico del local (combos con cola, nombres de bases) contra la app.

## Cómo trabajar con el usuario
- Responder en español, claro y corto; explicar qué falta correr o probar. Decir con honestidad lo que **no** se probó.
- Hacer commit/push solo cuando lo pide; si está en `main`, crear rama primero. Terminar los commits con la línea `Co-Authored-By` indicada por el sistema.
- Antes de cambios que afecten datos reales (recalcular totales, borrar, SQL), avisar y esperar confirmación.
