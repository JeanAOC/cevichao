import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Link from 'next/link'
import type { Order } from '@/types'
import { extrasOf, bebidasOf } from '@/lib/pricing'
import { labelOf } from '@/lib/menu'
import { loadMenu } from '@/lib/menu-server'
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
  const menu = await loadMenu()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const [{ data: myOrder }, { data: settings }] = await Promise.all([
    supabase.from('orders').select('*').eq('user_id', user!.id).eq('order_date', today).maybeSingle() as unknown as Promise<{ data: Order | null }>,
    supabase.from('settings').select('key, value').in('key', ['orders_locked']),
  ])

  const isLocked = (settings ?? []).some(r => r.key === 'orders_locked' && String(r.value) === 'true')

  // Datos para pagar: a quién, cuenta y QR (solo si tiene un pedido sin pagar).
  // Se leen con permisos de servidor: la política de `settings` para usuarios normales puede esconderlos,
  // y quien debe pagar tiene que poder verlos. Solo se lee lo necesario para pagar, y solo si debe.
  const mustPay = !!myOrder && myOrder.protein !== 'no_por_hoy' && !myOrder.paid
  let s: Record<string, string> = {}
  let payerProfile: { display_name: string } | null = null
  if (mustPay) {
    const admin = createAdminClient()
    const { data: payRows } = await admin.from('settings').select('key, value').in('key', ['payer', 'payment_info', 'payment_qr'])
    s = Object.fromEntries((payRows ?? []).map(r => [r.key, String(r.value ?? '')]))
    const [payerDate, payerId] = (s.payer ?? '').split('|')
    if (payerDate === today && payerId) {
      const { data } = await admin.from('profiles').select('display_name').eq('id', payerId).maybeSingle()
      payerProfile = data
    }
  }
  const hasPayInfo = !!(s.payment_info || s.payment_qr)

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Mi pedido</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      <div className="rounded-2xl p-5 border shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-bold text-xs tracking-wide mb-3" style={{ color: 'var(--muted)' }}>MI PEDIDO HOY</h2>
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
                    <p className="text-2xl font-extrabold font-display">{labelOf(menu, 'protein', myOrder.protein)}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{labelOf(menu, 'base', myOrder.base)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-extrabold font-display" style={{ color: 'var(--accent)' }}>${Number(myOrder.total).toFixed(2)}</p>
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
                        +{n > 1 ? `${n} × ` : ''}{labelOf(menu, 'extra', k)}
                      </span>
                    ))}
                  </div>
                )}
                {bebidasOf(myOrder).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {bebidasOf(myOrder).map(([k, n]) => (
                      <span key={k} className="chip chip-info">
                        🥤 {n > 1 ? `${n} × ` : ''}{labelOf(menu, 'bebida', k)}
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
              className="press inline-flex items-center min-h-12 px-6 rounded-xl font-bold transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
              Hacer pedido 🐟
            </Link>
          </div>
        )}
      </div>

      {/* Cómo pagar */}
      {mustPay && (hasPayInfo || payerProfile) && (
        <div className="rounded-2xl p-5 border shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <h2 className="font-bold text-xs tracking-wide mb-3" style={{ color: 'var(--muted)' }}>CÓMO PAGAR</h2>
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
