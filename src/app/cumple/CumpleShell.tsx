import Navbar, { type NavItem } from '@/components/Navbar'

/**
 * Marco del módulo de cumpleaños: barra superior (con las secciones del evento, igual que Cevichao) + contenido.
 * Lo pone cada página, porque las secciones dependen del evento y de quién eres (organizador, pagador…).
 */
export default function CumpleShell({ displayName, items, children }: {
  displayName: string
  items: NavItem[]
  children: React.ReactNode
}) {
  // Con más de una sección aparece la barra inferior en celular: se deja espacio para que no tape nada
  const multi = items.length > 1
  return (
    <div className={`min-h-screen ${multi ? 'pb-20 sm:pb-0' : ''}`}>
      <Navbar displayName={displayName} brand={{ icon: '🎂', name: 'Cumpleaños' }} items={items} />
      <main className={`max-w-5xl mx-auto px-4 sm:px-6 pt-9 ${multi ? 'pb-24 sm:pb-8' : 'pb-10'}`}>
        {children}
      </main>
    </div>
  )
}
