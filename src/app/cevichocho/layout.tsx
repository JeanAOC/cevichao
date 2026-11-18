import { redirect } from 'next/navigation'
import Navbar, { type NavItem } from '@/components/Navbar'
import { getStaff } from '@/lib/auth'
import AutoRefresh from '@/components/AutoRefresh'
import PayerAccountModal from '@/components/PayerAccountModal'
import { CHOCHO_KEYS } from '@/lib/chocho'
import { loadChochoSettings } from '@/lib/chocho-server'
import { todayDate } from '@/lib/date'

const NAV: NavItem[] = [
  { href: '/cevichocho', label: 'Menú', icon: '📖' },
  { href: '/cevichocho/pedir', label: 'Pedir', icon: '🥣' },
  { href: '/cevichocho/mi-pedido', label: 'Mi pedido', icon: '🧾' },
  { href: '/cevichocho/tabla', label: 'Tabla', icon: '📋' },
]
const PAGOS: NavItem = { href: '/cevichocho/pagos', label: 'Pagos', icon: '💰' }

export default async function CevichochoLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')

  // ¿Hoy me eligieron pagador y todavía no hay cuenta ni QR? Entonces se me avisa para que ponga la mía.
  const s = await loadChochoSettings()
  const [payerDate, payerId] = (s[CHOCHO_KEYS.payer] ?? '').split('|')
  const needsAccount = payerDate === todayDate() && payerId === staff.userId && !s[CHOCHO_KEYS.info] && !s[CHOCHO_KEYS.qr]

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={staff.displayName} brand={{ icon: '🥣', name: 'Cevichocho' }}
        items={staff.canCollect ? [...NAV, PAGOS] : NAV} />
      <AutoRefresh />
      {needsAccount && (
        <PayerAccountModal href="/cevichocho/mi-pedido#cuenta" hideOnPath="/cevichocho/mi-pedido"
          text="Hoy te eligieron para pagar la cuenta. Pon tu cuenta (o tu QR) para que los demás sepan dónde depositarte." />
      )}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
