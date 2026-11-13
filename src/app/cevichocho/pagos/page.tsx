import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS, chochoLabel, itemsOfOrder, type ChochoOrder } from '@/lib/chocho'
import { loadChochoMenu, loadChochoSettings } from '@/lib/chocho-server'
import { parseAccount } from '@/lib/payment'
import { money } from '@/lib/menu'
import TabNav from '@/components/TabNav'
import ActionButton from '@/components/ActionButton'
import AccountForm from '@/app/(app)/pagos/AccountForm'
import QrForm from '@/app/(app)/pagos/QrForm'
import ChochoPayerSelect from './PayerSelect'
import ChochoMenuEditor from './MenuEditor'

export const revalidate = 0

const ENDPOINT = '/api/chocho/admin'

function Card({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-extrabold text-xl">{title}</h2>
          {hint && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default async function ChochoPagosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')
  if (!staff.canCollect) redirect('/cevichocho')

  const today = todayDate()
  const [{ menu, missing }, s, { data }] = await Promise.all([
    loadChochoMenu(),
    loadChochoSettings(),
    createAdminClient().from('chocho_orders').select('*, profile:profiles(display_name)')
      .eq('order_date', today).order('created_at', { ascending: true }),
  ])
  const orders = (data ?? []) as unknown as ChochoOrder[]

  const isLocked = s[CHOCHO_KEYS.locked] === 'true'
  const [payerDate, payerId] = (s[CHOCHO_KEYS.payer] ?? '').split('|')
  const payerUserId = payerDate === today && payerId ? payerId : null
  const payerName = orders.find(o => o.user_id === payerUserId)?.profile?.display_name

  const isPaid = (o: ChochoOrder) => o.paid || o.user_id === payerUserId
  const totalHoy = orders.reduce((n, o) => n + Number(o.total), 0)
  const pagado = orders.filter(isPaid).reduce((n, o) => n + Number(o.total), 0)
  const falta = totalHoy - pagado
  const pendientes = orders.filter(o => !isPaid(o))
  const rows = [...orders].sort((a, b) => Number(isPaid(a)) - Number(isPaid(b)))

  const tabs = [
    { id: 'cobros', label: 'Cobros', icon: '💵', badge: pendientes.length > 0 ? String(pendientes.length) : undefined },
    { id: 'pagador', label: 'Pagador', icon: '🙋', badge: payerName ? '✓' : undefined },
    { id: 'cierre', label: 'Cierre', icon: '🔒', badge: isLocked ? '🔒' : undefined },
    { id: 'datos', label: 'Datos de cobro', icon: '🏦', badge: s[CHOCHO_KEYS.info] || s[CHOCHO_KEYS.qr] ? '✓' : undefined },
    ...(staff.isAdmin ? [{ id: 'menu', label: 'Menú', icon: '📖' }] : []),
  ]
  const { tab: rawTab } = await searchParams
  const tab = tabs.some(t => t.id === rawTab) ? (rawTab as string) : 'cobros'

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold">Pagos · Cevichocho</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      {missing && (
        <div className="rounded-2xl border p-5" style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--card))', borderColor: 'var(--accent)' }}>
          <p className="font-black">Falta activar Cevichocho</p>
          <p className="text-sm">Ejecuta <code className="font-bold">migrations/2026-11-15-cevichocho.sql</code> en Supabase y recarga.</p>
        </div>
      )}

      <TabNav ariaLabel="Secciones de pagos de Cevichocho" basePath="/cevichocho/pagos" defaultTab="cobros" active={tab} tabs={tabs} />

      {tab === 'cobros' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: totalHoy, color: 'var(--text)' },
              { label: 'Pagado', value: pagado, color: 'var(--success)' },
              { label: 'Falta', value: falta, color: falta > 0 ? 'var(--accent)' : 'var(--muted)' },
            ].map(x => (
              <div key={x.label} className="rounded-2xl border p-4 text-center shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-2xl font-extrabold font-display" style={{ color: x.color }}>{money(x.value)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{x.label}</p>
              </div>
            ))}
          </div>

          <Card title={`Pedidos de hoy (${orders.length})`}
            hint={pendientes.length > 0 ? `${pendientes.length} sin pagar` : orders.length > 0 ? 'Todos pagaron 🎉' : undefined}
            action={pendientes.length > 0
              ? <ActionButton endpoint={ENDPOINT} body={{ action: 'markAllPaid' }} variant="success" confirmText="Sí, marcar todos">Marcar todos pagados</ActionButton>
              : undefined}>
            {orders.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Nadie ha pedido todavía</p>
            ) : (
              <ul>
                {rows.map(o => {
                  const name = o.profile?.display_name ?? 'Usuario'
                  const isPayer = o.user_id === payerUserId
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0"
                        style={isPaid(o)
                          ? { background: 'var(--success)', color: 'var(--success-fg)' }
                          : { background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate leading-tight">{name}</p>
                        <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                          {itemsOfOrder(menu, o.items).map(([k, n]) => `${n > 1 ? `${n}× ` : ''}${chochoLabel(menu, k)}`).join(', ')}
                        </p>
                        <p className="text-sm font-extrabold font-display" style={{ color: 'var(--accent)' }}>{money(Number(o.total))}</p>
                      </div>
                      {isPayer
                        ? <span className="chip chip-info">Pagó en el local</span>
                        : <ActionButton endpoint={ENDPOINT} body={{ action: 'setPaid', orderId: o.id, paid: !o.paid }} variant={o.paid ? 'success' : 'ghost'}>
                            {o.paid ? '✓ Pagado' : 'Marcar pagado'}
                          </ActionButton>}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {tab === 'pagador' && (
        <Card title="¿Quién pagó en el local?"
          hint="Su pedido queda como pagado y no se le cobra a sí mismo. Los demás le pagan a esta persona.">
          <ChochoPayerSelect current={payerUserId}
            people={orders.map(o => ({ userId: o.user_id, name: o.profile?.display_name ?? 'Usuario' }))} />
          {payerName && (
            <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>
              Hoy le pagan a <span className="font-bold" style={{ color: 'var(--text)' }}>{payerName}</span>.
              Falta que le paguen <span className="font-bold" style={{ color: 'var(--accent)' }}>{money(falta)}</span>.
            </p>
          )}
        </Card>
      )}

      {tab === 'cierre' && (
        <Card title="Cerrar pedidos"
          hint={isLocked ? 'Cerrados: nadie puede pedir, editar ni cancelar.' : 'Ciérralos cuando el pedido ya llegó al local.'}
          action={<ActionButton endpoint={ENDPOINT} body={{ action: 'setLock', locked: !isLocked }} variant={isLocked ? 'success' : 'ghost'}>
            {isLocked ? '🔓 Abrir pedidos' : '🔒 Cerrar pedidos'}
          </ActionButton>}>
          <p className="text-sm font-semibold" style={{ color: isLocked ? 'var(--danger)' : 'var(--success)' }}>
            {isLocked ? '🔒 Los pedidos están cerrados' : '🔓 Los pedidos están abiertos'}
          </p>
        </Card>
      )}

      {tab === 'datos' && (
        <>
          <Card title="Cuenta bancaria" hint="La ven todos en «Mi pedido» mientras no hayan pagado.">
            <AccountForm initial={parseAccount(s[CHOCHO_KEYS.info])?.legacy ? null : parseAccount(s[CHOCHO_KEYS.info])}
              endpoint={ENDPOINT} extra={{ action: 'savePayment' }} />
          </Card>
          <Card title="Código QR" hint="Opcional. Se muestra junto a la cuenta.">
            <QrForm initialQr={s[CHOCHO_KEYS.qr] ?? ''} endpoint={ENDPOINT} extra={{ action: 'savePayment' }} />
          </Card>
        </>
      )}

      {tab === 'menu' && staff.isAdmin && (
        <Card title="Menú de Cevichocho" hint="Cambia nombres y precios. Los pedidos ya hechos conservan su total. Quitar «En el menú» oculta el plato sin borrarlo.">
          <ChochoMenuEditor items={menu} />
        </Card>
      )}
    </div>
  )
}
