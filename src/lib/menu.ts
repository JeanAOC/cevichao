// Menú editable: tipos y funciones puras (se pueden usar en servidor y en el navegador).
// La carga desde la base de datos está en menu-server.ts.

export type MenuKind = 'protein' | 'base' | 'extra' | 'bebida'

export const MENU_KINDS: { kind: MenuKind; label: string; singular: string; icon: string }[] = [
  { kind: 'protein', label: 'Proteínas', singular: 'proteína', icon: '🐟' },
  { kind: 'base', label: 'Bases', singular: 'base', icon: '🥔' },
  { kind: 'extra', label: 'Extras', singular: 'extra', icon: '➕' },
  { kind: 'bebida', label: 'Bebidas', singular: 'bebida', icon: '🥤' },
]

export interface MenuItem {
  id: string
  kind: MenuKind
  /** Identificador estable que se guarda en los pedidos. No cambia aunque se renombre. */
  key: string
  label: string
  price: number
  /** Si es false, no se ofrece en el menú ni en el formulario, pero los pedidos viejos lo siguen mostrando. */
  active: boolean
  sort: number
}

export interface MenuData {
  items: MenuItem[]
  /** false = la tabla menu_items aún no existe y se usan los valores por defecto. */
  fromDb: boolean
}

type Seed = [kind: MenuKind, key: string, label: string, price: number, active?: boolean]

// Valores actuales del menú. Es lo que se usa si todavía no se corrió el SQL, y lo que siembra el SQL.
const SEEDS: Seed[] = [
  ['protein', 'pescado', 'Pescado', 2.25],
  ['protein', 'mixto', 'Mixto', 2.5],
  ['protein', 'camaron', 'Camarón', 2.5],
  ['protein', 'no_por_hoy', 'No por hoy', 0, false],
  ['base', 'chifles', 'Chifles', 0],
  ['base', 'doritos_verdes', 'Doritos Verdes', 0],
  ['base', 'jalapeños', 'Jalapeños', 0],
  ['base', 'patacones', 'Patacones', 1],
  ['base', 'no_gracias', 'No gracias', 0, false],
  ['extra', 'extra_sal_prieta', 'Salprieta', 1],
  ['extra', 'extra_mani_quebrado', 'Maní Quebrado', 1],
  ['extra', 'extra_cocolon', 'Cocolón', 1],
  ['extra', 'extra_toston', 'Tostón', 1.5],
  ['bebida', 'agua', 'Agua', 0.5],
  ['bebida', 'agua_mineral', 'Agua Mineral', 0.75],
  ['bebida', 'te_helado', 'Té Helado', 1],
  ['bebida', 'cola', 'Cola', 0.5],
  ['bebida', 'imperial', 'Imperial', 0.75],
]

export function defaultMenu(): MenuData {
  const counters: Partial<Record<MenuKind, number>> = {}
  const items = SEEDS.map(([kind, key, label, price, active = true]): MenuItem => {
    const sort = (counters[kind] = (counters[kind] ?? 0) + 1)
    return { id: `default:${kind}:${key}`, kind, key, label, price, active, sort }
  })
  return { items, fromDb: false }
}

/** Items de un tipo, ordenados. Por defecto solo los activos. */
export function itemsOf(menu: MenuData, kind: MenuKind, activeOnly = true): MenuItem[] {
  return menu.items
    .filter(i => i.kind === kind && (!activeOnly || i.active))
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
}

export function findItem(menu: MenuData, kind: MenuKind, key: string): MenuItem | undefined {
  return menu.items.find(i => i.kind === kind && i.key === key)
}

/** Nombre para mostrar. Si el item ya no existe, muestra la clave de forma legible. */
export function labelOf(menu: MenuData, kind: MenuKind, key: string): string {
  return findItem(menu, kind, key)?.label ?? key.replace(/^extra_/, '').replace(/_/g, ' ')
}

export function priceOf(menu: MenuData, kind: MenuKind, key: string): number {
  return findItem(menu, kind, key)?.price ?? 0
}

/** { clave: nombre } de un tipo, incluyendo los ocultos (para pedidos viejos). */
export function labelMap(menu: MenuData, kind: MenuKind): Record<string, string> {
  return Object.fromEntries(itemsOf(menu, kind, false).map(i => [i.key, i.label]))
}

/** "Papas fritas" -> "papas_fritas" (sin tildes ni símbolos). */
export function slugify(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 40)
}

/** "$5.17". Redondea bien los casos como 0.455 → $0.46 (toFixed solo se equivoca por la coma flotante). */
export const money = (n: number) => `$${(Math.round((n + Number.EPSILON) * 100) / 100).toFixed(2)}`
