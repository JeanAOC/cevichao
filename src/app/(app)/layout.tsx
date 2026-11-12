import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getStaff } from '@/lib/auth'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={staff.displayName} canCollect={staff.canCollect} />
      <main className="max-w-4xl mx-auto px-6 py-6 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
