import { redirect } from 'next/navigation'
import Navbar, { type NavItem } from '@/components/Navbar'
import { getStaff } from '@/lib/auth'

const NAV: NavItem[] = [
  { href: '/admin', label: 'Admin', icon: '🔧' },
  { href: '/pagos', label: 'Pagos', icon: '💰' },
  { href: '/dashboard', label: 'Cevichao', icon: '🐟' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')
  if (!staff.isAdmin) redirect('/')

  // Misma barra que el resto de la app: antes aquí no había forma de salir, cambiar de módulo ni volver a Cevichao
  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={staff.displayName} brand={{ icon: '🔧', name: 'Admin' }} items={NAV} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-24 sm:pb-10">
        {children}
      </main>
    </div>
  )
}
