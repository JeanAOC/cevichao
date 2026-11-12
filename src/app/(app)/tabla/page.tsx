import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'
import {
  PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS, EXTRA_LABELS, EXTRA_KEYS, extrasOf, bebidasOf, bebidasLabel,
  type Protein, type Base, type Bebida,
} from '@/lib/pricing'
import { todayDate } from '@/lib/date'
import { filterOrders, availableFilters, type OrderFilters } from '@/lib/orders'
import FilterBar from '@/components/FilterBar'

export const revalidate = 0


function SauceChips({ o }: { o: Order }) {
  const sauces = [
    { label: 'Tomate', val: o.sauce_tomate },
    { label: 'Limón', val: o.sauce_limon },
    { label: 'Mostaza', val: o.sauce_mostaza },
    { label: 'Ají', val: o.sauce_aji },
  ].filter(s => s.val !== 'no')
  if (sauces.length === 0) return <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {sauces.map(({ label, val }) => (
        <span key={label} className={`chip chip-${val}`}>
          {label} · {val}
        </span>
      ))}
    </div>
  )
}

function ExtraChips({ o }: { o: Order }) {
  const extras = extrasOf(o)
  if (extras.length === 0) return <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {extras.map(([k, n]) => (
        <span key={k} className="chip chip-info">+{n > 1 ? `${n} × ` : ''}{EXTRA_LABELS[k]}</span>
      ))}
    </div>
  )
}

function YesNo({ on }: { on: boolean }) {
  return on
    ? <span className="font-bold" style={{ color: 'var(--success)' }}>✓</span>
    : <span style={{ color: 'var(--muted)' }}>—</span>
}

