import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'
import { CHOCHO_KEYS, chochoLabel, chochoPrice, itemsOfOrder, type ChochoOrder } from '@/lib/chocho'
import { loadChochoMenu, loadChochoSettings } from '@/lib/chocho-server'
import { money } from '@/lib/menu'
import ActionButton from '@/components/ActionButton'
import PaymentAccountView from '@/components/PaymentAccountView'

export const revalidate = 0

export default async function ChochoMiPedidoPage() {
  const staff = await getStaff()
  const today = todayDate()
  const admin = createAdminClient()

  const [{ menu }, settings, { data }] = await Promise.all([
    loadChochoMenu(),
    loadChochoSettings(),
    staff
      ? admin.from('chocho_orders').select('*').eq('user_id', staff.userId).eq('order_date', today).maybeSingle()
      : Promise.resolve({ data: null }),
  ])
  const mine = data as ChochoOrder | null
  const locked = settings[CHOCHO_KEYS.locked] === 'true'

  // A quién pagarle y la cuenta: solo si tiene un pedido sin pagar
  const [payerDate, payerId] = (settings[CHOCHO_KEYS.payer] ?? '').split('|')
  const payerUserId = payerDate === today && payerId ? payerId : null
  const mustPay = !!mine && !mine.paid
  const { data: payerProfile } = mustPay && payerUserId
    ? await admin.from('profiles').select('display_name').eq('id', payerUserId).maybeSingle()
    : { data: null }
  const info = settings[CHOCHO_KEYS.info]
  const qr = settings[CHOCHO_KEYS.qr]

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Mi pedido</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      <div className="rounded-2xl p-5 border shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-bold text-xs tracking-wide mb-3" style={{ color: 'var(--muted)' }}>MI PEDIDO HOY</h2>
        {mine ? (
          <div className="space-y-3">
            <ul>
              {itemsOfOrder(menu, mine.items).map(([key, qty]) => (
                <li key={key} className="menu-row">
                  <span className="font-semibold">{qty > 1 ? `${qty} × ` : ''}{chochoLabel(menu, key)}</span>
                  <span className="leader" aria-hidden />
                  <span className="menu-price">{money(chochoPrice(menu, key) * qty)}</span>
                </li>
              ))}
            </ul>
            {mine.comentarios && <p className="text-sm italic" style={{ color: 'var(--muted)' }}>&quot;{mine.comentarios}&quot;</p>}
            <div className="flex items-center justify-between border-t border-dashed pt-3" style={{ borderColor: 'var(--border)' }}>
              <span className={`chip ${mine.paid ? 'chip-ok' : 'chip-warn'}`}>{mine.paid ? '✓ Pagado' : 'Pendiente'}</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>Total</span>
              <span className="font-display text-3xl font-extrabold" style={{ color: 'var(--accent)' }}>{money(Number(mine.total))}</span>
            </div>
            {!locked && !mine.paid && (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/cevichocho/pedir" className="min-h-11 inline-flex items-center justify-center rounded-xl font-bold border"
                  style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Editar pedido</Link>
                <ActionButton endpoint="/api/chocho/order" body={{ action: 'cancel' }} variant="danger" confirmText="Sí, cancelar" className="w-full">
                  Cancelar pedido
                </ActionButton>
              </div>
            )}
            {locked && <p className="text-sm" style={{ color: 'var(--muted)' }}>🔒 Los pedidos están cerrados.</p>}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">🥣</p>
            <p className="font-medium mb-4" style={{ color: 'var(--muted)' }}>Aún no has pedido hoy</p>
            {!locked && (
              <Link href="/cevichocho/pedir" className="press inline-flex items-center min-h-12 px-6 rounded-xl font-bold"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>Hacer pedido 🥣</Link>
            )}
          </div>
        )}
      </div>

      {mustPay && (info || qr || payerProfile) && (
        <div className="rounded-2xl p-5 border shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-xs tracking-wide mb-3" style={{ color: 'var(--muted)' }}>CÓMO PAGAR</h2>
          {payerProfile && (
            <p className="mb-3">
              Págale <span className="font-black">{money(Number(mine!.total))}</span> a{' '}
              <span className="font-black" style={{ color: 'var(--primary)' }}>{payerProfile.display_name}</span>
            </p>
          )}
          <PaymentAccountView raw={info} />
          {qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="QR de pago" className="mt-3 mx-auto w-56 max-w-full rounded-xl border bg-white" style={{ borderColor: 'var(--border)' }} />
          )}
        </div>
      )}
    </div>
  )
}
