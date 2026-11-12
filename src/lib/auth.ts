import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export interface Staff {
  userId: string
  displayName: string
  isAdmin: boolean
  /** Puede entrar a Pagos (cobrar, cerrar pedidos). Los admins también. */
  canCollect: boolean
  /** Puede crear y manejar eventos de cumpleaños. Los admins también. */
  canOrganize: boolean
}

/** Usuario actual con sus permisos, o null si no hay sesión. */
export async function getStaff(): Promise<Staff | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // select('*'): tolera que las columnas de permisos todavía no existan en la base
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const isAdmin = !!profile?.is_admin
  return {
    userId: user.id,
    displayName: profile?.display_name ?? 'Usuario',
    isAdmin,
    canCollect: isAdmin || !!profile?.can_collect,
    canOrganize: isAdmin || !!profile?.can_organize,
  }
}

/** Para rutas API de cobro: devuelve { error } con la respuesta HTTP, o { staff } si tiene permiso. */
export async function requireCollector(): Promise<{ error: NextResponse } | { staff: Staff }> {
  const staff = await getStaff()
  if (!staff) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!staff.canCollect) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { staff }
}

/** Para rutas API de eventos de cumpleaños: solo organizadores y admins. */
export async function requireOrganizer(): Promise<{ error: NextResponse } | { staff: Staff }> {
  const staff = await getStaff()
  if (!staff) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  if (!staff.canOrganize) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { staff }
}
