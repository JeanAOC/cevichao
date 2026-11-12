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
  // Con un solo destino no hace falta menú: el nombre del módulo ya lo dice todo
  const showNav = items.length > 1

  return (
    <>
      {/* Barra superior, con toldo de puesto de ceviche */}
      <header className="sticky top-0 z-40 relative border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl" aria-hidden>{brand.icon}</span>
            <span className="font-display font-extrabold text-lg" style={{ color: 'var(--primary)' }}>{brand.name}</span>
          </div>

          {/* Enlaces — escritorio */}
          {showNav && (
            <nav className="hidden sm:flex items-center gap-1 flex-1" aria-label="Secciones">
              {items.map(({ href, label }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    aria-current={active ? 'page' : undefined}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors"
                    style={active
                      ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                      : { color: 'var(--muted)' }}>
                    {label}
                  </Link>
                )
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {showModules && (
              <Link href="/inicio" title="Cambiar de módulo"
                className="h-10 inline-flex items-center text-xs font-bold px-3 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                ⇄<span className="ml-1">Módulos</span>
              </Link>
            )}
            <span className="text-sm font-semibold hidden md:block">{displayName}</span>
            <button onClick={toggleTheme}
              className="w-10 h-10 rounded-lg flex items-center justify-center text-base border transition-colors"
              style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}
              aria-label={dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={dark ? 'Modo claro' : 'Modo oscuro'}>
              {dark ? '☀️' : '🌙'}
            </button>
            <button onClick={logout}
              className="h-10 text-xs font-bold px-3 rounded-lg transition-colors"
              style={{ color: 'var(--muted)' }}>
              Salir
            </button>
          </div>
        </div>
        <div className="awning absolute left-0 right-0 top-full" aria-hidden />
      </header>

      {/* Barra inferior — solo celular */}
      {showNav && (
        <nav aria-label="Secciones" className="fixed bottom-0 left-0 right-0 z-40 border-t sm:hidden pb-[env(safe-area-inset-bottom)]"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
          <div className="flex h-14">
            {items.map(({ href, label, icon }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors"
                  style={{ color: active ? 'var(--primary)' : 'var(--muted)' }}>
                  <span className="text-lg leading-none px-3 py-0.5 rounded-full"
                    style={active ? { background: 'color-mix(in srgb, var(--primary) 14%, transparent)' } : undefined}>
                    {icon}
                  </span>
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
