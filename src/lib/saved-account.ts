import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Cuenta de cobro guardada POR PERSONA (en `settings`, clave `acct:<userId>`), para que quien paga seguido
 * no tenga que escribirla cada vez. Sirve en los tres módulos: si hoy paga Jeremy y mañana Gabriela,
 * al volver Jeremy su cuenta se pone sola. `info` es el JSON de la cuenta y `qr` el data URL (o vacío).
 */
export interface SavedAccount { info: string; qr: string }

const key = (userId: string) => `acct:${userId}`

export async function getSavedAccount(userId: string): Promise<SavedAccount> {
  const { data } = await createAdminClient().from('settings').select('value').eq('key', key(userId)).maybeSingle()
  try {
    const v = JSON.parse(String(data?.value ?? ''))
    return { info: typeof v.info === 'string' ? v.info : '', qr: typeof v.qr === 'string' ? v.qr : '' }
  } catch {
    return { info: '', qr: '' }
  }
}

/** Actualiza solo lo que venga en `patch` (cuenta y/o QR) de la cuenta guardada de esa persona. */
export async function mergeSavedAccount(userId: string, patch: Partial<SavedAccount>): Promise<void> {
  const cur = await getSavedAccount(userId)
  await createAdminClient().from('settings').upsert({ key: key(userId), value: JSON.stringify({ ...cur, ...patch }) })
}

/**
 * Qué cuenta debe quedar al cambiar de pagador. Devuelve null si no hay que cambiar nada.
 *  - Cambió de una persona a otra: queda la guardada de la nueva (o ninguna), porque la actual era de la anterior.
 *  - Es la misma persona, o no había pagador: se respeta lo que hay y solo se rellena si está vacío.
 */
export function nextPayerAccount(
  current: SavedAccount, prevId: string | null | undefined, newId: string, saved: SavedAccount,
): SavedAccount | null {
  if (prevId && prevId !== newId) return saved
  if (!current.info && !current.qr && (saved.info || saved.qr)) return saved
  return null
}
