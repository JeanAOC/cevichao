import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS, chochoLabel, itemsOfOrder, type ChochoOrder } from '@/lib/chocho'
import { loadChochoMenu, loadChochoSettings } from '@/lib/chocho-server'
import { money } from '@/lib/menu'

export const revalidate = 0

export default async function ChochoTablaPage() {
  const today = todayDate()
  const [{ menu }, settings, { data }] = await Promise.all([
    loadChochoMenu(),
    loadChochoSettings(),
    createAdminClient().from('chocho_orders').select('*, profile:profiles(display_name)')
      .eq('order_date', today).order('created_at', { ascending: true }),
  ])
  const orders = (data ?? []) as unknown as ChochoOrder[]

  const [payerDate, payerId] = (settings[CHOCHO_KEYS.payer] ?? '').split('|')
  const payerUserId = payerDate === today && payerId ? payerId : null

  // Cuántos de cada plato hay que pedir en el local
  const counts = new Map<string, number>()
  for (const o of orders) for (const [k, n] of itemsOfOrder(menu, o.items)) counts.set(k, (counts.get(k) ?? 0) + n)
  const summary = [...counts.entries()].sort((a, b) => menu.findIndex(i => i.key === a[0]) - menu.findIndex(i => i.key === b[0]))
  const totalDishes = [...counts.values()].reduce((n, q) => n + q, 0)
  const totalMoney = orders.reduce((n, o) => n + Number(o.total), 0)

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Tabla del día</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          <p className="text-5xl mb-3">🥣</p>
          <p>Nadie ha pedido todavía.</p>
        </div>
      ) : (
        <>
          <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-extrabold text-xl mb-2">Para pedir en el local</h2>
            <ul>
              {summary.map(([key, n]) => (
                <li key={key} className="menu-row">
                  <span className="font-semibold">{chochoLabel(menu, key)}</span>
                  <span className="leader" aria-hidden />
                  <span className="font-display font-extrabold text-xl" style={{ color: 'var(--primary)' }}>{n}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t-2 border-dashed flex items-end justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
              <p className="font-bold">{totalDishes} plato{totalDishes !== 1 ? 's' : ''} · {orders.length} persona{orders.length !== 1 ? 's' : ''}</p>
              <p className="font-display text-3xl font-extrabold" style={{ color: 'var(--accent)' }}>{money(totalMoney)}</p>
            </div>
          </section>

          <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-extrabold text-xl mb-2">Quién pidió qué</h2>
            <ul>
              {orders.map(o => {
                const paid = o.paid || o.user_id === payerUserId
                return (
                  <li key={o.id} className="py-3 border-t first:border-t-0 flex items-start justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="min-w-0">
                      <p className="font-bold leading-tight">{o.profile?.display_name ?? 'Usuario'}</p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>
                        {itemsOfOrder(menu, o.items).map(([k, n]) => `${n > 1 ? `${n} × ` : ''}${chochoLabel(menu, k)}`).join(' · ')}
                      </p>
                      {o.comentarios && <p className="text-sm italic" style={{ color: 'var(--muted)' }}>&quot;{o.comentarios}&quot;</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-extrabold font-display" style={{ color: 'var(--accent)' }}>{money(Number(o.total))}</p>
                      <span className={`chip chip-sm ${paid ? 'chip-ok' : 'chip-warn'}`}>{paid ? '✓ Pagado' : 'Pendiente'}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
