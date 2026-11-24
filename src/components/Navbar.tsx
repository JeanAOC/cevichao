'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { pickActiveHref } from '@/lib/nav'
import SectionNav from '@/components/SectionNav'

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
  /**
   * Las secciones van en un menú lateral siempre abierto (lo pone el marco de la página, ver CumpleShell);
   * aquí solo queda el botón ☰ que lo abre en el celular.
   */
  sideMenu?: boolean
  /** Con menú lateral: el botón ☰ llama a esto en pantallas grandes (abrir/cerrar el menú). En el celular abre el cajón. */
  onToggleMenu?: () => void
}

export default function Navbar({ displayName, items, brand, showModules = true, sideMenu = false, onToggleMenu }: NavbarProps) {
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

  // Un solo enlace activo (ver pickActiveHref)
  const activeHref = pickActiveHref(items, pathname, searchParams.get('tab'))
  const isActive = (href: string) => href === activeHref
  // Con un solo destino no hace falta menú: el nombre del módulo ya lo dice todo
  const hasMany = items.length > 1
  // Con menú lateral las secciones no van arriba ni abajo: en el celular se abren con el botón ☰
  const showNav = hasMany && !sideMenu
  const [drawer, setDrawer] = useState(false)

  return (
    <>
      {/* Barra superior, con toldo de puesto de ceviche */}
      <header className="sticky top-0 z-40 relative border-b" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        {/* Con menú lateral la barra ocupa todo el ancho, para que el ☰ quede arriba del menú, a la izquierda */}
        <div className={`${sideMenu && hasMany ? '' : 'max-w-5xl mx-auto'} px-4 sm:px-6 h-14 flex items-center gap-2 min-[400px]:gap-4 sm:gap-6`}>
          {sideMenu && hasMany && (
            <button type="button" aria-label="Abrir o cerrar el menú"
              onClick={() => (window.matchMedia('(min-width: 640px)').matches ? onToggleMenu?.() : setDrawer(true))}
              className="-ml-1 w-11 h-11 rounded-lg border flex items-center justify-center text-xl shrink-0"
              style={{ borderColor: 'var(--border)', color: 'var(--primary)' }}>
              ☰
            </button>
          )}
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

      {/* Cajón del menú — solo celular, con menú lateral */}
      {sideMenu && hasMany && drawer && (
        <div className="fixed inset-0 z-50 sm:hidden" style={{ background: 'rgb(0 0 0 / 0.5)' }} onClick={() => setDrawer(false)}>
          <div role="dialog" aria-modal="true" aria-label="Menú" onClick={e => e.stopPropagation()}
            className="h-full w-72 max-w-[85%] p-4 space-y-3 overflow-y-auto border-r"
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between">
              <span className="font-display font-extrabold text-lg" style={{ color: 'var(--primary)' }}>{brand.icon} {brand.name}</span>
              <button type="button" onClick={() => setDrawer(false)} aria-label="Cerrar el menú"
                className="w-11 h-11 rounded-lg text-lg" style={{ color: 'var(--muted)' }}>✕</button>
            </div>
            <SectionNav items={items} onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

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
