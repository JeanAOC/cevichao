import { labelOf, priceOf, type MenuData } from '@/lib/menu'

// Las claves de proteína, base, extra y bebida vienen del menú editable (lib/menu.ts).
export type Protein = string
export type Base = string
export type Bebida = string
export type SauceAmount = 'no' | 'poco' | 'medio' | 'mucho'

/** Cantidades por clave: { cola: 2, agua: 1 } */
export type Counts = Record<string, number>
export type ExtraCounts = Counts
export type BebidaCounts = Counts

export const MAX_EXTRA_QTY = 10
export const MAX_BEBIDA_QTY = 10

export const SAUCE_AMOUNTS: SauceAmount[] = ['no', 'poco', 'medio', 'mucho']
export const SAUCE_AMOUNT_LABELS: Record<SauceAmount, string> = {
  no: 'No',
  poco: 'Poco',
  medio: 'Medio',
  mucho: 'Mucho',
}

function entriesOf(counts?: Counts | null): [string, number][] {
  return Object.entries(counts ?? {})
    .map(([k, n]) => [k, Number(n)] as [string, number])
    .filter(([, n]) => Number.isFinite(n) && n > 0)
}

type LegacyExtras = {
  extra_sal_prieta?: boolean
  extra_mani_quebrado?: boolean
  extra_cocolon?: boolean
  extra_toston?: boolean
}
const LEGACY_EXTRA_KEYS = ['extra_sal_prieta', 'extra_mani_quebrado', 'extra_cocolon', 'extra_toston'] as const

/**
 * Extras de un pedido como [clave, cantidad]. Lee la columna `extras` (cantidades) y,
 * si está vacía, cae a las columnas booleanas antiguas (cantidad 1).
 */
export function extrasOf(o: { extras?: Counts | null } & LegacyExtras): [string, number][] {
  const fromCounts = entriesOf(o.extras)
  if (fromCounts.length > 0) return fromCounts
  return LEGACY_EXTRA_KEYS.filter(k => o[k]).map(k => [k, 1] as [string, number])
}

/**
 * Bebidas de un pedido como [clave, cantidad]. Lee la columna `bebidas` (cantidades) y,
 * si está vacía, cae a la columna antigua `bebida` (una sola, cantidad 1).
 */
export function bebidasOf(o: { bebidas?: Counts | null; bebida?: string | null }): [string, number][] {
  const fromCounts = entriesOf(o.bebidas)
  if (fromCounts.length > 0) return fromCounts
  if (o.bebida && o.bebida !== 'ninguna') return [[o.bebida, 1]]
  return []
}

/** Texto corto de las bebidas de un pedido: "2 × Cola, Agua". Vacío si no hay. */
export function bebidasLabel(menu: MenuData, o: { bebidas?: Counts | null; bebida?: string | null }): string {
  return bebidasOf(o).map(([k, n]) => (n > 1 ? `${n} × ` : '') + labelOf(menu, 'bebida', k)).join(', ')
}

export interface OrderInput {
  protein: Protein
  base: Base
  extra_mani: boolean
  extra_guacamole: boolean
  extra_sal_prieta: boolean
  extra_mani_quebrado: boolean
  extra_cocolon: boolean
  extra_toston: boolean
  extras: ExtraCounts
  bebidas: BebidaCounts
  sauce_tomate: SauceAmount
  sauce_limon: SauceAmount
  sauce_mostaza: SauceAmount
  sauce_aji: SauceAmount
  comentarios: string
}

/** Total del pedido con los precios actuales del menú. */
export function calculateTotal(
  menu: MenuData,
  order: Pick<OrderInput, 'protein' | 'base' | 'extras' | 'bebidas'>,
): number {
  if (order.protein === 'no_por_hoy') return 0
  let total = priceOf(menu, 'protein', order.protein) + priceOf(menu, 'base', order.base)
  for (const [k, n] of entriesOf(order.extras)) total += priceOf(menu, 'extra', k) * n
  for (const [k, n] of entriesOf(order.bebidas)) total += priceOf(menu, 'bebida', k) * n
  return Math.round(total * 100) / 100
}
