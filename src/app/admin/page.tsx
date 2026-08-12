import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MarkPaidButton from './MarkPaidButton'
import FilterBar from './FilterBar'
import LockButton from './LockButton'
import DeleteOrderButton from './DeleteOrderButton'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS } from '@/lib/pricing'

export const revalidate = 0

function todayDate() {
  const now = new Date()
  const ec = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return ec.toISOString().split('T')[0]
}

function CountGrid({ title, items }: { title: string; items: [string, number][] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map(([label, count]) => (
          <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
            <span className="text-sm font-semibold">{label}</span>
            <span className="text-lg font-black" style={{ color: 'var(--primary)' }}>{count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function AdminPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles').select('is_admin').eq('id', user!.id).single()
  if (!profile?.is_admin) redirect('/')

  const filters = await searchParams
  const admin = createAdminClient()
  const today = todayDate()

  const [{ data: allOrders }, { data: lockSetting }] = await Promise.all([
    admin.from('orders').select('*, profile:profiles(display_name)').eq('order_date', today).order('created_at', { ascending: true }) as unknown as Promise<{ data: Order[] | null }>,
    admin.from('settings').select('value').eq('key', 'orders_locked').maybeSingle(),
  ])

  const isLocked = lockSetting?.value === 'true'
  const allOrdersRaw = allOrders ?? []
  const realOrders = allOrdersRaw.filter(o => o.protein !== 'no_por_hoy')

  // Aplicar filtros
  const orders = allOrdersRaw.filter(o => {
    if (o.protein === 'no_por_hoy') return true
    if (filters.protein && o.protein !== filters.protein) return false
    if (filters.base && o.base !== filters.base) return false
    if (filters.mani === '1' && !o.extra_mani) return false
    if (filters.mani === '0' && o.extra_mani) return false
    if (filters.guac === '1' && !o.extra_guacamole) return false
    if (filters.guac === '0' && o.extra_guacamole) return false
    return true
  })
  const filteredReal = orders.filter(o => o.protein !== 'no_por_hoy')
  const totalHoy = realOrders.reduce((s, o) => s + Number(o.total), 0)
  const cobrado = realOrders.filter(o => o.paid).reduce((s, o) => s + Number(o.total), 0)
  const pendiente = totalHoy - cobrado

  // Conteos
  const proteinCounts: Record<string, number> = {}
  const baseCounts: Record<string, number> = {}
  const bebidaCounts: Record<string, number> = {}
  let cntSalPrieta = 0, cntManiQ = 0, cntCocolon = 0, cntToston = 0

  for (const o of realOrders) {
    proteinCounts[o.protein] = (proteinCounts[o.protein] ?? 0) + 1
    baseCounts[o.base] = (baseCounts[o.base] ?? 0) + 1
    if (o.extra_sal_prieta) cntSalPrieta++
    if (o.extra_mani_quebrado) cntManiQ++
    if (o.extra_cocolon) cntCocolon++
    if (o.extra_toston) cntToston++
    if (o.bebida && o.bebida !== 'ninguna') {
      bebidaCounts[o.bebida] = (bebidaCounts[o.bebida] ?? 0) + 1
    }
  }

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

        {/* Resumen pedidos */}
        {realOrders.length > 0 && (
          <div className="rounded-2xl border p-4 space-y-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <h2 className="font-bold text-sm" style={{ color: 'var(--muted)' }}>RESUMEN — {realOrders.length} PEDIDOS</h2>
            <CountGrid title="PROTEÍNAS"
              items={Object.entries(proteinCounts).map(([k, v]) => [PROTEIN_LABELS[k as keyof typeof PROTEIN_LABELS] ?? k, v])} />
            <CountGrid title="BASES"
              items={Object.entries(baseCounts).map(([k, v]) => [BASE_LABELS[k as keyof typeof BASE_LABELS] ?? k, v])} />
            {(cntSalPrieta + cntManiQ + cntCocolon + cntToston) > 0 && (
              <CountGrid title="EXTRAS"
                items={[
                  ...(cntSalPrieta > 0 ? [['Salprieta', cntSalPrieta] as [string, number]] : []),
                  ...(cntManiQ > 0 ? [['M.Quebrado', cntManiQ] as [string, number]] : []),
                  ...(cntCocolon > 0 ? [['Cocolón', cntCocolon] as [string, number]] : []),
                  ...(cntToston > 0 ? [['Tostón', cntToston] as [string, number]] : []),
                ]} />
            )}
            {Object.keys(bebidaCounts).length > 0 && (
              <CountGrid title="BEBIDAS"
                items={Object.entries(bebidaCounts).map(([k, v]) => [BEBIDA_LABELS[k as keyof typeof BEBIDA_LABELS] ?? k, v])} />
            )}
          </div>
        )}

        {/* Filtros */}
        <FilterBar />

        {/* Lista pedidos */}
        <div>
          <p className="text-xs font-bold mb-3 px-1" style={{ color: 'var(--muted)' }}>
            PEDIDOS HOY — {filteredReal.length}{filteredReal.length !== realOrders.length ? ` de ${realOrders.length}` : ''} personas
          </p>
          {orders.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              No hay pedidos todavía
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => {
                const noFood = o.protein === 'no_por_hoy'
                const name = (o.profile as any)?.display_name ?? 'Usuario'
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
                        {(o.extra_sal_prieta || o.extra_mani_quebrado || o.extra_cocolon || o.extra_toston || (o.bebida && o.bebida !== 'ninguna')) && (
                          <div className="flex flex-wrap gap-1.5">
                            {o.extra_sal_prieta && <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>+Salprieta</span>}
                            {o.extra_mani_quebrado && <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>+M.Quebrado</span>}
                            {o.extra_cocolon && <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>+Cocolón</span>}
                            {o.extra_toston && <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--accent) 12%, var(--card))', color: 'var(--accent)', border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)' }}>+Tostón</span>}
                            {o.bebida && o.bebida !== 'ninguna' && (
                              <span className="text-xs px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'color-mix(in srgb, var(--primary) 12%, var(--card))', color: 'var(--primary)', border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)' }}>
                                🥤 {BEBIDA_LABELS[o.bebida]}
                              </span>
                            )}
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
                            const colors: Record<string, string> = { poco: '#ca8a04', medio: '#ea580c', mucho: '#dc2626' }
                            const color = val !== 'no' ? colors[val] : undefined
                            return (
                              <div key={label} className="flex flex-col items-center gap-0.5 py-2.5 rounded-xl text-center"
                                style={color
                                  ? { background: `color-mix(in srgb, ${color} 15%, var(--card))`, border: `1.5px solid color-mix(in srgb, ${color} 30%, transparent)`, color }
                                  : { background: 'var(--bg)', border: '1.5px solid var(--border)', color: 'var(--border)' }}>
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
