// Módulo Cevichocho: tipos y funciones puras (sirven en servidor y en navegador).

export interface ChochoItem {
  key: string
  label: string
  price: number
  active: boolean
  sort: number
  /** id de la fila (solo cuando viene de la base de datos). */
  id?: string
}

export interface ChochoOrder {
  id: string
  user_id: string
  order_date: string
  items: Record<string, number>
  comentarios: string
  total: number
  paid: boolean
  paid_at: string | null
  created_at: string
  profile?: { display_name: string } | null
}

/** Claves de la tabla `settings` (propias de Cevichocho: no se mezclan con las del Cevichao). */
export const CHOCHO_KEYS = {
  locked: 'chocho_orders_locked',
  payer: 'chocho_payer',
  info: 'chocho_payment_info',
  qr: 'chocho_payment_qr',
} as const

export const MAX_QTY = 10
export const MAX_COMMENT = 200

/** Menú de respaldo si todavía no se ejecutó el SQL (la app no se cae, pero no se puede pedir). */
export const DEFAULT_CHOCHO_MENU: ChochoItem[] = [
  { key: 'cuero_cocinado', label: 'Cevichocho con cuero cocinado', price: 2, active: true, sort: 1 },
  { key: 'fritada', label: 'Cevichocho con fritada', price: 3.5, active: true, sort: 2 },
  { key: 'camaron', label: 'Cevichocho con camarón', price: 4.5, active: true, sort: 3 },
]

const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export const chochoLabel = (menu: ChochoItem[], key: string) => menu.find(i => i.key === key)?.label ?? key
export const chochoPrice = (menu: ChochoItem[], key: string) => menu.find(i => i.key === key)?.price ?? 0

/** Platos del pedido como [clave, cantidad], en el orden de la carta. */
export function itemsOfOrder(menu: ChochoItem[], items: Record<string, number>): [string, number][] {
  const order = new Map(menu.map((i, idx) => [i.key, idx]))
  return Object.entries(items ?? {})
    .filter(([, n]) => Number(n) > 0)
    .map(([k, n]) => [k, Number(n)] as [string, number])
    .sort((a, b) => (order.get(a[0]) ?? 999) - (order.get(b[0]) ?? 999))
}

export function chochoTotal(menu: ChochoItem[], items: Record<string, number>): number {
  return cents(Object.entries(items).reduce((sum, [k, n]) => sum + chochoPrice(menu, k) * n, 0))
}

/**
 * Valida un pedido que viene del navegador y calcula el total con los precios del servidor.
 * Devuelve null si algo no es válido. Los platos ocultos solo se aceptan con allowInactive (edición del admin).
 */
export function sanitizeChochoOrder(
  raw: unknown,
  menu: ChochoItem[],
  opts: { allowInactive?: boolean } = {},
): { items: Record<string, number>; comentarios: string; total: number } | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as { items?: unknown; comentarios?: unknown }
  if (!body.items || typeof body.items !== 'object' || Array.isArray(body.items)) return null

  const items: Record<string, number> = {}
  for (const [key, value] of Object.entries(body.items as Record<string, unknown>)) {
    const qty = Number(value)
    if (!Number.isInteger(qty) || qty < 0 || qty > MAX_QTY) return null
    if (qty === 0) continue
    const item = menu.find(i => i.key === key)
    if (!item || (!item.active && !opts.allowInactive)) return null
    items[key] = qty
  }
  if (Object.keys(items).length === 0) return null

  const comentarios = typeof body.comentarios === 'string' ? body.comentarios.trim().replace(/\s+/g, ' ').slice(0, MAX_COMMENT) : ''
  return { items, comentarios, total: chochoTotal(menu, items) }
}
