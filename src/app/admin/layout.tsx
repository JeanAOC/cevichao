import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('is_admin, display_name').eq('id', user.id).single()
  if (!profile?.is_admin) redirect('/')

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard"
              className="text-sm font-semibold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
              ← App
            </Link>
            <span className="font-black text-lg" style={{ color: 'var(--accent)' }}>Admin 🔧</span>
          </div>
          <span className="text-sm font-semibold">{profile.display_name}</span>
        </div>
      </header>
      {children}
    </div>
  )
}
