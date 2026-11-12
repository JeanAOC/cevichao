'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const MAX_SIDE = 480 // px: un QR se lee bien a este tamaño y pesa poco

/** Lee una imagen y la reduce a un PNG (data URL) de máximo MAX_SIDE px. */
function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')) }
    img.src = url
  })
}

interface Props {
  initialQr: string
  /** Dónde se guarda. Por defecto, los datos de cobro de Cevichao. */
  endpoint?: string
  /** Campos extra para el cuerpo de la petición (por ejemplo { action: 'savePayment', eventId }). */
  extra?: Record<string, unknown>
}

export default function QrForm({ initialQr, endpoint = '/api/pagos/payment-info', extra }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  // undefined = sin cambios, null = quitar, string = nuevo QR (todavía sin guardar)
  const [qr, setQr] = useState<string | null | undefined>(undefined)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const shown = qr === undefined ? initialQr : qr

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setQr(await resizeToDataUrl(file))
      setMessage(null)
    } catch {
      setMessage({ ok: false, text: 'No se pudo leer esa imagen' })
    }
  }

  async function save() {
    if (qr === undefined) return
    setSaving(true)
    setMessage(null)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...extra, qr }),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setMessage({ ok: false, text: data.error ?? 'No se pudo guardar' })
      return
    }
    setQr(undefined)
    setMessage({ ok: true, text: 'Guardado ✓' })
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="QR de pago" className="w-36 h-36 rounded-xl border object-contain bg-white shrink-0" style={{ borderColor: 'var(--border)' }} />
        ) : (
          <div className="w-36 h-36 rounded-xl border-2 border-dashed flex items-center justify-center text-sm text-center px-3 shrink-0"
            style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Sin QR
          </div>
        )}
        <div className="flex flex-col gap-2 min-w-0">
          <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} className="hidden" />
          <button type="button" onClick={() => fileRef.current?.click()}
            className="px-4 py-3 rounded-xl text-sm font-bold border"
            style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
            {shown ? 'Cambiar QR' : 'Subir QR'}
          </button>
          {shown && (
            <button type="button" onClick={() => setQr(null)}
              className="px-4 py-3 rounded-xl text-sm font-bold border"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Quitar
            </button>
          )}
        </div>
      </div>

      {message && (
        <p className="text-sm font-semibold" style={{ color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>
      )}

      <button onClick={save} disabled={saving || qr === undefined}
        className="w-full py-3 rounded-xl font-bold text-sm disabled:opacity-50"
        style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        {saving ? 'Guardando…' : 'Guardar QR'}
      </button>
    </div>
  )
}
