import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import type { Order } from '@/types'
import LockButton from '@/app/admin/LockButton'
import MarkPaidButton from '@/app/admin/MarkPaidButton'
import MarkAllButton from './MarkAllButton'
import PayerSelect from './PayerSelect'
import AccountForm from './AccountForm'
import QrForm from './QrForm'
import { parseAccount } from '@/lib/payment'

export const revalidate = 0

const TABS = [
  { id: 'cobros', label: 'Cobros', icon: '💵' },
  { id: 'pagador', label: 'Pagador', icon: '🙋' },
  { id: 'cierre', label: 'Cierre', icon: '🔒' },
  { id: 'datos', label: 'Datos de cobro', icon: '🏦' },
] as const
type TabId = (typeof TABS)[number]['id']

function Card({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-black">{title}</h2>
          {hint && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

export default async function PagosPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')
  if (!staff.canCollect) redirect('/dashboard')

  const { tab: rawTab } = await searchParams
  const tab: TabId = TABS.some(t => t.id === rawTab) ? (rawTab as TabId) : 'cobros'

  const admin = createAdminClient()
  const today = todayDate()

  const [{ data: orders }, { data: settings }] = await Promise.all([
    admin.from('orders').select('*, profile:profiles(display_name)')
      .eq('order_date', today).order('created_at', { ascending: true }) as unknown as Promise<{ data: Order[] | null }>,
    admin.from('settings').select('key, value').in('key', ['orders_locked', 'payer', 'payment_info', 'payment_qr']),
  ])

  const s: Record<string, string> = Object.fromEntries((settings ?? []).map(r => [r.key, String(r.value ?? '')]))
  const isLocked = s.orders_locked === 'true'
  const [payerDate, payerId] = (s.payer ?? '').split('|')
  const payerUserId = payerDate === today && payerId ? payerId : null

  const real = (orders ?? []).filter(o => o.protein !== 'no_por_hoy')
  const isPaid = (o: Order) => o.paid || o.user_id === payerUserId
  const totalHoy = real.reduce((n, o) => n + Number(o.total), 0)
  const pagado = real.filter(isPaid).reduce((n, o) => n + Number(o.total), 0)
  const falta = totalHoy - pagado
  const pendientes = real.filter(o => !isPaid(o))
  const rows = [...real].sort((a, b) => Number(isPaid(a)) - Number(isPaid(b))) // pendientes primero
  const payerName = real.find(o => o.user_id === payerUserId)?.profile?.display_name

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  // Mini indicador al lado de cada pestaña
  const badge: Partial<Record<TabId, string>> = {
    cobros: pendientes.length > 0 ? String(pendientes.length) : '',
    pagador: payerName ? '✓' : '',
    cierre: isLocked ? '🔒' : '',
    datos: s.payment_info || s.payment_qr ? '✓' : '',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">Pagos</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
        </div>
        {staff.isAdmin && (
          <Link href="/admin" className="text-xs font-bold px-3 py-2 rounded-lg border shrink-0"
            style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            Editar pedidos →
          </Link>
        )}
      </div>

      {/* Pestañas */}
      <nav aria-label="Secciones de pagos" className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TABS.map(t => {
          const active = t.id === tab
          return (
            <Link key={t.id} href={t.id === 'cobros' ? '/pagos' : `/pagos?tab=${t.id}`} scroll={false}
              aria-current={active ? 'page' : undefined}
              className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-colors"
              style={active
                ? { background: 'var(--primary)', color: 'var(--primary-fg)', borderColor: 'var(--primary)' }
                : { background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}>
              <span aria-hidden>{t.icon}</span>
              {t.label}
              {badge[t.id] && (
                <span className="text-[11px] px-1.5 rounded-full font-black"
                  style={active
                    ? { background: 'rgb(255 255 255 / 0.25)', color: 'var(--primary-fg)' }
                    : { background: 'color-mix(in srgb, var(--accent) 18%, var(--card))', color: 'var(--accent)' }}>
                  {badge[t.id]}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Cobros */}
      {tab === 'cobros' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total', value: totalHoy, color: 'var(--text)' },
              { label: 'Pagado', value: pagado, color: 'var(--success)' },
              { label: 'Falta', value: falta, color: falta > 0 ? 'var(--accent)' : 'var(--muted)' },
            ].map(x => (
              <div key={x.label} className="rounded-2xl border p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-xl font-black" style={{ color: x.color }}>${x.value.toFixed(2)}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{x.label}</p>
              </div>
            ))}
          </div>

          <Card title={`Pedidos de hoy (${real.length})`}
            hint={pendientes.length > 0 ? `${pendientes.length} sin pagar` : real.length > 0 ? 'Todos pagaron 🎉' : undefined}
            action={pendientes.length > 0 ? <MarkAllButton pending={pendientes.length} /> : undefined}>
            {real.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Nadie ha pedido todavía</p>
            ) : (
              <ul>
                {rows.map(o => {
                  const isPayer = o.user_id === payerUserId
                  const name = o.profile?.display_name ?? 'Usuario'
                  return (
                    <li key={o.id} className="flex items-center gap-3 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center font-black text-white shrink-0"
                        style={{ background: isPaid(o) ? 'var(--success)' : 'var(--accent)' }}>
                        {name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate leading-tight">{name}</p>
                        <p className="text-sm font-black" style={{ color: 'var(--success)' }}>${Number(o.total).toFixed(2)}</p>
                      </div>
                      {isPayer
                        ? <span className="chip chip-info">Pagó en el local</span>
                        : <MarkPaidButton orderId={o.id} paid={o.paid} />}
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* Pagador */}
      {tab === 'pagador' && (
        <Card title="¿Quién pagó en el local?"
          hint="Su pedido queda como pagado y no se le cobra a sí mismo. Los demás le pagan a esta persona.">
          <PayerSelect current={payerUserId}
            people={real.map(o => ({ userId: o.user_id, name: o.profile?.display_name ?? 'Usuario' }))} />
          {payerName && (
            <p className="text-sm mt-3" style={{ color: 'var(--muted)' }}>
              Hoy le pagan a <span className="font-bold" style={{ color: 'var(--text)' }}>{payerName}</span>.
              Falta que le paguen <span className="font-bold" style={{ color: 'var(--accent)' }}>${falta.toFixed(2)}</span>.
            </p>
          )}
        </Card>
      )}

      {/* Cierre */}
      {tab === 'cierre' && (
        <Card title="Cerrar pedidos"
          hint={isLocked ? 'Cerrados: nadie puede pedir, editar ni cancelar.' : 'Ciérralos cuando el pedido ya llegó al local.'}
          action={<LockButton locked={isLocked} />}>
          <p className="text-sm font-semibold" style={{ color: isLocked ? 'var(--danger)' : 'var(--success)' }}>
            {isLocked ? '🔒 Los pedidos están cerrados' : '🔓 Los pedidos están abiertos'}
          </p>
        </Card>
      )}

      {/* Datos de cobro */}
      {tab === 'datos' && (
        <>
          <Card title="Cuenta bancaria" hint="Lo ven todos en «Mi pedido» mientras no hayan pagado.">
            <AccountForm initial={parseAccount(s.payment_info)?.legacy ? null : parseAccount(s.payment_info)} />
          </Card>
          <Card title="Código QR" hint="Opcional. Se muestra junto a la cuenta.">
            <QrForm initialQr={s.payment_qr ?? ''} />
          </Card>
        </>
      )}
    </div>
  )
}
