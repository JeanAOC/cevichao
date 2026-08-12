import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS, BEBIDA_PRICES } from '@/lib/pricing'

export const revalidate = 0

function todayDate() {
  // Ecuador UTC-5
  const now = new Date()
  const ec = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return ec.toISOString().split('T')[0]
}

function SauceTag({ label, amount }: { label: string; amount: string }) {
  if (amount === 'no') return null
  const colors: Record<string, string> = {
    poco: 'bg-yellow-100 text-yellow-800',
    medio: 'bg-orange-100 text-orange-800',
    mucho: 'bg-red-100 text-red-800',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[amount] ?? ''}`}>
      {label} {amount}
    </span>
  )
}

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const { data: myOrder } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user!.id)
    .eq('order_date', today)
    .maybeSingle() as { data: Order | null }

  const { data: allOrders } = await supabase
    .from('orders')
    .select('*, profile:profiles(display_name)')
    .eq('order_date', today)
    .order('created_at', { ascending: true }) as { data: Order[] | null }

  const orders = allOrders ?? []
  const totalPersonas = orders.filter(o => o.protein !== 'no_por_hoy').length
  const totalDinero = orders.reduce((sum, o) => sum + Number(o.total), 0)
  const pendientePago = orders.filter(o => o.protein !== 'no_por_hoy' && !o.paid).reduce((s, o) => s + Number(o.total), 0)

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black capitalize">{dateLabel}</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {totalPersonas} pedidos · ${totalDinero.toFixed(2)} total
        </p>
      </div>

      {/* Mi pedido */}
      <div className="rounded-2xl p-5 border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <h2 className="font-bold text-sm mb-3" style={{ color: 'var(--muted)' }}>MI PEDIDO HOY</h2>
        {myOrder ? (
          <div className="space-y-3">
            {myOrder.protein === 'no_por_hoy' ? (
              <p className="text-lg font-bold" style={{ color: 'var(--muted)' }}>No pides hoy</p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">{PROTEIN_LABELS[myOrder.protein]}</p>
                    <p className="text-sm" style={{ color: 'var(--muted)' }}>{BASE_LABELS[myOrder.base]}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black" style={{ color: 'var(--success)' }}>${Number(myOrder.total).toFixed(2)}</p>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${myOrder.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {myOrder.paid ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>
                </div>
                {(myOrder.extra_mani || myOrder.extra_guacamole) && (
                  <div className="flex flex-wrap gap-1.5">
                    {myOrder.extra_mani && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>Maní ✓</span>}
                    {myOrder.extra_guacamole && <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--success) 15%, transparent)', color: 'var(--success)' }}>Guacamole ✓</span>}
                  </div>
                )}
                {(myOrder.extra_sal_prieta || myOrder.extra_mani_quebrado || myOrder.extra_cocolon || myOrder.extra_toston) && (
                  <div className="flex flex-wrap gap-1.5">
                    {myOrder.extra_sal_prieta && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">+Salprieta $1</span>}
                    {myOrder.extra_mani_quebrado && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">+Maní Quebrado $1</span>}
                    {myOrder.extra_cocolon && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">+Cocolón $1</span>}
                    {myOrder.extra_toston && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">+Tostón $1.50</span>}
                  </div>
                )}
                {myOrder.bebida && myOrder.bebida !== 'ninguna' && (
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'color-mix(in srgb, var(--primary) 12%, transparent)', color: 'var(--primary)' }}>
                      🥤 {BEBIDA_LABELS[myOrder.bebida]} ${BEBIDA_PRICES[myOrder.bebida].toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  <SauceTag label="Tomate" amount={myOrder.sauce_tomate} />
                  <SauceTag label="Limón" amount={myOrder.sauce_limon} />
                  <SauceTag label="Mostaza" amount={myOrder.sauce_mostaza} />
                  <SauceTag label="Ají" amount={myOrder.sauce_aji} />
                </div>
                {myOrder.comentarios && (
                  <p className="text-sm italic" style={{ color: 'var(--muted)' }}>"{myOrder.comentarios}"</p>
                )}
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

      {/* Stats */}
      {orders.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pedidos', value: totalPersonas },
            { label: 'Total', value: `$${totalDinero.toFixed(2)}` },
            { label: 'Pendiente', value: `$${pendientePago.toFixed(2)}` },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4 text-center border"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xl font-black">{stat.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Resumen pedidos del día */}
      {orders.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--muted)' }}>TODOS LOS PEDIDOS HOY</h2>
          </div>
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {orders.map(o => {
              const isMe = o.user_id === user!.id
              return (
                <div key={o.id} className={`flex items-center gap-3 px-4 py-3 ${isMe ? 'bg-blue-50 dark:bg-blue-950/20' : ''}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                    style={{ background: 'var(--primary)' }}>
                    {((o.profile as any)?.display_name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate flex items-center gap-1">
                      {(o.profile as any)?.display_name ?? 'Usuario'}
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">Tú</span>}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--muted)' }}>
                      {o.protein === 'no_por_hoy' ? 'No pide hoy' : `${PROTEIN_LABELS[o.protein]} · ${BASE_LABELS[o.base]}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>
                      {o.protein === 'no_por_hoy' ? '—' : `$${Number(o.total).toFixed(2)}`}
                    </p>
                    {o.protein !== 'no_por_hoy' && (
                      <span className={`text-[10px] font-bold ${o.paid ? 'text-green-600' : 'text-yellow-600'}`}>
                        {o.paid ? '✓ Pagado' : 'Pendiente'}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
