'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { itemsOf, type MenuData, type MenuKind } from '@/lib/menu'

interface Filter {
  param: string
  options: { value: string; label: string }[]
}

const yesNo = (label: string): Filter['options'] => [
  { value: '', label: `${label}: todos` },
  { value: '1', label: `${label}: Sí` },
  { value: '0', label: `${label}: No` },
]

/** Las opciones de proteína, base y bebida salen del menú (incluye los items ocultos que aún tengan pedidos). */
function buildFilters(menu: MenuData): Filter[] {
  const fromMenu = (kind: MenuKind, all: string): Filter['options'] => [
    { value: '', label: all },
    ...itemsOf(menu, kind, false).map(i => ({ value: i.key, label: i.label })),
  ]
  return [
    { param: 'protein', options: fromMenu('protein', 'Todas las proteínas') },
    { param: 'base', options: fromMenu('base', 'Todas las bases') },
    { param: 'bebida', options: fromMenu('bebida', 'Todas las bebidas') },
    { param: 'mani', options: yesNo('Maní') },
    { param: 'guac', options: yesNo('Guacamole') },
  ]
}

/**
 * `available`: valores que existen realmente por filtro (ej. { base: ['chifles'] }).
 * Si se omite un filtro, se muestran todas sus opciones.
 */
export default function FilterBar({ menu, available }: { menu: MenuData; available?: Record<string, string[]> }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const filters = buildFilters(menu)

  function handleChange(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') params.delete(param)
    else params.set(param, value)
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  const hasFilter = filters.some(f => searchParams.get(f.param))

  function clearAll() {
    router.replace(pathname, { scroll: false })
  }

  return (
    <div className="rounded-2xl border p-4" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold" style={{ color: 'var(--muted)' }}>FILTRAR</p>
        {hasFilter && (
          <button onClick={clearAll} className="text-xs font-semibold" style={{ color: 'var(--danger)' }}>
            Limpiar filtros
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {filters.map(f => {
          const current = searchParams.get(f.param) ?? ''
          const active = current !== ''
          const allowed = available?.[f.param]
          const options = f.options.filter(o => o.value === '' || o.value === current || !allowed || allowed.includes(o.value))
          if (options.length <= 1) return null
          return (
            <select
              key={f.param}
              value={current}
              onChange={e => handleChange(f.param, e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-sm font-semibold outline-none cursor-pointer transition-all"
              style={{
                background: active ? 'color-mix(in srgb, var(--primary) 15%, var(--card))' : 'var(--bg)',
                border: active ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                color: active ? 'var(--primary)' : 'var(--muted)',
              }}>
              {options.map(o => (
                <option key={o.value} value={o.value} style={{ background: 'var(--card)', color: 'var(--text)' }}>
                  {o.label}
                </option>
              ))}
            </select>
          )
        })}
      </div>
    </div>
  )
}
