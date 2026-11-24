'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { pickActiveHref } from '@/lib/nav'
import type { NavItem } from '@/components/Navbar'

/** Lista vertical de secciones (menú lateral y cajón del celular). */
export default function SectionNav({ items, onNavigate, compact = false }: {
  items: NavItem[]
  onNavigate?: () => void
  /** Solo iconos (menú lateral cerrado). El nombre queda como tooltip y para lectores de pantalla. */
  compact?: boolean
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const activeHref = pickActiveHref(items, pathname, searchParams.get('tab'))

  return (
    <nav aria-label="Secciones" className="flex flex-col gap-1">
      {items.map(({ href, label, icon, badge }) => {
        const active = href === activeHref
        return (
          <Link key={href} href={href} onClick={onNavigate} title={compact ? label : undefined}
            aria-current={active ? 'page' : undefined}
            className={`relative min-h-11 rounded-xl text-sm font-semibold inline-flex items-center transition-colors ${compact ? 'justify-center px-0' : 'px-3 gap-3'}`}
            style={active
              ? { background: 'var(--primary)', color: 'var(--primary-fg)' }
              : { color: 'var(--text)' }}>
            <span className="text-lg w-6 text-center" aria-hidden>{icon}</span>
            <span className={compact ? 'sr-only' : 'flex-1 truncate'}>{label}</span>
            {badge && compact && (
              <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full text-[10px] leading-4 font-black text-center"
                style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }}>{badge}</span>
            )}
            {badge && !compact && (
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
  )
}
