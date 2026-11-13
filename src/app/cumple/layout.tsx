import { redirect } from 'next/navigation'
import { getStaff } from '@/lib/auth'

// Solo protege el módulo. La barra superior la pone cada página con <CumpleShell>,
// porque las secciones de un evento cambian según el evento y la persona.
export default async function CumpleLayout({ children }: { children: React.ReactNode }) {
  const staff = await getStaff()
  if (!staff) redirect('/login')
  return <>{children}</>
}
