'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NavItem {
  href: string
  label: string
  icon: string
}

interface NavbarProps {
  displayName: string
  items: NavItem[]
  brand: { icon: string; name: string }
  /** Muestra el botón para volver a la pantalla de módulos (/inicio). */
  showModules?: boolean
}

export default function Navbar({ displayName, items, brand, showModules = true }: NavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored === 'dark') setDark(true)
    else if (stored === 'light') setDark(false)
    else setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
  }, [])

  function toggleTheme() {
    const next = !dark
    setDark(next)
    const val = next ? 'dark' : 'light'
    localStorage.setItem('theme', val)
    document.documentElement.setAttribute('data-theme', val)
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`)

  return (
    <>
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl">{brand.icon}</span>
            <span className="font-black text-lg" style={{ color: 'var(--primary)' }}>{brand.name}</span>
          </div>

          {/* Nav links — desktop */}
          <nav className="hidden sm:flex items-center gap-1 flex-1">
            {items.map(({ href, label }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
                  style={active
                    ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                    : { color: 'var(--muted)' }}>
                  {label}
                </Link>
              )
            })}
          </nav>

          {/* Right: módulos + name + theme + salir */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {showModules && (
              <Link href="/inicio" title="Cambiar de módulo"
                className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                ⇄<span className="hidden sm:inline"> Módulos</span>
              </Link>
            )}
            <span className="text-sm font-medium hidden sm:block">{displayName}</span>
            <button onClick={toggleTheme}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-base border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              title={dark ? 'Modo claro' : 'Modo oscuro'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={logout}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Bottom nav — mobile only */}
      {items.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 border-t sm:hidden"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex">
            {items.map(({ href, label, icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  className="flex-1 flex flex-col items-center py-2 gap-0.5 text-xs font-medium transition-colors"
                  style={{ color: active ? 'var(--primary)' : 'var(--muted)' }}>
                  <span className="text-lg leading-none">{icon}</span>
                  {label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}