function Summary({ title, items, color }: { title: string; items: [string, number][]; color: string }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-xs font-bold mb-3" style={{ color: 'var(--muted)' }}>{title}</p>
      <div className="space-y-2">
        {items.map(([label, n]) => (
          <div key={label} className="flex items-center justify-between">
            <span className="font-semibold text-sm">{label}</span>
            <span className="text-xl font-black" style={{ color }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function countBy<T extends string>(orders: Order[], pick: (o: Order) => T | null, labels: Record<T, string>): [string, number][] {
  const counts = new Map<T, number>()
  for (const o of orders) {
    const k = pick(o)
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [labels[k] ?? k, n])
}

export default async function TablaPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const filters = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const { data: allOrders } = await supabase
    .from('orders')
    .select('*, profile:profiles(display_name)')
    .eq('order_date', today)
    .order('created_at', { ascending: true }) as { data: Order[] | null }

  const all = allOrders ?? []
  const realOrders = all.filter(o => o.protein !== 'no_por_hoy')
  const noFoodCount = all.length - realOrders.length

  // El resumen siempre cuenta TODOS los pedidos del día; la tabla respeta los filtros
  const orders = filterOrders(all, filters)
  const filteredReal = orders.filter(o => o.protein !== 'no_por_hoy')
  const total = filteredReal.reduce((s, o) => s + Number(o.total), 0)
  const isFiltered = filteredReal.length !== realOrders.length || orders.length !== all.length

  // Descripción legible de los filtros activos, ej. "Pescado · con Chifles · sin Maní"
  const filterParts: string[] = []
  if (filters.protein) filterParts.push(PROTEIN_LABELS[filters.protein as Protein] ?? filters.protein)
  if (filters.base) filterParts.push(`con ${BASE_LABELS[filters.base as Base] ?? filters.base}`)
  if (filters.bebida) filterParts.push(`con ${BEBIDA_LABELS[filters.bebida as Bebida] ?? filters.bebida}`)
  if (filters.mani === '1') filterParts.push('con Maní')
  if (filters.mani === '0') filterParts.push('sin Maní')
  if (filters.guac === '1') filterParts.push('con Guacamole')
  if (filters.guac === '0') filterParts.push('sin Guacamole')

  const extrasItems: [string, number][] = [
    ['Maní', realOrders.filter(o => o.extra_mani).length],
    ['Guacamole', realOrders.filter(o => o.extra_guacamole).length],
    // Unidades de cada extra de pago (2 cocolones de una persona cuentan 2)
    ...EXTRA_KEYS.map(k => [
      EXTRA_LABELS[k],
      realOrders.reduce((s, o) => s + (extrasOf(o).find(([x]) => x === k)?.[1] ?? 0), 0),
    ] as [string, number]),
  ]
  // Total de unidades por bebida (2 colas de una persona cuentan 2)
  const bebidaTotals = new Map<string, number>()
  for (const o of realOrders) for (const [k, n] of bebidasOf(o)) bebidaTotals.set(k, (bebidaTotals.get(k) ?? 0) + n)
  const bebidaItems: [string, number][] = [...bebidaTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => [BEBIDA_LABELS[k as Bebida] ?? k, n])

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Tabla del día</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {dateLabel} · {realOrders.length} pedido{realOrders.length !== 1 ? 's' : ''}
          {noFoodCount > 0 && ` · ${noFoodCount} no pide${noFoodCount !== 1 ? 'n' : ''}`}
        </p>
      </div>

      {all.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <p className="text-4xl mb-3">📋</p>
          <p>Nadie ha pedido todavía hoy</p>
        </div>
      ) : (
        <>
          {/* Resumen del día (para saber cuánto pedir en el local) */}
          {realOrders.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Summary title="PROTEÍNAS" color="var(--primary)"
                items={countBy<Protein>(realOrders, o => o.protein, PROTEIN_LABELS)} />
              <Summary title="BASES" color="var(--accent)"
                items={countBy<Base>(realOrders, o => o.base, BASE_LABELS)} />
              <Summary title="EXTRAS" color="var(--success)" items={extrasItems.filter(([, n]) => n > 0)} />
              <Summary title="BEBIDAS" color="var(--primary)" items={bebidaItems} />
            </div>
          )}

          <FilterBar available={availableFilters(all)} />

          {/* Resultado: número grande + qué se está contando */}
          <div className="rounded-2xl border px-5 py-4 flex items-center gap-4"
            style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--card))', borderColor: 'var(--primary)' }}>
            <span className="text-5xl font-black leading-none" style={{ color: 'var(--primary)' }}>{filteredReal.length}</span>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg leading-tight">
                {filterParts.length > 0 ? filterParts.join(' · ') : 'Pedidos en total'}
              </p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {isFiltered ? `de ${realOrders.length} pedidos en total` : `${filteredReal.length === 1 ? 'persona' : 'personas'} pidiendo hoy`}
              </p>
            </div>
            <span className="text-xl font-black shrink-0" style={{ color: 'var(--success)' }}>${total.toFixed(2)}</span>
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              Ningún pedido coincide con los filtros
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 sm:hidden">
                {orders.map(o => {
                  const isMe = o.user_id === user!.id
                  const noFood = o.protein === 'no_por_hoy'
                  return (
                    <div key={o.id} className="rounded-2xl border p-4 space-y-2"
                      style={{ background: 'var(--card)', borderColor: isMe ? 'var(--primary)' : 'var(--border)', borderWidth: isMe ? 2 : 1 }}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1.5">
                          {o.profile?.display_name ?? 'Usuario'}
                          {isMe && <span className="chip chip-info chip-sm">Tú</span>}
                        </span>
                        <span className={`chip ${noFood ? 'chip-neutral' : o.paid ? 'chip-ok' : 'chip-warn'}`}>
                          {noFood ? 'No pide' : o.paid ? '✓ Pagado' : 'Pendiente'}
                        </span>
                      </div>
                      {!noFood && (
                        <>
                          <div className="text-sm">
                            <span className="font-semibold" style={{ color: 'var(--primary)' }}>{PROTEIN_LABELS[o.protein]}</span>
                            <span style={{ color: 'var(--muted)' }}> · {BASE_LABELS[o.base]}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {o.extra_mani && <span className="font-medium" style={{ color: 'var(--success)' }}>Maní ✓</span>}
                            {o.extra_guacamole && <span className="font-medium" style={{ color: 'var(--success)' }}>Guacamole ✓</span>}
                            {bebidasLabel(o) && <span style={{ color: 'var(--muted)' }}>🥤 {bebidasLabel(o)}</span>}
                          </div>
                          <ExtraChips o={o} />
                          <SauceChips o={o} />
                          {o.comentarios && <p className="text-xs italic" style={{ color: 'var(--muted)' }}>&quot;{o.comentarios}&quot;</p>}
                          <p className="text-right font-black" style={{ color: 'var(--success)' }}>${Number(o.total).toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                        <th className="px-4 py-3 text-left">Nombre</th>
                        <th className="px-3 py-3 text-left">Proteína</th>
                        <th className="px-3 py-3 text-left">Base</th>
                        <th className="px-3 py-3 text-center">Maní</th>
                        <th className="px-3 py-3 text-center">Guac</th>
                        <th className="px-3 py-3 text-left">Extras</th>
                        <th className="px-3 py-3 text-left">Bebida</th>
                        <th className="px-3 py-3 text-left">Salsas</th>
                        <th className="px-4 py-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(o => {
                        const isMe = o.user_id === user!.id
                        const noFood = o.protein === 'no_por_hoy'
                        return (
                          <tr key={o.id} className="align-top"
                            style={{
                              borderTop: '1px solid var(--border)',
                              background: isMe ? 'color-mix(in srgb, var(--primary) 6%, transparent)' : undefined,
                            }}>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">
                              {o.profile?.display_name ?? 'Usuario'}
                              {isMe && <span className="ml-1.5 chip chip-info chip-sm">Tú</span>}
                              {o.comentarios && !noFood && (
                                <p className="text-[11px] italic font-normal max-w-[140px] truncate" style={{ color: 'var(--muted)' }} title={o.comentarios}>
                                  &quot;{o.comentarios}&quot;
                                </p>
                              )}
                            </td>
                            {noFood ? (
                              <td className="px-3 py-3" colSpan={7} style={{ color: 'var(--muted)' }}>No pide hoy</td>
                            ) : (
                              <>
                                <td className="px-3 py-3 whitespace-nowrap font-semibold" style={{ color: 'var(--primary)' }}>{PROTEIN_LABELS[o.protein]}</td>
                                <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{BASE_LABELS[o.base]}</td>
                                <td className="px-3 py-3 text-center"><YesNo on={o.extra_mani} /></td>
                                <td className="px-3 py-3 text-center"><YesNo on={o.extra_guacamole} /></td>
                                <td className="px-3 py-3"><ExtraChips o={o} /></td>
                                <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                                  {bebidasLabel(o) || '—'}
                                </td>
                                <td className="px-3 py-3"><SauceChips o={o} /></td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: noFood ? 'var(--muted)' : 'var(--success)' }}>
                              {noFood ? '—' : `$${Number(o.total).toFixed(2)}`}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="font-black" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg)' }}>
                        <td className="px-4 py-3" colSpan={8}>
                          Total — {filteredReal.length} pedido{filteredReal.length !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 py-3 text-right" style={{ color: 'var(--success)' }}>${total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
