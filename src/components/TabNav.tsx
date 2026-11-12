import Link from 'next/link'

export interface TabItem {
  id: string
  label: string
  icon: string
  /** Mini indicador al lado del nombre (cantidad, ✓, 🔒…). Vacío = sin indicador. */
  badge?: string
}

interface Props {
  tabs: TabItem[]
  active: string
  basePath: string
  /** La pestaña por defecto no lleva ?tab= en la URL. */
  defaultTab: string
  ariaLabel: string
}

/** Pestañas que viven en la URL (?tab=...). Se desplazan hacia los lados si no caben en el celular. */
export default function TabNav({ tabs, active, basePath, defaultTab, ariaLabel }: Props) {
  return (
    <nav aria-label={ariaLabel} className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
      {tabs.map(t => {
        const isActive = t.id === active
        return (
          <Link key={t.id} href={t.id === defaultTab ? basePath : `${basePath}?tab=${t.id}`} scroll={false}
            aria-current={isActive ? 'page' : undefined}
            className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap border transition-colors"
            style={isActive
              ? { background: 'var(--primary)', color: 'var(--primary-fg)', borderColor: 'var(--primary)' }
              : { background: 'var(--card)', color: 'var(--text)', borderColor: 'var(--border)' }}>
            <span aria-hidden>{t.icon}</span>
            {t.label}
            {t.badge && (
              <span className="text-[11px] px-1.5 rounded-full font-black"
                style={isActive
                  ? { background: 'rgb(255 255 255 / 0.25)', color: 'var(--primary-fg)' }
                  : { background: 'color-mix(in srgb, var(--accent) 18%, var(--card))', color: 'var(--accent)' }}>
                {t.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
