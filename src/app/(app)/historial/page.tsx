import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import type { Order } from '@/types'
import { PROTEIN_LABELS, BASE_LABELS } from '@/lib/pricing'

export const revalidate = 60

interface PageProps {
  searchParams: Promise<{ fecha?: string }>
}

export default async function HistorialPage({ searchParams }: PageProps) {
  const { fecha } = await searchParams
  const supabase = await createClient()

  // Fechas distintas con pedidos
  const { data: dates } = await supabase
    .from('orders')
    .select('order_date')
    .order('order_date', { ascending: false })

  const uniqueDates = [...new Set((dates ?? []).map(d => d.order_date))]

  const selectedDate = fecha ?? uniqueDates[0] ?? null

  const { data: dayOrders } = selectedDate
    ? await supabase
        .from('orders')
        .select('*, profile:profiles(display_name)')
        .eq('order_date', selectedDate)
        .order('created_at', { ascending: true }) as { data: Order[] | null }
    : { data: null }

  const orders = dayOrders ?? []
  const realOrders = orders.filter(o => o.protein !== 'no_por_hoy')
  const totalDia = realOrders.reduce((s, o) => s + Number(o.total), 0)
  const pagado = realOrders.filter(o => o.paid).reduce((s, o) => s + Number(o.total), 0)

  function fmtDate(d: string) {
    return new Date(d + 'T12:00:00').toLocaleDateString('es-EC', {
      weekday: 'long', day: 'numeric', month: 'short',
    })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-black">Historial</h1>

      {uniqueDates.length === 0 ? (
        <div className="text-center py-16" style={{ color: 'var(--muted)' }}>
          <p className="text-4xl mb-3">📅</p>
          <p>No hay pedidos anteriores</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-[200px_1fr] gap-4 items-start">
          {/* Sidebar de fechas */}
          <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0">
            {uniqueDates.map(d => (
              <Link key={d} href={`/historial?fecha=${d}`}
                className="shrink-0 px-4 py-2.5 rounded-xl text-sm font-semibold capitalize transition-colors whitespace-nowrap"
                style={selectedDate === d
                  ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                  : { background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                {fmtDate(d)}
              </Link>
            ))}
          </div>

          {/* Detalle del día seleccionado */}
          {selectedDate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-black capitalize">{fmtDate(selectedDate)}</h2>
                <div className="text-sm" style={{ color: 'var(--muted)' }}>
                  {realOrders.length} pedidos · ${totalDia.toFixed(2)}
                </div>
              </div>

              {orders.map(o => {
                const noFood = o.protein === 'no_por_hoy'
                return (
                  <div key={o.id} className="rounded-2xl border p-4"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold">{(o.profile as any)?.display_name ?? 'Usuario'}</span>
                      <div className="flex items-center gap-2">
                        {!noFood && (
                          <span className="font-black" style={{ color: 'var(--success)' }}>${Number(o.total).toFixed(2)}</span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${noFood ? 'bg-gray-100 text-gray-500' : o.paid ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {noFood ? 'No pidió' : o.paid ? 'Pagado' : 'Pendiente'}
                        </span>
                      </div>
                    </div>
                    {!noFood && (
                      <div className="text-sm space-y-1">
                        <p><span className="font-semibold" style={{ color: 'var(--primary)' }}>{PROTEIN_LABELS[o.protein]}</span> · <span style={{ color: 'var(--muted)' }}>{BASE_LABELS[o.base]}</span></p>
                        <div className="flex flex-wrap gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                          {o.extra_mani && <span className="text-blue-600">+Maní</span>}
                          {o.extra_cocolon && <span className="text-blue-600">+Cocolón</span>}
                          {o.extra_guacamole && <span className="text-blue-600">+Guacamole</span>}
                          {o.sauce_tomate !== 'no' && <span>Tomate {o.sauce_tomate}</span>}
                          {o.sauce_limon !== 'no' && <span>Limón {o.sauce_limon}</span>}
                          {o.sauce_mostaza !== 'no' && <span>Mostaza {o.sauce_mostaza}</span>}
                          {o.sauce_aji !== 'no' && <span>Ají {o.sauce_aji}</span>}
                        </div>
                        {o.comentarios && <p className="italic">"{o.comentarios}"</p>}
                      </div>
                    )}
                  </div>
                )
              })}

              {realOrders.length > 0 && (
                <div className="rounded-xl p-3 flex justify-between text-sm font-bold"
                  style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
                  <span>Cobrado / Total</span>
                  <span style={{ color: 'var(--success)' }}>${pagado.toFixed(2)} / ${totalDia.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
