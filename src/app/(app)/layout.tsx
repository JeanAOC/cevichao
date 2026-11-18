import { redirect } from 'next/navigation'
import Navbar, { type NavItem } from '@/components/Navbar'
import { getStaff } from '@/lib/auth'
import AutoRefresh from '@/components/AutoRefresh'
import PayerAccountModal from '@/components/PayerAccountModal'
import { createAdminClient } from '@/lib/supabase/admin'
import { todayDate } from '@/lib/date'

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

  // ¿Hoy me eligieron pagador y todavía no hay cuenta ni QR? Entonces se me avisa para que ponga la mía.
  const { data: payRows } = await createAdminClient().from('settings').select('key, value').in('key', ['payer', 'payment_info', 'payment_qr'])
  const s: Record<string, string> = Object.fromEntries((payRows ?? []).map(r => [r.key, String(r.value ?? '')]))
  const [payerDate, payerId] = (s.payer ?? '').split('|')
  const needsAccount = payerDate === todayDate() && payerId === staff.userId && !s.payment_info && !s.payment_qr

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={staff.displayName} brand={{ icon: '🐟', name: 'Cevichao' }}
        items={staff.canCollect ? [...NAV, PAGOS] : NAV} />
      <AutoRefresh />
      {needsAccount && (
        <PayerAccountModal href="/mi-pedido#cuenta" hideOnPath="/mi-pedido"
          text="Hoy te eligieron para pagar la cuenta. Pon tu cuenta (o tu QR) para que los demás sepan dónde depositarte." />
      )}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
