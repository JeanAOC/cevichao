import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS, BEBIDA_PRICES, EXTRA_LABELS, EXTRA_PRICES, extrasOf, bebidasOf } from '@/lib/pricing'
import CancelOrderButton from '@/components/CancelOrderButton'
import PaymentAccountView from '@/components/PaymentAccountView'
import { todayDate } from '@/lib/date'

export const revalidate = 0

function SauceTag({ label, amount }: { label: string; amount: string }) {
  if (amount === 'no') return null
  return (
    <span className={`chip chip-${amount}`}>
      {label} · {amount}
    </span>
  )
}

export default async function MiPedidoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const [{ data: myOrder }, { data: settings }] = await Promise.all([
    supabase.from('orders').select('*').eq('user_id', user!.id).eq('order_date', today).maybeSingle() as unknown as Promise<{ data: Order | null }>,
    supabase.from('settings').select('key, value').in('key', ['orders_locked', 'payer', 'payment_info', 'payment_qr']),
  ])

  const s: Record<string, string> = Object.fromEntries((settings ?? []).map(r => [r.key, String(r.value ?? '')]))
  const isLocked = s.orders_locked === 'true'

  // Datos para pagar: a quién, cuenta y QR (solo si tiene un pedido sin pagar)
  const [payerDate, payerId] = (s.payer ?? '').split('|')
  const payerUserId = payerDate === today && payerId ? payerId : null
  const mustPay = !!myOrder && myOrder.protein !== 'no_por_hoy' && !myOrder.paid
  const { data: payerProfile } = mustPay && payerUserId
    ? await supabase.from('profiles').select('display_name').eq('id', payerUserId).maybeSingle()
    : { data: null }
  const hasPayInfo = !!(s.payment_info || s.payment_qr)

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Mi pedido</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      <div className="rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--muted)' }}>MI PEDIDO HOY</h2>
        {myOrder ? (
          <div className="space-y-3">
            {myOrder.protein === 'no_por_hoy' ? (
              <>
                <p className="text-lg font-bold" style={{ color: 'var(--muted)' }}>No pides hoy</p>
                {!isLocked && <CancelOrderButton />}
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">{PROTEIN_LABELS[myOrder.protein]}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{BASE_LABELS[myOrder.base]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: 'var(--success)' }}>${Number(myOrder.total).toFixed(2)}</p>
                    <span className={`chip ${myOrder.paid ? 'chip-ok' : 'chip-warn'}`}>
                      {myOrder.paid ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                {(myOrder.extra_mani || myOrder.extra_guacamole) && (
                  <div className="flex flex-wrap gap-1.5">
                    {myOrder.extra_mani && <span className="chip chip-ok">Maní ✓</span>}
                    {myOrder.extra_guacamole && <span className="chip chip-ok">Guacamole ✓</span>}
                  </div>
                )}
                {extrasOf(myOrder).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {extrasOf(myOrder).map(([k, n]) => (
                      <span key={k} className="chip chip-info">
                        +{n > 1 ? `${n} × ` : ''}{EXTRA_LABELS[k]} ${(EXTRA_PRICES[k] * n).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
                {bebidasOf(myOrder).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {bebidasOf(myOrder).map(([k, n]) => (
                      <span key={k} className="chip chip-info">
                        🥤 {n > 1 ? `${n} × ` : ''}{BEBIDA_LABELS[k]} ${(BEBIDA_PRICES[k] * n).toFixed(2)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <SauceTag label="Tomate" amount={myOrder.sauce_tomate} />
                  <SauceTag label="Limón" amount={myOrder.sauce_limon} />
                  <SauceTag label="Mostaza" amount={myOrder.sauce_mostaza} />
                  <SauceTag label="Ají" amount={myOrder.sauce_aji} />
                </div>
                {myOrder.comentarios && (
                  <p className="text-sm italic" style={{ color: 'var(--muted)' }}>&quot;{myOrder.comentarios}&quot;</p>
                )}
                {!isLocked && <CancelOrderButton />}
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-4xl mb-3">🍽️</p>
            <p className="font-medium mb-4" style={{ color: 'var(--muted)' }}>Aún no has pedido hoy</p>
            <Link href="/pedir"
              className="inline-block px-6 py-3 rounded-xl font-bold text-sm transition-colors"
              style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
              Hacer pedido 🐟
            </Link>
          </div>
        )}
      </div>

      {/* Cómo pagar */}
      {mustPay && (hasPayInfo || payerProfile) && (
        <div className="rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--muted)' }}>CÓMO PAGAR</h2>
          {payerProfile && (
            <p className="mb-3">
              Págale <span className="font-black">${Number(myOrder!.total).toFixed(2)}</span> a{' '}
              <span className="font-black" style={{ color: 'var(--primary)' }}>{payerProfile.display_name}</span>
            </p>
          )}
          <PaymentAccountView raw={s.payment_info} />
          {s.payment_qr && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.payment_qr} alt="QR de pago"
              className="mt-3 mx-auto w-56 max-w-full rounded-xl border bg-white" style={{ borderColor: 'var(--border)' }} />
          )}
        </div>
      )}
    </div>
  )
}
