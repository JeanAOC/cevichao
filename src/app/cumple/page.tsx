import Link from 'next/link'
import { getStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { todayDate } from '@/lib/date'
import NewEventForm from './NewEventForm'

export const revalidate = 0

const fmtDate = (d: string) =>
  new Date(d + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

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
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black">Pedidos de cumpleaños</h1>
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

      {staff?.canOrganize && !error && <NewEventForm today={todayDate()} />}

      {!error && (events ?? []).length === 0 && (
        <div className="text-center py-12" style={{ color: 'var(--muted)' }}>
          <p className="text-5xl mb-3">🎂</p>
          <p>Todavía no hay eventos.{staff?.canOrganize ? ' Crea el primero arriba.' : ' El organizador creará uno pronto.'}</p>
        </div>
      )}

      <ul className="space-y-3">
        {(events ?? []).map(e => (
          <li key={e.id}>
            <Link href={`/cumple/${e.id}`}
              className="flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
              <div className="min-w-0">
                <p className="font-black text-lg leading-tight truncate">🎂 {e.name}</p>
                <p className="text-sm capitalize" style={{ color: 'var(--muted)' }}>
                  {fmtDate(e.event_date)} · {people[e.id] ?? 0} persona{(people[e.id] ?? 0) !== 1 ? 's' : ''}
                </p>
              </div>
              <span className={`chip shrink-0 ${e.status === 'open' ? 'chip-ok' : 'chip-neutral'}`}>
                {e.status === 'open' ? 'Abierto' : 'Cerrado'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
