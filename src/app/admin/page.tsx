import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadMenu } from '@/lib/menu-server'
import { MENU_KINDS, itemsOf, labelOf } from '@/lib/menu'
import { bebidasLabel, extrasOf } from '@/lib/pricing'
import { todayDate } from '@/lib/date'
import type { Order } from '@/types'
import TabNav from '@/components/TabNav'
import DeleteOrderButton from './DeleteOrderButton'
import MenuEditor from './MenuEditor'

export const revalidate = 0

const TABS = [
  { id: 'pedidos', label: 'Pedidos', icon: '📝' },
  ...MENU_KINDS.map(k => ({ id: k.kind, label: k.label, icon: k.icon })),
]

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')
  if (!staff.isAdmin) redirect('/dashboard')

  const { tab: rawTab } = await searchParams
  const tab = TABS.some(t => t.id === rawTab) ? (rawTab as string) : 'pedidos'
  const kindInfo = MENU_KINDS.find(k => k.kind === tab)

  const menu = await loadMenu()
  const admin = createAdminClient()
  const today = todayDate()

  const { data: orders } = await admin.from('orders').select('*, profile:profiles(display_name)')
    .eq('order_date', today).order('created_at', { ascending: true }) as unknown as { data: Order[] | null }
  const all = orders ?? []
  const real = all.filter(o => o.protein !== 'no_por_hoy')

  const rawLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
  const dateLabel = rawLabel.charAt(0).toUpperCase() + rawLabel.slice(1)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-extrabold">Administrar</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Menú, precios y pedidos</p>
      </div>

      <TabNav ariaLabel="Secciones de administración" basePath="/admin" defaultTab="pedidos" active={tab}
        tabs={TABS.map(t => ({ ...t, badge: t.id === 'pedidos' && real.length > 0 ? String(real.length) : undefined }))} />

      {/* Pedidos */}
      {tab === 'pedidos' && (
        <section className="space-y-3">
          <p className="text-xs font-bold tracking-wide px-1" style={{ color: 'var(--muted)' }}>
            {dateLabel.toUpperCase()} — {real.length} {real.length === 1 ? 'PERSONA' : 'PERSONAS'}
          </p>
          {all.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
              No hay pedidos todavía
            </div>
          ) : (
            all.map(o => {
              const noFood = o.protein === 'no_por_hoy'
              const name = o.profile?.display_name ?? 'Usuario'
              const extras = extrasOf(o).map(([k, n]) => `${n > 1 ? `${n} × ` : ''}${labelOf(menu, 'extra', k)}`)
              const bebidas = bebidasLabel(menu, o)
              return (
                <div key={o.id} className="rounded-2xl border p-4 shadow-card flex items-center gap-3" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
                  <div className="flex-1 min-w-0">
                    <div className="min-w-0">
                      <p className="font-extrabold font-display text-lg leading-tight">{name}</p>
                      {noFood ? (
                        <p className="text-sm" style={{ color: 'var(--muted)' }}>No pide hoy</p>
                      ) : (
                        <>
                          <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                            {labelOf(menu, 'protein', o.protein)}
                            <span style={{ color: 'var(--muted)' }}> · {labelOf(menu, 'base', o.base)}</span>
                          </p>
                          {(extras.length > 0 || bebidas) && (
                            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                              {[...extras, bebidas && `🥤 ${bebidas}`].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!noFood && <p className="font-extrabold font-display text-lg mt-0.5" style={{ color: 'var(--accent)' }}>${Number(o.total).toFixed(2)}</p>}
                  </div>
                  {/* Editar y Eliminar a un lado: la tarjeta mide la mitad y «Eliminar» ya no está pegado a «Editar» */}
                  <div className="flex flex-col items-stretch gap-1 shrink-0">
                    <Link href={`/admin/editar/${o.id}`} className="text-sm px-4 min-h-11 inline-flex items-center justify-center rounded-lg font-bold border"
                      style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                      Editar
                    </Link>
                    <DeleteOrderButton orderId={o.id} />
                  </div>
                </div>
              )
            })
          )}
        </section>
      )}

      {/* Menú: una pestaña por tipo */}
      {kindInfo && (
        <section className="space-y-3">
          <div>
            <h2 className="font-extrabold text-2xl">{kindInfo.icon} {kindInfo.label}</h2>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Los cambios de precio valen para los pedidos nuevos; los ya hechos conservan su total.
              «Ocultar» quita la opción del menú sin borrar los pedidos que ya la usaron.
            </p>
          </div>

          {!menu.fromDb ? (
            <div className="rounded-2xl border p-5 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--card))', borderColor: 'var(--accent)' }}>
              <p className="font-black">Falta activar el menú editable</p>
              <p className="text-sm">
                Ejecuta una vez el archivo <code className="font-bold">migrations/2026-11-13-menu-editable.sql</code> en
                Supabase → SQL Editor y recarga esta página. Mientras tanto la app usa los precios de siempre.
              </p>
            </div>
          ) : (
            <MenuEditor key={kindInfo.kind} kind={kindInfo.kind} singular={kindInfo.singular}
              items={itemsOf(menu, kindInfo.kind, false)} />
          )}
        </section>
      )}
    </div>
  )
}
