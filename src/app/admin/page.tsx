import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarkPaidButton from './MarkPaidButton'
import LockButton from './LockButton'
import DeleteOrderButton from './DeleteOrderButton'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS, EXTRA_LABELS, extrasOf, bebidasOf } from '@/lib/pricing'

export const revalidate = 0

import { todayDate } from '@/lib/date'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user!.id).single()
  if (!profile?.is_admin) redirect('/')

  const admin = createAdminClient()
  const today = todayDate()

  const [{ data: allOrders }, { data: lockSetting }] = await Promise.all([
    admin.from('orders').select('*, profile:profiles(display_name)').eq('order_date', today).order('created_at', { ascending: true }) as unknown as Promise<{ data: Order[] | null }>,
    admin.from('settings').select('value').eq('key', 'orders_locked').maybeSingle(),
  ])

  const isLocked = lockSetting?.value === 'true'
  const allOrdersRaw = allOrders ?? []
  const realOrders = allOrdersRaw.filter(o => o.protein !== 'no_por_hoy')

  const orders = allOrdersRaw
  const totalHoy = realOrders.reduce((s, o) => s + Number(o.total), 0)
  const cobrado = realOrders.filter(o => o.paid).reduce((s, o) => s + Number(o.total), 0)
  const pendiente = totalHoy - cobrado

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="min-h-screen pb-8" style={{ background: 'var(--bg)' }}>
      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'var(--accent)', color: 'white' }}>🔧</div>
            <div>
              <h1 className="text-2xl font-black">Admin</h1>
              <p className="text-sm capitalize" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
            </div>
          </div>
          <LockButton locked={isLocked} />
        </div>

        {isLocked && (
          <div className="rounded-2xl px-4 py-3 text-sm font-semibold flex items-center gap-2"
            style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card))', color: 'var(--danger)', border: '1.5px solid color-mix(in srgb, var(--danger) 25%, transparent)' }}>
            🔒 Los pedidos están bloqueados — nadie puede editar ni crear pedidos
          </div>
        )}

        {/* Stats dinero */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total', value: `$${totalHoy.toFixed(2)}`, color: 'var(--text)' },
            { label: 'Cobrado', value: `$${cobrado.toFixed(2)}`, color: 'var(--success)' },
            { label: 'Pendiente', value: `$${pendiente.toFixed(2)}`, color: pendiente > 0 ? 'var(--accent)' : 'var(--muted)' },
          ].map(s => (
            <div key={s.label} className="rounded-2xl border p-4 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <p className="text-xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Lista pedidos */}
        <div>
          <p className="text-xs font-bold mb-3 px-1" style={{ color: 'var(--muted)' }}>
            PEDIDOS HOY — {realOrders.length} personas
          </p>
          {orders.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              No hay pedidos todavía
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const noFood = o.protein === 'no_por_hoy'
                const name = o.profile?.display_name ?? 'Usuario'
                const accentColor = noFood ? 'var(--border)' : o.paid ? 'var(--success)' : 'var(--accent)'
                return (
                  <div key={o.id} className="rounded-2xl border overflow-hidden"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)', borderLeftColor: accentColor, borderLeftWidth: 4 }}>

                    {/* Header */}
                    <div className="flex items-center justify-between px-4 pt-4 pb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-black text-white text-base shrink-0"
                          style={{ background: accentColor === 'var(--border)' ? 'var(--muted)' : accentColor }}>
                          {name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-black text-base leading-tight">{name}</p>
                          {noFood
                            ? <p className="text-xs" style={{ color: 'var(--muted)' }}>No pide hoy</p>
                            : <p className="text-xs font-medium" style={{ color: o.paid ? 'var(--success)' : 'var(--accent)' }}>
                                {o.paid ? '✓ Pagado' : 'Pendiente'}
                              </p>
                          }
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!noFood && (
                          <>
                            <span className="font-black text-xl" style={{ color: 'var(--success)' }}>${Number(o.total).toFixed(2)}</span>
                            <MarkPaidButton orderId={o.id} paid={o.paid} />
                          </>
                        )}
                        <Link
                          href={`/admin/editar/${o.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg font-bold border"
                          style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                          Editar
                        </Link>
                        <DeleteOrderButton orderId={o.id} />
                      </div>
                    </div>

                    {!noFood && (
                      <div className="px-4 pb-4 space-y-2 border-t" style={{ borderColor: 'var(--border)' }}>

                        {/* Proteína + Base */}
                        <div className="grid grid-cols-2 gap-2 pt-3">
                          {[
                            { label: PROTEIN_LABELS[o.protein], color: 'var(--primary)' },
                            { label: BASE_LABELS[o.base], color: 'var(--muted)' },
                          ].map(({ label, color }) => (
                            <div key={label} className="flex flex-col items-center py-2.5 rounded-xl text-center"
                              style={{ background: `color-mix(in srgb, ${color} 12%, var(--card))`, border: `1.5px solid color-mix(in srgb, ${color} 25%, transparent)` }}>
                              <span className="font-black text-sm" style={{ color }}>{label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Maní / Guacamole */}
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { label: 'Maní', val: o.extra_mani },
                            { label: 'Guacamole', val: o.extra_guacamole },
                          ].map(({ label, val }) => (
                            <div key={label} className="flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm"
                              style={val
                                ? { background: 'color-mix(in srgb, var(--success) 15%, var(--card))', color: 'var(--success)', border: '1.5px solid color-mix(in srgb, var(--success) 30%, transparent)' }
                                : { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                              <span>{val ? '✓' : '✗'}</span>
                              <span>{label}</span>
                            </div>
                          ))}
                        </div>

                        {/* Extras de pago + bebida */}
                        {(extrasOf(o).length > 0 || bebidasOf(o).length > 0) && (
                          <div className="flex flex-wrap gap-1.5">
                            {extrasOf(o).map(([k, n]) => (
                              <span key={k} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>
                                +{n > 1 ? `${n} × ` : ''}{EXTRA_LABELS[k]}
                              </span>
                            ))}
                            {bebidasOf(o).map(([k, n]) => (
                              <span key={k} className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, var(--card))', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                🥤 {n > 1 ? `${n} × ` : ''}{BEBIDA_LABELS[k]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Salsas */}
                        <div className="grid grid-cols-4 gap-2">
                          {([
                            { label: 'Tomate', val: o.sauce_tomate },
                            { label: 'Limón', val: o.sauce_limon },
                            { label: 'Mostaza', val: o.sauce_mostaza },
                            { label: 'Ají', val: o.sauce_aji },
                          ] as const).map(({ label, val }) => {
                            return (
                              <div key={label} className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-center"
                                style={val !== 'no'
                                  ? { background: `var(--${val}-bg)`, border: `1.5px solid var(--${val}-bd)`, color: `var(--${val}-fg)` }
                                  : { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                                <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
                                <span className="text-xs font-black">{val !== 'no' ? val.charAt(0).toUpperCase() + val.slice(1) : '—'}</span>
                              </div>
                            )
                          })}
                        </div>

                        {o.comentarios && (
                          <p className="text-xs italic" style={{ color: 'var(--muted)' }}>"{o.comentarios}"</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
