import {
  BASE_LABELS, BEBIDA_ITEMS, EXTRA_KEYS, MAX_BEBIDA_QTY, MAX_EXTRA_QTY, PROTEIN_PRICES, SAUCE_AMOUNT_LABELS,
  bebidasOf, calculateTotal,
  type Base, type Bebida, type BebidaCounts, type ExtraCounts, type OrderInput, type Protein, type SauceAmount,
} from '@/lib/pricing'

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

function pick<T extends string>(v: unknown, allowed: Record<T, unknown>): T | null {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(allowed, v) ? (v as T) : null
}

/**
 * Valida el payload recibido del cliente, descarta campos desconocidos
 * y recalcula el total en el servidor. Devuelve null si es inválido.
 */
export function sanitizeOrder(raw: unknown): (OrderInput & { bebida: Bebida; total: number }) | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>

  const protein = pick<Protein>(r.protein, PROTEIN_PRICES)
  const base = pick<Base>(r.base, BASE_LABELS)
  const sauces = (['sauce_tomate', 'sauce_limon', 'sauce_mostaza', 'sauce_aji'] as const).map(
    k => pick<SauceAmount>(r[k], SAUCE_AMOUNT_LABELS),
  )
  if (!protein || !base || sauces.some(s => !s)) return null

  const noFood = protein === 'no_por_hoy'

  // Cantidades: solo claves conocidas, enteros entre 1 y el máximo
  const counts = <K extends string>(raw: unknown, keys: K[], max: number): Partial<Record<K, number>> => {
    const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
    const out: Partial<Record<K, number>> = {}
    if (noFood) return out
    for (const k of keys) {
      const n = Number(src[k])
      if (Number.isInteger(n) && n > 0) out[k] = Math.min(n, max)
    }
    return out
  }
  const bebidas: BebidaCounts = counts(r.bebidas, BEBIDA_ITEMS, MAX_BEBIDA_QTY)
  const extras: ExtraCounts = counts(r.extras, EXTRA_KEYS, MAX_EXTRA_QTY)

  const order: OrderInput = {
    protein,
    base: noFood ? 'no_gracias' : base,
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
  const bebida: Bebida = BEBIDA_ITEMS.find(k => bebidas[k]) ?? 'ninguna'
  return { ...order, bebida, total: calculateTotal(order) }
}
