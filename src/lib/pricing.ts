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
  bebida: Bebida
  sauce_tomate: SauceAmount
  sauce_limon: SauceAmount
  sauce_mostaza: SauceAmount
  sauce_aji: SauceAmount
  comentarios: string
}

export function calculateTotal(
  order: Pick<OrderInput, 'protein' | 'extra_sal_prieta' | 'extra_mani_quebrado' | 'extra_cocolon' | 'extra_toston' | 'bebida'>
): number {
  if (order.protein === 'no_por_hoy') return 0
  let total = PROTEIN_PRICES[order.protein]
  if (order.extra_sal_prieta) total += EXTRA_PRICES.extra_sal_prieta
  if (order.extra_mani_quebrado) total += EXTRA_PRICES.extra_mani_quebrado
  if (order.extra_cocolon) total += EXTRA_PRICES.extra_cocolon
  if (order.extra_toston) total += EXTRA_PRICES.extra_toston
  total += BEBIDA_PRICES[order.bebida]
  return total
}
