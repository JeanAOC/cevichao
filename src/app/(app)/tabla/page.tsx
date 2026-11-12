import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'
import { extrasOf, bebidasOf, bebidasLabel } from '@/lib/pricing'
import { itemsOf, labelOf, labelMap, type MenuData } from '@/lib/menu'
import { loadMenu } from '@/lib/menu-server'
import { todayDate } from '@/lib/date'
import { filterOrders, availableFilters, type OrderFilters } from '@/lib/orders'
import FilterBar from '@/components/FilterBar'

export const revalidate = 0


function SauceChips({ o, hideEmpty }: { o: Order; hideEmpty?: boolean }) {
  const sauces = [
    { label: 'Tomate', val: o.sauce_tomate },
    { label: 'Limón', val: o.sauce_limon },
    { label: 'Mostaza', val: o.sauce_mostaza },
    { label: 'Ají', val: o.sauce_aji },
  ].filter(s => s.val !== 'no')
  if (sauces.length === 0) return hideEmpty ? null : <span style={{ color: 'var(--muted)' }}>—</span>
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

function ExtraChips({ o, menu, hideEmpty }: { o: Order; menu: MenuData; hideEmpty?: boolean }) {
  const extras = extrasOf(o)
  if (extras.length === 0) return hideEmpty ? null : <span style={{ color: 'var(--muted)' }}>—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {extras.map(([k, n]) => (
        <span key={k} className="chip chip-info">+{n > 1 ? `${n} × ` : ''}{labelOf(menu, 'extra', k)}</span>
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
    <div className="rounded-2xl border p-4 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-xs font-bold tracking-wide mb-1" style={{ color: 'var(--muted)' }}>{title}</p>
      <div>
        {items.map(([label, n]) => (
          <div key={label} className="menu-row">
            <span className="font-semibold text-sm">{label}</span>
            <span className="leader" aria-hidden />
            <span className="text-2xl font-extrabold font-display tabular-nums" style={{ color }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function countBy(orders: Order[], pick: (o: Order) => string | null, labels: Record<string, string>): [string, number][] {
  const counts = new Map<string, number>()
  for (const o of orders) {
    const k = pick(o)
    if (k) counts.set(k, (counts.get(k) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => [labels[k] ?? k, n])
}

export default async function TablaPage({ searchParams }: { searchParams: Promise<OrderFilters> }) {
  const filters = await searchParams
  const menu = await loadMenu()
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
  if (filters.protein) filterParts.push(labelOf(menu, 'protein', filters.protein))
  if (filters.base) filterParts.push(`con ${labelOf(menu, 'base', filters.base)}`)
  if (filters.bebida) filterParts.push(`con ${labelOf(menu, 'bebida', filters.bebida)}`)
  if (filters.mani === '1') filterParts.push('con Maní')
  if (filters.mani === '0') filterParts.push('sin Maní')
  if (filters.guac === '1') filterParts.push('con Guacamole')
  if (filters.guac === '0') filterParts.push('sin Guacamole')

  const extrasItems: [string, number][] = [
    ['Maní', realOrders.filter(o => o.extra_mani).length],
    ['Guacamole', realOrders.filter(o => o.extra_guacamole).length],
    // Unidades de cada extra de pago (2 cocolones de una persona cuentan 2); incluye extras ocultos con pedidos
    ...itemsOf(menu, 'extra', false).map(x => [
      x.label,
      realOrders.reduce((s, o) => s + (extrasOf(o).find(([k]) => k === x.key)?.[1] ?? 0), 0),
    ] as [string, number]),
  ]
  // Total de unidades por bebida (2 colas de una persona cuentan 2)
  const bebidaTotals = new Map<string, number>()
  for (const o of realOrders) for (const [k, n] of bebidasOf(o)) bebidaTotals.set(k, (bebidaTotals.get(k) ?? 0) + n)
  const bebidaItems: [string, number][] = [...bebidaTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => [labelOf(menu, 'bebida', k), n])

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold">Tabla del día</h1>
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
                items={countBy(realOrders, o => o.protein, labelMap(menu, 'protein'))} />
              <Summary title="BASES" color="var(--primary)"
                items={countBy(realOrders, o => o.base, labelMap(menu, 'base'))} />
              <Summary title="EXTRAS" color="var(--primary)" items={extrasItems.filter(([, n]) => n > 0)} />
              <Summary title="BEBIDAS" color="var(--primary)" items={bebidaItems} />
            </div>
          )}

          <FilterBar menu={menu} available={availableFilters(all)} />

          {/* Resultado: número grande + qué se está contando */}
          <div className="rounded-2xl border-2 border-dashed px-5 py-4 flex items-center gap-4"
            style={{ background: 'color-mix(in srgb, var(--primary) 8%, var(--card))', borderColor: 'var(--primary)' }}>
            <span className="text-6xl font-extrabold font-display leading-none tabular-nums" style={{ color: 'var(--primary)' }}>{filteredReal.length}</span>
            <div className="flex-1 min-w-0">
              <p className="font-extrabold font-display text-lg leading-tight">
                {filterParts.length > 0 ? filterParts.join(' · ') : 'Pedidos en total'}
              </p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                {isFiltered ? `de ${realOrders.length} pedidos en total` : `${filteredReal.length === 1 ? 'persona' : 'personas'} pidiendo hoy`}
              </p>
            </div>
            <span className="text-2xl font-extrabold font-display shrink-0" style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</span>
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
                    <div key={o.id} className="rounded-2xl border p-4 space-y-2 shadow-card"
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
                            <span className="font-semibold" style={{ color: 'var(--primary)' }}>{labelOf(menu, 'protein', o.protein)}</span>
                            <span style={{ color: 'var(--muted)' }}> · {labelOf(menu, 'base', o.base)}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                            {o.extra_mani && <span className="font-medium" style={{ color: 'var(--success)' }}>Maní ✓</span>}
                            {o.extra_guacamole && <span className="font-medium" style={{ color: 'var(--success)' }}>Guacamole ✓</span>}
                            {bebidasLabel(menu, o) && <span style={{ color: 'var(--muted)' }}>🥤 {bebidasLabel(menu, o)}</span>}
                          </div>
                          <ExtraChips o={o} menu={menu} hideEmpty />
                          <SauceChips o={o} hideEmpty />
                          {o.comentarios && <p className="text-sm italic" style={{ color: 'var(--muted)' }}>&quot;{o.comentarios}&quot;</p>}
                          <p className="text-right font-extrabold font-display text-lg" style={{ color: 'var(--accent)' }}>${Number(o.total).toFixed(2)}</p>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block rounded-2xl border overflow-hidden shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
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
                                <td className="px-3 py-3 whitespace-nowrap font-semibold" style={{ color: 'var(--primary)' }}>{labelOf(menu, 'protein', o.protein)}</td>
                                <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>{labelOf(menu, 'base', o.base)}</td>
                                <td className="px-3 py-3 text-center"><YesNo on={o.extra_mani} /></td>
                                <td className="px-3 py-3 text-center"><YesNo on={o.extra_guacamole} /></td>
                                <td className="px-3 py-3"><ExtraChips o={o} menu={menu} /></td>
                                <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                                  {bebidasLabel(menu, o) || '—'}
                                </td>
                                <td className="px-3 py-3 min-w-[15rem]"><SauceChips o={o} /></td>
                              </>
                            )}
                            <td className="px-4 py-3 text-right font-extrabold font-display whitespace-nowrap" style={{ color: noFood ? 'var(--muted)' : 'var(--accent)' }}>
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
                        <td className="px-4 py-3 text-right font-display text-lg" style={{ color: 'var(--accent)' }}>${total.toFixed(2)}</td>
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
