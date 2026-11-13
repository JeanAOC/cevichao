import { createAdminClient } from '@/lib/supabase/admin'
import { CHOCHO_KEYS, DEFAULT_CHOCHO_MENU, type ChochoItem } from '@/lib/chocho'

/**
 * Menú de Cevichocho (todos los platos, también los ocultos, para poder mostrar pedidos viejos).
 * Si la tabla todavía no existe devuelve el menú de respaldo y `missing: true`.
 */
export async function loadChochoMenu(): Promise<{ menu: ChochoItem[]; missing: boolean }> {
  const { data, error } = await createAdminClient()
    .from('chocho_menu').select('id, key, label, price, active, sort')
    .order('sort', { ascending: true }).order('created_at', { ascending: true })
  if (error || !data) return { menu: DEFAULT_CHOCHO_MENU, missing: true }
  return {
    missing: false,
    menu: data.map(r => ({ id: r.id, key: r.key, label: r.label, price: Number(r.price), active: !!r.active, sort: r.sort })),
  }
}

/** Ajustes de Cevichocho (cierre, pagador, cuenta, QR) leídos con permisos de servidor. */
export async function loadChochoSettings(): Promise<Record<string, string>> {
  const { data } = await createAdminClient().from('settings').select('key, value').in('key', Object.values(CHOCHO_KEYS))
  return Object.fromEntries((data ?? []).map(r => [r.key, String(r.value ?? '')]))
}
