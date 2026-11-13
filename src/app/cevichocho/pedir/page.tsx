import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStaff } from '@/lib/auth'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS } from '@/lib/chocho'
import { loadChochoMenu, loadChochoSettings } from '@/lib/chocho-server'
import ChochoOrderForm from '../OrderForm'

export const revalidate = 0

export default async function ChochoPedirPage() {
  const staff = await getStaff()
  const today = todayDate()
  const [{ menu, missing }, settings] = await Promise.all([loadChochoMenu(), loadChochoSettings()])
  const locked = settings[CHOCHO_KEYS.locked] === 'true'

  const { data: mine } = staff
    ? await createAdminClient().from('chocho_orders').select('items, comentarios').eq('user_id', staff.userId).eq('order_date', today).maybeSingle()
    : { data: null }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">{mine ? 'Editar mi pedido' : 'Hacer pedido'}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Elige los platos y cuántos quieres de cada uno.</p>
      </div>

      {missing ? (
        <div className="rounded-2xl border p-5" style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--card))', borderColor: 'var(--accent)' }}>
          <p className="font-black">Falta activar Cevichocho</p>
          <p className="text-sm">Ejecuta <code className="font-bold">migrations/2026-11-15-cevichocho.sql</code> en Supabase y recarga.</p>
        </div>
      ) : locked ? (
        <div className="rounded-2xl border p-6 text-center shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <p className="text-4xl mb-2">🔒</p>
          <p className="font-bold">Los pedidos de hoy están cerrados</p>
          <Link href="/cevichocho/mi-pedido" className="inline-flex items-center min-h-11 mt-3 font-bold underline" style={{ color: 'var(--primary)' }}>Ver mi pedido</Link>
        </div>
      ) : (
        <ChochoOrderForm menu={menu.filter(i => i.active)} editing={!!mine}
          initial={mine ? {
            // Un plato que ya se ocultó del menú no se puede volver a pedir: se quita al editar
            items: Object.fromEntries(Object.entries(mine.items as Record<string, number>).filter(([k]) => menu.find(i => i.key === k)?.active)),
            comentarios: mine.comentarios,
          } : undefined} />
      )}
    </div>
  )
}
