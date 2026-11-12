import { createAdminClient } from '@/lib/supabase/admin'
import { requireCollector } from '@/lib/auth'
import { sanitizeAccount } from '@/lib/payment'
import { NextResponse } from 'next/server'

const MAX_QR = 400_000 // caracteres del data URL (~300 KB)
const QR_FORMAT = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/

/**
 * Guarda los datos de cobro. Se puede mandar uno o ambos:
 *  - account: { bank, accountType, holder, accountNumber, idNumber }
 *  - qr: string (data URL) = reemplazar, null = quitar
 */
export async function POST(req: Request) {
  const auth = await requireCollector()
  if ('error' in auth) return auth.error

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const rows: { key: string; value: string }[] = []

  if ('account' in body) {
    const result = sanitizeAccount(body.account)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })
    rows.push({ key: 'payment_info', value: JSON.stringify(result.account) })
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

  const admin = createAdminClient()
  const { error } = await admin.from('settings').upsert(rows)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
