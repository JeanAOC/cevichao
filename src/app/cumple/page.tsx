import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { todayDate } from '@/lib/date'
import NewEventForm from './NewEventForm'
import CumpleShell from './CumpleShell'

export const revalidate = 0

/** «jueves, 12 de noviembre de 2026» (el CSS `capitalize` ponía «De» y «Persona» con mayúscula: no sirve en español) */
const fmtDate = (d: string) => {
  const s = new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}

const dayOf = (d: string) => String(Number(d.split('-')[2]))
const monthOf = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { month: 'short' }).replace('.', '').toUpperCase()

export default async function CumplePage() {
  const staff = await getStaff()
  const supabase = await createClient()

  const [{ data: events, error }, { data: orderRows }] = await Promise.all([
    supabase.from('events').select('id, name, event_date, status').order('event_date', { ascending: false }),
    supabase.from('event_orders').select('event_id'),
  ])

  const people: Record<string, number> = {}
  for (const r of orderRows ?? []) people[r.event_id] = (people[r.event_id] ?? 0) + 1

  return (
    <CumpleShell displayName={staff?.displayName ?? ''} items={[{ href: '/cumple', label: 'Eventos', icon: '🎂' }]}>
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Cumpleaños</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Elige un evento para poner tu pedido y ver cuánto te toca pagar.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border p-5 space-y-2"
          style={{ background: 'color-mix(in srgb, var(--accent) 10%, var(--card))', borderColor: 'var(--accent)' }}>
          <p className="font-black">Falta activar los cumpleaños</p>
          <p className="text-sm">
            Ejecuta una vez el archivo <code className="font-bold">migrations/2026-11-14-cumpleanos.sql</code> en
            Supabase → SQL Editor y recarga esta página.
          </p>
        </div>
      )}

      {!error && (events ?? []).length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          <p className="text-5xl mb-3">🎂</p>
          <p>Todavía no hay eventos.{staff?.canOrganize ? ' Crea el primero aquí abajo.' : ' El organizador creará uno pronto.'}</p>
        </div>
      )}

      {/* Los eventos primero: es lo que más se usa. Crear uno queda plegado debajo. */}
      <ul className="space-y-3">
        {(events ?? []).map(e => (
          <li key={e.id}>
            <Link href={`/cumple/${e.id}`}
              className="press flex items-stretch rounded-2xl border overflow-hidden shadow-card transition-transform hover:-translate-y-0.5"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              {/* Talón de la entrada: el día en grande */}
              <div className="w-20 shrink-0 flex flex-col items-center justify-center py-3 border-r-2 border-dashed"
                style={{ background: e.status === 'open' ? 'var(--accent)' : 'var(--neutral-bg)', color: e.status === 'open' ? 'var(--accent-fg)' : 'var(--neutral-fg)', borderColor: 'var(--card)' }}>
                <span className="font-display font-extrabold text-3xl leading-none">{dayOf(e.event_date)}</span>
                <span className="text-xs font-bold tracking-wider mt-1">{monthOf(e.event_date)}</span>
              </div>
              <div className="flex-1 min-w-0 flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-display font-extrabold text-xl leading-tight truncate">{e.name}</p>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>
                    {fmtDate(e.event_date)} · {people[e.id] ?? 0} persona{(people[e.id] ?? 0) !== 1 ? 's' : ''}
                  </p>
                </div>
                <span className={`chip shrink-0 ${e.status === 'open' ? 'chip-ok' : 'chip-neutral'}`}>
                  {e.status === 'open' ? 'Abierto' : 'Cerrado'}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {staff?.canOrganize && !error && <NewEventForm today={todayDate()} defaultOpen={(events ?? []).length === 0} />}
    </div>
    </CumpleShell>
  )
}
