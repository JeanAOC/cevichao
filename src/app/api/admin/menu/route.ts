import { createAdminClient } from '@/lib/supabase/admin'
import { getStaff } from '@/lib/auth'
import { MENU_KINDS, slugify, type MenuKind } from '@/lib/menu'
import { NextResponse } from 'next/server'

const KINDS = MENU_KINDS.map(k => k.kind) as string[]
const err = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

// La tabla se crea con migrations/2026-11-13-menu-editable.sql
const MISSING_TABLE = 'Falta crear la tabla del menú: ejecuta el SQL «menu-editable» en Supabase.'
const dbError = (e: { code?: string; message: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' ? err(MISSING_TABLE, 500) : err(e.message, 500)

function parseLabel(v: unknown): string | null {
  const s = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : ''
  return s.length >= 1 && s.length <= 40 ? s : null
}

function parsePrice(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 99.99 ? Math.round(n * 100) / 100 : null
}

/**
 * Edita el menú (solo admins).
 *  - { action: 'create', kind, label, price }
 *  - { action: 'update', id, label?, price?, active? }
 *  - { action: 'move', id, direction: 'up' | 'down' }
 */
export async function POST(req: Request) {
  const staff = await getStaff()
  if (!staff) return err('Unauthorized', 401)
  if (!staff.isAdmin) return err('Forbidden', 403)

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object') return err('Datos inválidos')

  const admin = createAdminClient()

  if (body.action === 'create') {
    const kind = body.kind as MenuKind
    const label = parseLabel(body.label)
    const price = parsePrice(body.price)
    if (!KINDS.includes(kind)) return err('Tipo inválido')
    if (!label) return err('Escribe un nombre (hasta 40 letras)')
    if (price === null) return err('El precio debe ser un número entre 0 y 99.99')

    const { data: existing, error } = await admin.from('menu_items').select('key, sort').eq('kind', kind)
    if (error) return dbError(error)

    const taken = new Set((existing ?? []).map(r => r.key as string))
    const base = slugify(label) || 'item'
    let key = base
    for (let n = 2; taken.has(key); n++) key = `${base}_${n}`
    const sort = Math.max(0, ...(existing ?? []).map(r => Number(r.sort ?? 0))) + 1

    const { error: insertError } = await admin.from('menu_items').insert({ kind, key, label, price, sort, active: true })
    if (insertError) return dbError(insertError)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update') {
    if (typeof body.id !== 'string') return err('Item inválido')
    const patch: Record<string, unknown> = {}
    if ('label' in body) {
      const label = parseLabel(body.label)
      if (!label) return err('Escribe un nombre (hasta 40 letras)')
      patch.label = label
    }
    if ('price' in body) {
      const price = parsePrice(body.price)
      if (price === null) return err('El precio debe ser un número entre 0 y 99.99')
      patch.price = price
    }
    if ('active' in body) patch.active = body.active === true
    if (Object.keys(patch).length === 0) return err('No hay nada que guardar')

    const { error } = await admin.from('menu_items').update(patch).eq('id', body.id)
    if (error) return dbError(error)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'move') {
    if (typeof body.id !== 'string' || (body.direction !== 'up' && body.direction !== 'down')) return err('Datos inválidos')

    const { data: row, error } = await admin.from('menu_items').select('id, kind').eq('id', body.id).maybeSingle()
    if (error) return dbError(error)
    if (!row) return err('Item no encontrado', 404)

    const { data: siblings, error: listError } = await admin
      .from('menu_items').select('id').eq('kind', row.kind).order('sort', { ascending: true }).order('label', { ascending: true })
    if (listError) return dbError(listError)

    const ids = (siblings ?? []).map(s => s.id as string)
    const i = ids.indexOf(body.id)
    const j = body.direction === 'up' ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= ids.length) return NextResponse.json({ ok: true }) // ya está en el borde
    ;[ids[i], ids[j]] = [ids[j], ids[i]]

    // Renumera todo el grupo (también arregla empates)
    const results = await Promise.all(ids.map((id, idx) => admin.from('menu_items').update({ sort: idx + 1 }).eq('id', id)))
    const failed = results.find(r => r.error)
    if (failed?.error) return dbError(failed.error)
    return NextResponse.json({ ok: true })
  }

  return err('Acción inválida')
}
