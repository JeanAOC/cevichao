import { createClient } from '@/lib/supabase/server'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS, BEBIDA_LABELS } from '@/lib/pricing'

export const revalidate = 0

function todayDate() {
  const now = new Date()
  const ec = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  return ec.toISOString().split('T')[0]
}

function SauceCell({ amount }: { amount: string }) {
  if (amount === 'no') return <span style={{ color: 'var(--border)' }}>—</span>
  const cls: Record<string, string> = {
    poco: 'text-yellow-500 font-semibold',
    medio: 'text-orange-500 font-bold',
    mucho: 'text-red-500 font-black',
  }
  return <span className={cls[amount] ?? ''}>{amount.charAt(0).toUpperCase() + amount.slice(1)}</span>
}

function CheckCell({ on }: { on: boolean }) {
  return on
    ? <span className="text-green-500 font-bold">✓</span>
    : <span style={{ color: 'var(--border)' }}>—</span>
}

export default async function TablaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const today = todayDate()

  const { data: allOrders } = await supabase
    .from('orders')
    .select('*, profile:profiles(display_name)')
    .eq('order_date', today)
    .order('created_at', { ascending: true }) as { data: Order[] | null }

  const orders = allOrders ?? []
  const realOrders = orders.filter(o => o.protein !== 'no_por_hoy')
  const total = realOrders.reduce((s, o) => s + Number(o.total), 0)

  // Conteos para resumen
  const proteinCounts: Record<string, number> = {}
  const baseCounts: Record<string, number> = {}
  for (const o of realOrders) {
    proteinCounts[o.protein] = (proteinCounts[o.protein] ?? 0) + 1
    baseCounts[o.base] = (baseCounts[o.base] ?? 0) + 1
  }

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black capitalize">Tabla del día</h1>
        <p className="text-sm mt-0.5 capitalize" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <p className="text-4xl mb-3">📋</p>
          <p>Nadie ha pedido todavía hoy</p>
        </div>
      ) : (
        <>
          {/* Resumen proteínas + bases */}
          {realOrders.length > 0 && (
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: 'var(--muted)' }}>PROTEÍNAS</p>
                <div className="space-y-2">
                  {Object.entries(proteinCounts).map(([p, n]) => (
                    <div key={p} className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{PROTEIN_LABELS[p as keyof typeof PROTEIN_LABELS] ?? p}</span>
                      <span className="text-xl font-black" style={{ color: 'var(--primary)' }}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                <p className="text-xs font-bold mb-3" style={{ color: 'var(--muted)' }}>BASES</p>
                <div className="space-y-2">
                  {Object.entries(baseCounts).map(([b, n]) => (
                    <div key={b} className="flex items-center justify-between">
                      <span className="font-semibold text-sm">{BASE_LABELS[b as keyof typeof BASE_LABELS] ?? b}</span>
                      <span className="text-xl font-black" style={{ color: 'var(--accent)' }}>{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

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
                      {(o.profile as any)?.display_name ?? 'Usuario'}
                      {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-bold">Tú</span>}
                    </span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${noFood ? 'bg-gray-100 text-gray-500' : o.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {noFood ? 'No pide' : o.paid ? '✓ Pagado' : 'Pendiente'}
                    </span>
                  </div>
                  {!noFood && (
                    <>
                      <div className="text-sm">
                        <span className="font-semibold" style={{ color: 'var(--primary)' }}>{PROTEIN_LABELS[o.protein]}</span>
                        <span style={{ color: 'var(--muted)' }}> · {BASE_LABELS[o.base]}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: 'var(--muted)' }}>
                        {o.extra_mani && <span className="text-green-600 font-medium">Maní ✓</span>}
                        {o.extra_guacamole && <span className="text-green-600 font-medium">Guacamole ✓</span>}
                        {o.extra_sal_prieta && <span className="text-blue-600 font-medium">+Salprieta</span>}
                        {o.extra_mani_quebrado && <span className="text-blue-600 font-medium">+M.Quebrado</span>}
                        {o.extra_cocolon && <span className="text-blue-600 font-medium">+Cocolón</span>}
                        {o.extra_toston && <span className="text-blue-600 font-medium">+Tostón</span>}
                        {o.bebida && o.bebida !== 'ninguna' && <span>🥤 {BEBIDA_LABELS[o.bebida]}</span>}
                        {o.sauce_tomate !== 'no' && <span>Tomate {o.sauce_tomate}</span>}
                        {o.sauce_limon !== 'no' && <span>Limón {o.sauce_limon}</span>}
                        {o.sauce_mostaza !== 'no' && <span>Mostaza {o.sauce_mostaza}</span>}
                        {o.sauce_aji !== 'no' && <span>Ají {o.sauce_aji}</span>}
                      </div>
                      {o.comentarios && <p className="text-xs italic" style={{ color: 'var(--muted)' }}>"{o.comentarios}"</p>}
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
                  <tr className="border-b text-xs font-bold uppercase tracking-wide" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
                    <th className="px-4 py-3 text-left">Nombre</th>
                    <th className="px-3 py-3 text-left">Proteína</th>
                    <th className="px-3 py-3 text-left">Base</th>
                    <th className="px-3 py-3 text-center">Maní</th>
                    <th className="px-3 py-3 text-center">Guac</th>
                    <th className="px-3 py-3 text-center">Salprieta</th>
                    <th className="px-3 py-3 text-center">M.Quebrado</th>
                    <th className="px-3 py-3 text-center">Cocolón</th>
                    <th className="px-3 py-3 text-center">Tostón</th>
                    <th className="px-3 py-3 text-left">Bebida</th>
                    <th className="px-3 py-3 text-center">Tomate</th>
                    <th className="px-3 py-3 text-center">Limón</th>
                    <th className="px-3 py-3 text-center">Mostaza</th>
                    <th className="px-3 py-3 text-center">Ají</th>
                    <th className="px-3 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {orders.map(o => {
                    const isMe = o.user_id === user!.id
                    const noFood = o.protein === 'no_por_hoy'
                    return (
                      <tr key={o.id} style={{ background: isMe ? 'color-mix(in srgb, var(--primary) 5%, transparent)' : undefined }}>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {(o.profile as any)?.display_name ?? 'Usuario'}
                          {isMe && <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-blue-100 text-blue-700 font-bold">Tú</span>}
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap">
                          {noFood
                            ? <span style={{ color: 'var(--muted)' }}>No pide</span>
                            : <span className="font-semibold" style={{ color: 'var(--primary)' }}>{PROTEIN_LABELS[o.protein]}</span>
                          }
                        </td>
                        <td className="px-3 py-3 whitespace-nowrap" style={{ color: 'var(--muted)' }}>
                          {noFood ? '—' : BASE_LABELS[o.base]}
                        </td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_mani} /></td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_guacamole} /></td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_sal_prieta} /></td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_mani_quebrado} /></td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_cocolon} /></td>
                        <td className="px-3 py-3 text-center"><CheckCell on={o.extra_toston} /></td>
                        <td className="px-3 py-3 whitespace-nowrap text-sm" style={{ color: 'var(--muted)' }}>
                          {noFood || !o.bebida || o.bebida === 'ninguna' ? '—' : BEBIDA_LABELS[o.bebida]}
                        </td>
                        <td className="px-3 py-3 text-center"><SauceCell amount={o.sauce_tomate} /></td>
                        <td className="px-3 py-3 text-center"><SauceCell amount={o.sauce_limon} /></td>
                        <td className="px-3 py-3 text-center"><SauceCell amount={o.sauce_mostaza} /></td>
                        <td className="px-3 py-3 text-center"><SauceCell amount={o.sauce_aji} /></td>
                        <td className="px-3 py-3 text-right font-bold" style={{ color: noFood ? 'var(--muted)' : 'var(--success)' }}>
                          {noFood ? '—' : `$${Number(o.total).toFixed(2)}`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t font-black" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
                    <td className="px-4 py-3" colSpan={13}>
                      Total — {realOrders.length} pedido{realOrders.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ color: 'var(--success)' }}>${total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
