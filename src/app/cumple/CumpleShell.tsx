'use client'

import { useState } from 'react'
import Navbar, { type NavItem } from '@/components/Navbar'
import SectionNav from '@/components/SectionNav'
import AutoRefresh from '@/components/AutoRefresh'

/**
 * Marco del módulo de cumpleaños: barra superior + menú lateral + contenido. Lo pone cada página, porque las
 * secciones dependen del evento y de quién eres (organizador, pagador…).
 * Con varias secciones hay un menú lateral con el botón ☰ arriba: abierto (iconos y nombres) o cerrado (solo iconos).
 * En el celular el ☰ abre un cajón. Con una sola sección no hay menú.
 */
export default function CumpleShell({ displayName, items, children }: {
  displayName: string
  items: NavItem[]
  children: React.ReactNode
}) {
  const side = items.length > 1
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen">
      <Navbar displayName={displayName} brand={{ icon: '🎂', name: 'Cumpleaños' }} items={items}
        sideMenu={side} onToggleMenu={() => setCollapsed(c => !c)} />
      <AutoRefresh />
      <div className="sm:flex">
        {side && (
          <aside aria-label="Menú de secciones"
            className={`hidden sm:block shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto border-r px-2 pt-8 pb-4 transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-60'}`}
            style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <SectionNav items={items} compact={collapsed} />
          </aside>
        )}
        <main className="min-w-0 flex-1">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-9 pb-10">{children}</div>
        </main>
      </div>
    </div>
  )
}
