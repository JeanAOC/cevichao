import { todayDate } from '@/lib/date'

/** Temporada navideña: del 24 de noviembre al 31 de diciembre (en enero se apaga sola). */
export function inXmasSeason(date = todayDate()): boolean {
  const md = date.slice(5) // MM-DD
  return md >= '11-24'
}

/**
 * ¿Está prendido el modo navideño? Sin ajuste del admin: automático según la fecha.
 * El admin puede forzarlo («on:2026» / «off:2026»); esa decisión vale solo para la temporada de ese año,
 * así que en enero se olvida y vuelve a lo automático (apagado).
 */
export function xmasEnabled(setting: string | null | undefined, date = todayDate()): boolean {
  const year = date.slice(0, 4)
  if (setting === `on:${year}`) return true
  if (setting === `off:${year}`) return false
  return inXmasSeason(date)
}

export const xmasValue = (on: boolean, date = todayDate()) => `${on ? 'on' : 'off'}:${date.slice(0, 4)}`
