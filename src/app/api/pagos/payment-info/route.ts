import { createAdminClient } from '@/lib/supabase/admin'
import { getStaff } from '@/lib/auth'
import { todayDate } from '@/lib/date'
import { sanitizeAccount } from '@/lib/payment'
import { mergeSavedAccount, type SavedAccount } from '@/lib/saved-account'
import { NextResponse } from 'next/server'

const MAX_QR = 400_000 // caracteres del data URL (~300 KB)
const QR_FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

/**
 * Guarda los datos de cobro. Se puede mandar uno o ambos:
 *  - account: { bank, accountType, holder, accountNumber, idNumber }
 *  - qr: string (data URL) = reemplazar, null = quitar
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  // Cobradores y admins siempre; además, quien fue elegido pagador de hoy puede poner SU cuenta
  const admin = createAdminClient()
  const { data: payer } = await admin.from('settings').select('value').eq('key', 'payer').maybeSingle()
  const [payerDate, payerId] = String(payer?.value ?? '').split('|')
  const payerToday = payerDate === todayDate() && payerId ? payerId : null
  if (!staff.canCollect && payerToday !== staff.userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const rows: { key: string; value: string }[] = []

  if ('account' in body) {
    if (body.account === null) rows.push({ key: 'payment_info', value: '' }) // borrar la cuenta
    else {
      const result = sanitizeAccount(body.account)
      if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
      rows.push({ key: 'payment_info', value: JSON.stringify(result.account) })
    }
  }

  if ('qr' in body) {
    if (body.qr === null) rows.push({ key: 'payment_qr', value: '' })
    else if (typeof body.qr === 'string' && body.qr.length <= MAX_QR && QR_FORMAT.test(body.qr)) {
      rows.push({ key: 'payment_qr', value: body.qr })
    } else {
      return NextResponse.json({ error: 'El QR debe ser una imagen PNG, JPG o WEBP pequeña' }, { status: 400 })
    }
  }

  if (rows.length === 0) return NextResponse.json({ error: 'No hay nada que guardar' }, { status: 400 })

  const { error } = await admin.from('settings').upsert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // También se guarda en la cuenta de quien paga hoy, para que la próxima vez que pague no la escriba de nuevo
  if (payerToday) {
    const patch: Partial<SavedAccount> = {}
    for (const r of rows) patch[r.key === 'payment_info' ? 'info' : 'qr'] = r.value
    await mergeSavedAccount(payerToday, patch)
  }

  return NextResponse.json({ ok: true })
}
