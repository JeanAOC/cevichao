import { redirect } from 'next/navigation'
import Navbar, { type NavItem } from '@/components/Navbar'
import { getStaff } from '@/lib/auth'

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Menú', icon: '📖' },
  { href: '/pedir', label: 'Pedir', icon: '🐟' },
  { href: '/mi-pedido', label: 'Mi pedido', icon: '🧾' },
  { href: '/tabla', label: 'Tabla', icon: '📋' },
  { href: '/historial', label: 'Historial', icon: '📅' },
]
const PAGOS: NavItem = { href: '/pagos', label: 'Pagos', icon: '💰' }

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={staff.displayName} brand={{ icon: '🐟', name: 'Cevichao' }}
        items={staff.canCollect ? [...NAV, PAGOS] : NAV} />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
