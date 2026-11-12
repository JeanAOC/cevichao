import {
  MAX_BEBIDA_QTY, MAX_EXTRA_QTY, SAUCE_AMOUNT_LABELS,
  bebidasOf, calculateTotal,
  type Counts, type OrderInput, type SauceAmount,
} from '@/lib/pricing'
import { findItem, type MenuData, type MenuKind } from '@/lib/menu'
import type { Order } from '@/types'

export type OrderFilters = Record<string, string | undefined>

/**
 * Aplica los filtros de la URL (protein, base, mani, guac, bebida).
 * Con filtros activos, los "no pide hoy" se ocultan salvo que keepNoFood sea true.
 */
export function filterOrders(orders: Order[], f: OrderFilters, keepNoFood = false): Order[] {
  const active = !!(f.protein || f.base || f.mani || f.guac || f.bebida)
  return orders.filter(o => {
    if (o.protein === 'no_por_hoy') return keepNoFood || !active
    if (f.protein && o.protein !== f.protein) return false
    if (f.base && o.base !== f.base) return false
    if (f.bebida && !bebidasOf(o).some(([k]) => k === f.bebida)) return false
    if (f.mani === '1' && !o.extra_mani) return false
    if (f.mani === '0' && o.extra_mani) return false
    if (f.guac === '1' && !o.extra_guacamole) return false
    if (f.guac === '0' && o.extra_guacamole) return false
    return true
  })
}

/** Opciones de filtro que realmente existen en los pedidos dados. */
export function availableFilters(orders: Order[]): Record<string, string[]> {
  const real = orders.filter(o => o.protein !== 'no_por_hoy')
  const uniq = (xs: (string | null | undefined)[]) => [...new Set(xs.filter((x): x is string => !!x))]
  const yesNo = (pick: (o: Order) => boolean) => [
    ...(real.some(pick) ? ['1'] : []),
    ...(real.some(o => !pick(o)) ? ['0'] : []),
  ]
  return {
    protein: uniq(real.map(o => o.protein)),
    base: uniq(real.map(o => o.base)),
    bebida: uniq(real.flatMap(o => bebidasOf(o).map(([k]) => k))),
    mani: yesNo(o => o.extra_mani),
    guac: yesNo(o => o.extra_guacamole),
  }
}

const bool = (v: unknown) => v === true

const LEVELS = Object.keys(SAUCE_AMOUNT_LABELS) as SauceAmount[]
const sauce = (v: unknown): SauceAmount | null =>
  typeof v === 'string' && (LEVELS as string[]).includes(v) ? (v as SauceAmount) : null

interface SanitizeOptions {
  /** El admin puede guardar items ocultos (para editar pedidos viejos). Los usuarios, solo los activos. */
  allowInactive?: boolean
}

/**
 * Valida el payload recibido del cliente contra el menú actual, descarta campos desconocidos
 * y recalcula el total en el servidor con los precios del menú. Devuelve null si es inválido.
 */
export function sanitizeOrder(
  raw: unknown,
  menu: MenuData,
  { allowInactive = false }: SanitizeOptions = {},
): (OrderInput & { bebida: string; total: number }) | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const valid = (kind: MenuKind, key: unknown) => {
    if (typeof key !== 'string') return false
    const item = findItem(menu, kind, key)
    return !!item && (allowInactive || item.active)
  }

  const protein = r.protein
  const base = r.base
  const sauces = (['sauce_tomate', 'sauce_limon', 'sauce_mostaza', 'sauce_aji'] as const).map(k => sauce(r[k]))
  if (!valid('protein', protein) || !valid('base', base) || sauces.some(s => !s)) return null

  const noFood = protein === 'no_por_hoy'

  // Cantidades: solo claves del menú, enteros entre 1 y el máximo
  const counts = (rawCounts: unknown, kind: MenuKind, max: number): Counts => {
    const src = rawCounts && typeof rawCounts === 'object' ? (rawCounts as Record<string, unknown>) : {}
    const out: Counts = {}
    if (noFood) return out
    for (const [k, v] of Object.entries(src)) {
      const n = Number(v)
      if (valid(kind, k) && Number.isInteger(n) && n > 0) out[k] = Math.min(n, max)
    }
    return out
  }
  const bebidas = counts(r.bebidas, 'bebida', MAX_BEBIDA_QTY)
  const extras = counts(r.extras, 'extra', MAX_EXTRA_QTY)

  const order: OrderInput = {
    protein: protein as string,
    base: noFood ? 'no_gracias' : (base as string),
    extra_mani: !noFood && bool(r.extra_mani),
    extra_guacamole: !noFood && bool(r.extra_guacamole),
    // Booleanos antiguos: derivados de las cantidades
    extra_sal_prieta: !!extras.extra_sal_prieta,
    extra_mani_quebrado: !!extras.extra_mani_quebrado,
    extra_cocolon: !!extras.extra_cocolon,
    extra_toston: !!extras.extra_toston,
    extras,
    bebidas,
    sauce_tomate: noFood ? 'no' : sauces[0]!,
    sauce_limon: noFood ? 'no' : sauces[1]!,
    sauce_mostaza: noFood ? 'no' : sauces[2]!,
    sauce_aji: noFood ? 'no' : sauces[3]!,
    comentarios: noFood || typeof r.comentarios !== 'string' ? '' : r.comentarios.slice(0, 500),
  }
  // `bebida` (columna antigua, un solo valor): la primera bebida elegida, o 'ninguna'
  const bebida = Object.keys(bebidas)[0] ?? 'ninguna'
  return { ...order, bebida, total: calculateTotal(menu, order) }
}
