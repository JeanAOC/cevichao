'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

const FILTERS = [
  {
    param: 'protein',
    label: 'Proteína',
    options: [
      { value: '', label: 'Todas las proteínas' },
      { value: 'pescado', label: 'Pescado' },
      { value: 'mixto', label: 'Mixto' },
      { value: 'camaron', label: 'Camarón' },
    ],
  },
  {
    param: 'base',
    label: 'Base',
    options: [
      { value: '', label: 'Todas las bases' },
      { value: 'chifles', label: 'Chifles' },
      { value: 'doritos_verdes', label: 'Doritos Verdes' },
      { value: 'jalapeños', label: 'Jalapeños' },
      { value: 'patacones', label: 'Patacones' },
      { value: 'no_gracias', label: 'Sin base' },
    ],
  },
  {
    param: 'mani',
    label: 'Maní',
    options: [
      { value: '', label: 'Maní: todos' },
      { value: '1', label: 'Maní: Sí' },
      { value: '0', label: 'Maní: No' },
    ],
  },
  {
    param: 'guac',
    label: 'Guacamole',
    options: [
      { value: '', label: 'Guacamole: todos' },
      { value: '1', label: 'Guacamole: Sí' },
      { value: '0', label: 'Guacamole: No' },
    ],
  },
]

export default function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(param: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === '') params.delete(param)
    else params.set(param, value)
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }

  const hasFilter = FILTERS.some(f => searchParams.get(f.param))

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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FILTERS.map(f => {
          const current = searchParams.get(f.param) ?? ''
          const active = current !== ''
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
              {f.options.map(o => (
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
