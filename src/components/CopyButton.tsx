'use client'

import { useState } from 'react'

export default function CopyButton({ text, label = 'Copiar' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* sin permiso de portapapeles: no hacemos nada */ }
  }

  return (
    <button type="button" onClick={copy}
      className="text-xs px-3 py-1.5 rounded-lg font-bold border shrink-0"
      style={copied
        ? { borderColor: 'var(--success)', color: 'var(--success)' }
        : { borderColor: 'var(--primary)', color: 'var(--primary)' }}>
      {copied ? 'Copiado ✓' : label}
    </button>
  )
}
