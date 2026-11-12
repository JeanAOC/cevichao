import { createClient } from '@/lib/supabase/server'
import { defaultMenu, type MenuData, type MenuItem } from '@/lib/menu'

/**
 * Carga el menú desde la tabla menu_items. Si la tabla no existe todavía (falta correr el SQL)
 * o está vacía, devuelve el menú por defecto para que la app siga funcionando.
 */
export async function loadMenu(): Promise<MenuData> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('menu_items').select('*').order('sort', { ascending: true })
  if (error || !data || data.length === 0) return defaultMenu()

  const items: MenuItem[] = data.map(r => ({
    id: String(r.id),
    kind: r.kind,
    key: String(r.key),
    label: String(r.label),
    price: Number(r.price),
    active: r.active !== false,
    sort: Number(r.sort ?? 0),
  }))
  return { items, fromDb: true }
}
