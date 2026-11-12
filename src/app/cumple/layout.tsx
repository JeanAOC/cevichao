import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getStaff } from '@/lib/auth'

export default async function CumpleLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')

  // Un solo destino: no hay barra de secciones, el módulo se vuelve a elegir con «⇄ Módulos»
  return (
    <div className="min-h-screen">
      <Navbar displayName={staff.displayName} brand={{ icon: '🎂', name: 'Cumpleaños' }}
        items={[{ href: '/cumple', label: 'Eventos', icon: '🎂' }]} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-10">
        {children}
      </main>
    </div>
  )
}
