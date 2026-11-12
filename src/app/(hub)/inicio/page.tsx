import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export const revalidate = 0

export default async function InicioPage() {
  const staff = await getStaff()
  const firstName = (staff?.displayName ?? '').split(' ')[0]

  // Eventos de cumpleaños abiertos (si las tablas todavía no existen, simplemente no se muestra el número)
  const supabase = await createClient()
  const { count: openEvents } = await supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'open')

  const modules = [
    {
      href: '/dashboard', icon: '🐟', title: 'Cevichao',
      text: 'Pedir el ceviche del día, ver la tabla y los pagos.',
      badge: undefined as string | undefined,
    },
    {
      href: '/cumple', icon: '🎂', title: 'Pedidos de cumpleaños',
      text: 'Poner qué vas a pedir y ver cuánto te toca pagar.',
      badge: openEvents ? `${openEvents} abierto${openEvents !== 1 ? 's' : ''}` : undefined,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">¡Hola{firstName ? `, ${firstName}` : ''}! 👋</h1>
        <p className="mt-1" style={{ color: 'var(--muted)' }}>¿Qué quieres hacer?</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {modules.map(m => (
          <Link key={m.href} href={m.href}
            className="group relative rounded-3xl border-2 p-6 transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <span className="text-6xl block mb-4" aria-hidden>{m.icon}</span>
            <h2 className="text-xl font-black" style={{ color: 'var(--primary)' }}>{m.title}</h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{m.text}</p>
            {m.badge && <span className="chip chip-warn absolute top-4 right-4">{m.badge}</span>}
          </Link>
        ))}
      </div>
    </div>
  )
}
