export type Protein = 'pescado' | 'mixto' | 'camaron' | 'no_por_hoy'
export type Base = 'chifles' | 'doritos_verdes' | 'jalapeños' | 'patacones' | 'no_gracias'
export type SauceAmount = 'no' | 'poco' | 'medio' | 'mucho'
export type Bebida = 'ninguna' | 'agua' | 'agua_mineral' | 'te_helado' | 'cola' | 'imperial'

export const PROTEIN_PRICES: Record<Protein, number> = {
  pescado: 2.25,
  mixto: 2.50,
  camaron: 2.50,
  no_por_hoy: 0,
}

export const PROTEIN_LABELS: Record<Protein, string> = {
  pescado: 'Pescado',
  mixto: 'Mixto',
  camaron: 'Camarón',
  no_por_hoy: 'No por hoy',
}

export const BASE_LABELS: Record<Base, string> = {
  chifles: 'Chifles',
  doritos_verdes: 'Doritos Verdes',
  jalapeños: 'Jalapeños',
  patacones: 'Patacones',
  no_gracias: 'No gracias',
}

export const BASE_PRICES: Record<Base, number> = {
  chifles: 0,
  doritos_verdes: 0,
  jalapeños: 0,
  patacones: 1.00,
  no_gracias: 0,
}

export const EXTRA_PRICES: Record<string, number> = {
  extra_sal_prieta: 1.00,
  extra_mani_quebrado: 1.00,
  extra_cocolon: 1.00,
  extra_toston: 1.50,
}

export const EXTRA_LABELS: Record<string, string> = {
  extra_sal_prieta: 'Salprieta',
  extra_mani_quebrado: 'Maní Quebrado',
  extra_cocolon: 'Cocolón',
  extra_toston: 'Tostón',
}

// Extras con cantidad: { extra_cocolon: 2, extra_toston: 1 }
export type ExtraKey = 'extra_sal_prieta' | 'extra_mani_quebrado' | 'extra_cocolon' | 'extra_toston'
export type ExtraCounts = Partial<Record<ExtraKey, number>>
export const EXTRA_KEYS: ExtraKey[] = ['extra_sal_prieta', 'extra_mani_quebrado', 'extra_cocolon', 'extra_toston']
export const MAX_EXTRA_QTY = 10

/**
 * Extras de un pedido como [extra, cantidad]. Lee la columna `extras` (cantidades) y,
 * si está vacía, cae a las columnas booleanas antiguas (cantidad 1).
 */
export function extrasOf(
  o: { extras?: ExtraCounts | null } & Partial<Record<ExtraKey, boolean>>,
): [ExtraKey, number][] {
  const fromCounts = EXTRA_KEYS
    .map(k => [k, Number(o.extras?.[k] ?? 0)] as [ExtraKey, number])
    .filter(([, n]) => n > 0)
  if (fromCounts.length > 0) return fromCounts
  return EXTRA_KEYS.filter(k => o[k]).map(k => [k, 1] as [ExtraKey, number])
}

export const BEBIDA_PRICES: Record<Bebida, number> = {
  ninguna: 0,
  agua: 0.50,
  agua_mineral: 0.75,
  te_helado: 1.00,
  cola: 0.50,
  imperial: 0.75,
}

export const BEBIDA_LABELS: Record<Bebida, string> = {
  ninguna: 'Ninguna',
  agua: 'Agua',
  agua_mineral: 'Agua Mineral',
  te_helado: 'Té Helado',
  cola: 'Cola',
  imperial: 'Imperial',
}

export const BEBIDAS: Bebida[] = ['ninguna', 'agua', 'agua_mineral', 'te_helado', 'cola', 'imperial']

// Bebidas con cantidad: { cola: 2, agua: 1 }
export type BebidaItem = Exclude<Bebida, 'ninguna'>
export type BebidaCounts = Partial<Record<BebidaItem, number>>
/** Texto corto de las bebidas de un pedido: "2 × Cola, Agua". Vacío si no hay. */
export function bebidasLabel(o: { bebidas?: BebidaCounts | null; bebida?: Bebida | null }): string {
  return bebidasOf(o).map(([k, n]) => (n > 1 ? `${n} × ` : '') + BEBIDA_LABELS[k]).join(', ')
}

export const BEBIDA_ITEMS: BebidaItem[] = ['agua', 'agua_mineral', 'te_helado', 'cola', 'imperial']
export const MAX_BEBIDA_QTY = 10

/**
 * Bebidas de un pedido como [bebida, cantidad]. Lee la columna `bebidas` (cantidades) y,
 * si está vacía, cae a la columna antigua `bebida` (una sola, cantidad 1).
 */
export function bebidasOf(o: { bebidas?: BebidaCounts | null; bebida?: Bebida | null }): [BebidaItem, number][] {
  const fromCounts = BEBIDA_ITEMS
    .map(k => [k, Number(o.bebidas?.[k] ?? 0)] as [BebidaItem, number])
    .filter(([, n]) => n > 0)
  if (fromCounts.length > 0) return fromCounts
  if (o.bebida && o.bebida !== 'ninguna') return [[o.bebida, 1]]
  return []
}

export const SAUCE_AMOUNTS: SauceAmount[] = ['no', 'poco', 'medio', 'mucho']
export const SAUCE_AMOUNT_LABELS: Record<SauceAmount, string> = {
  no: 'No',
  poco: 'Poco',
  medio: 'Medio',
  mucho: 'Mucho',
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

export function calculateTotal(
  order: Pick<OrderInput, 'protein' | 'base' | 'extras' | 'bebidas'>
): number {
  if (order.protein === 'no_por_hoy') return 0
  let total = PROTEIN_PRICES[order.protein] + BASE_PRICES[order.base]
  for (const k of EXTRA_KEYS) total += EXTRA_PRICES[k] * (order.extras[k] ?? 0)
  for (const k of BEBIDA_ITEMS) total += BEBIDA_PRICES[k] * (order.bebidas[k] ?? 0)
  return total
}
