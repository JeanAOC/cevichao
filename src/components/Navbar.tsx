'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface NavItem {
  href: string
  label: string
  icon: string
  /** Mini aviso junto al nombre (por ejemplo «!» o una cantidad pendiente). */
  badge?: string
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
  const searchParams = useSearchParams()
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

  // Un solo enlace activo. Los enlaces pueden llevar ?tab= (por ejemplo /cumple/123?tab=resumen):
  // gana el que coincide con la pestaña de la URL; si ninguno coincide, el que no lleva ?tab= (la pestaña por defecto).
  const tabParam = searchParams.get('tab')
  const parts = (href: string) => {
    const [path, query = ''] = href.split('?')
    return { path, tab: new URLSearchParams(query).get('tab') }
  }
  // Si varios coinciden (por ejemplo /cevichocho y /cevichocho/pedir), gana la ruta más específica
  const onPath = items.filter(i => {
    const { path } = parts(i.href)
    return pathname === path || pathname.startsWith(`${path}/`)
  }).sort((a, b) => parts(b.href).path.length - parts(a.href).path.length)
  const activeHref = (
    onPath.find(i => parts(i.href).tab !== null && parts(i.href).tab === tabParam)
    ?? onPath.find(i => parts(i.href).tab === null)
    ?? onPath[0]
  )?.href
  const isActive = (href: string) => href === activeHref
  // Con un solo destino no hace falta menú: el nombre del módulo ya lo dice todo
  const showNav = items.length > 1

  return (
    <>
      {/* Barra superior, con toldo de puesto de ceviche */}
      <header className="sticky top-0 z-40 relative border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-2 min-[400px]:gap-4 sm:gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xl" aria-hidden>{brand.icon}</span>
            <span className="font-display font-extrabold text-lg" style={{ color: 'var(--primary)' }}>{brand.name}</span>
          </div>

          {/* Enlaces — escritorio */}
          {showNav && (
            <nav className="hidden sm:flex items-center gap-1 flex-1" aria-label="Secciones">
              {items.map(({ href, label, badge }) => {
                const active = isActive(href)
                return (
                  <Link key={href} href={href}
                    aria-current={active ? 'page' : undefined}
                    className="px-4 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors inline-flex items-center gap-1.5"
                    style={active
                      ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
                      : { color: 'var(--muted)' }}>
                    {label}
                    {badge && (
                      <span className="text-xs px-1.5 rounded-full font-black"
                        style={active
                          ? { background: 'rgb(255 255 255 / 0.25)', color: 'var(--primary-fg)' }
                          : { background: 'color-mix(in srgb, var(--accent) 18%, var(--card))', color: 'var(--accent)' }}>
                        {badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>
          )}

          <div className="flex items-center gap-2 ml-auto shrink-0">
            {showModules && (
              <Link href="/inicio" title="Cambiar de módulo" aria-label="Cambiar de módulo"
                className="h-10 inline-flex items-center text-xs font-bold px-3 rounded-lg border transition-colors"
                style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                ⇄<span className="ml-1 max-[359px]:hidden">Módulos</span>
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
            {items.map(({ href, label, icon, badge }) => {
              const active = isActive(href)
              return (
                <Link key={href} href={href}
                  aria-current={active ? 'page' : undefined}
                  className="flex-1 min-w-0 flex flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors"
                  style={{ color: active ? 'var(--primary)' : 'var(--muted)' }}>
                  <span className="relative text-lg leading-none px-3 py-0.5 rounded-full"
                    style={active ? { background: 'color-mix(in srgb, var(--primary) 14%, transparent)' } : undefined}>
                    {icon}
                    {badge && (
                      <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 font-black text-center"
                        style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>
                        {badge}
                      </span>
                    )}
                  </span>
                  <span className="truncate max-w-full px-0.5">{label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      )}
    </>
  )
}
