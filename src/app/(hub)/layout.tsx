import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getStaff } from '@/lib/auth'

export default async function HubLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')

  return (
    <div className="min-h-screen">
      <Navbar displayName={staff.displayName} brand={{ icon: '📋', name: 'Pedidos' }} items={[]} showModules={false} />
      <main className="max-w-4xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
