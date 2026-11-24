import type { Metadata } from 'next'
import { Bricolage_Grotesque, Figtree } from 'next/font/google'
import './globals.css'
import { createAdminClient } from '@/lib/supabase/admin'
import { xmasEnabled } from '@/lib/xmas'

// Títulos con carácter + texto amable y legible. Se alojan solas (sin pedir nada a Google en el navegador).
const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
const body = Figtree({ subsets: ['latin'], variable: '--font-body', display: 'swap' })

export const metadata: Metadata = {
  title: 'Pedidos',
  description: 'Pedidos de ceviche y cuentas de cumpleaños del equipo',
}

// El modo navideño lo decide un admin y se lee en cada visita
export const dynamic = 'force-dynamic'

async function xmasOn(): Promise<boolean> {
  try {
    const { data } = await createAdminClient().from('settings').select('value').eq('key', 'xmas').maybeSingle()
    return xmasEnabled(data?.value)
  } catch { return xmasEnabled(null) }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const xmas = await xmasOn()
  return (
    <html lang="es" className={`${display.variable} ${body.variable}`} data-xmas={xmas ? '1' : undefined} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            var t = localStorage.getItem('theme');
            if (t) document.documentElement.setAttribute('data-theme', t);
          } catch(e) {}
        ` }} />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
