import type { Protein, Base, SauceAmount, Bebida } from '@/lib/pricing'

export interface Profile {
  id: string
  display_name: string
  is_admin: boolean
  created_at: string
}

export interface Order {
  id: string
  user_id: string
  order_date: string
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
  comentarios: string | null
  total: number
  paid: boolean
  paid_at: string | null
  created_at: string
  updated_at: string
  profile?: Profile
}
