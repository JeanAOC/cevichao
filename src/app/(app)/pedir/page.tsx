import { createClient } from '@/lib/supabase/server'
import OrderForm from '@/components/OrderForm'
import type { Order } from '@/types'

export const revalidate = 0

import { todayDate } from '@/lib/date'
import { loadMenu } from '@/lib/menu-server'

export default async function PedirPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const [{ data: existing }, { data: lockSetting }] = await Promise.all([
    supabase.from('orders').select('*').eq('user_id', user!.id).eq('order_date', today).maybeSingle() as unknown as Promise<{ data: Order | null }>,
    supabase.from('settings').select('value').eq('key', 'orders_locked').maybeSingle(),
  ])

  const isLocked = lockSetting?.value === 'true'
  const menu = await loadMenu()

  if (isLocked) {
    return (
      <div className="text-center py-20">
        <div className="text-6xl mb-4">🔒</div>
        <h1 className="text-3xl font-extrabold mb-2">Pedidos cerrados</h1>
        <p style={{ color: 'var(--muted)' }}>Ya llegaron al local. No se aceptan más cambios.</p>
      </div>
    )
  }

  if (existing) {
    return (
      <div>
        <h1 className="text-3xl font-extrabold mb-1">Editar pedido</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Cambia lo que necesites antes de que se bloquee.</p>
        <OrderForm existing={existing} menu={menu} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold mb-1">Hacer pedido</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>Elige tu ceviche de hoy.</p>
      <OrderForm existing={null} menu={menu} />
    </div>
  )
}
