import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('display_name, is_admin').eq('id', user.id).single()

  return (
    <div className="min-h-screen pb-20 sm:pb-0">
      <Navbar displayName={profile?.display_name ?? 'Usuario'} isAdmin={!!profile?.is_admin} />
      <main className="max-w-4xl mx-auto px-6 py-6 pb-24 sm:pb-8">
        {children}
      </main>
    </div>
  )
}
