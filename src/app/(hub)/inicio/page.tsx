import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadMenu } from '@/lib/menu-server'
import { labelOf } from '@/lib/menu'
import { todayDate } from '@/lib/date'

export const revalidate = 0

export default async function InicioPage() {
  const staff = await getStaff()
  const firstName = (staff?.displayName ?? '').split(' ')[0]
  const supabase = await createClient()
  const today = todayDate()

  // Eventos de cumpleaños abiertos y mi pedido de hoy (si algo falla, la tarjeta simplemente no muestra ese dato)
  const [{ count: openEvents }, { data: myOrder }, menu] = await Promise.all([
    supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'open'),
    staff
      ? supabase.from('orders').select('protein, total, paid').eq('user_id', staff.userId).eq('order_date', today).maybeSingle()
      : Promise.resolve({ data: null }),
    loadMenu(),
  ])

  const noFood = myOrder?.protein === 'no_por_hoy'
  const cevichaoStatus = !myOrder
    ? 'Todavía no pides hoy'
    : noFood
      ? 'Hoy no pides'
      : `Hoy: ${labelOf(menu, 'protein', myOrder.protein)} · $${Number(myOrder.total).toFixed(2)}${myOrder.paid ? ' · pagado ✓' : ''}`

  // Mi pedido de hoy en Cevichocho (si la tabla todavía no existe, simplemente no hay dato)
  const { data: chochoOrder } = staff
    ? await createAdminClient().from('chocho_orders').select('total, paid').eq('user_id', staff.userId).eq('order_date', today).maybeSingle()
    : { data: null }
  const chochoStatus = !chochoOrder
    ? 'Todavía no pides hoy'
    : `Hoy: $${Number(chochoOrder.total).toFixed(2)}${chochoOrder.paid ? ' · pagado ✓' : ''}`

  const dateLabel = new Date(today + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })

  const modules = [
    {
      href: '/dashboard', icon: '🐟', title: 'Cevichao',
      text: 'Pedir el ceviche del día, ver la tabla y los pagos.',
      status: cevichaoStatus,
      bg: 'var(--primary)', fg: 'var(--primary-fg)', cta: myOrder ? 'Ver mi pedido →' : 'Pedir ahora →',
    },
    {
      href: '/cevichocho', icon: '🥣', title: 'Cevichocho',
      text: 'Pedir tu cevichocho, ver la tabla del día y los pagos.',
      status: chochoStatus,
      bg: 'var(--sun)', fg: 'var(--sun-fg)', cta: chochoOrder ? 'Ver mi pedido →' : 'Pedir ahora →',
    },
    {
      href: '/cumple', icon: '🎂', title: 'Cumpleaños',
      text: 'Poner qué vas a pedir y ver cuánto te toca pagar.',
      status: openEvents ? `${openEvents} evento${openEvents !== 1 ? 's' : ''} abierto${openEvents !== 1 ? 's' : ''}` : 'Sin eventos abiertos',
      bg: 'var(--accent)', fg: 'var(--accent-fg)', cta: 'Ver eventos →',
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
          {dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}
        </p>
        <h1 className="text-4xl sm:text-5xl font-extrabold mt-1">
          ¡Hola{firstName ? `, ${firstName}` : ''}!
        </h1>
        <p className="mt-2 text-lg" style={{ color: 'var(--muted)' }}>¿Qué vamos a hacer hoy?</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href}
            className="press group relative overflow-hidden rounded-3xl p-6 min-h-56 flex flex-col justify-end shadow-card transition-transform hover:-translate-y-1"
            style={{ background: m.bg, color: m.fg }}>
            {/* Emoji gigante de fondo, como sello de la carta */}
            <span className="absolute -right-3 -top-4 text-[9rem] leading-none opacity-20 -rotate-12 select-none" aria-hidden>{m.icon}</span>
            <span className="text-5xl mb-3 relative" aria-hidden>{m.icon}</span>
            <h2 className="text-3xl font-extrabold relative">{m.title}</h2>
            <p className="text-sm mt-1 opacity-90 relative">{m.text}</p>
            <div className="mt-4 pt-3 flex items-center justify-between gap-3 relative border-t border-dashed" style={{ borderColor: 'color-mix(in srgb, currentColor 45%, transparent)' }}>
              <span className="text-sm font-bold">{m.status}</span>
              <span className="text-sm font-extrabold shrink-0 group-hover:translate-x-1 transition-transform">{m.cta}</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
