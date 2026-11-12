import ExcelJS from 'exceljs'
import { requireOrganizer } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { computeSummary, type EventOrderRow, type EventRow } from '@/lib/cumple'
import { parseAccount } from '@/lib/payment'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MONEY = '"$"#,##0.00'
const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' },
}
const YELLOW: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } }
const HEADER: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9E2F3' } }

/** Genera el Excel del evento con las mismas columnas que la hoja de cálculo manual. */
export async function GET(req: Request) {
  const auth = await requireOrganizer()
  if ('error' in auth) return auth.error

  const eventId = new URL(req.url).searchParams.get('eventId') ?? ''
  if (!UUID.test(eventId)) return NextResponse.json({ error: 'Evento inválido' }, { status: 400 })

  const supabase = await createClient()
  const { data: eventData } = await supabase.from('events').select('*').eq('id', eventId).maybeSingle()
  if (!eventData) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  const event = eventData as EventRow

  const { data: rowsData } = await supabase.from('event_orders').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
  const rate = Number(event.iva_rate)
  const summary = computeSummary((rowsData ?? []) as EventOrderRow[], rate, event.payer_order_id)

  const wb = new ExcelJS.Workbook()
  const sheetName = event.name.replace(/[\\/?*:[\]]/g, '').trim().slice(0, 31) || 'Evento'
  const ws = wb.addWorksheet(sheetName)

  ws.columns = [
    { header: 'Nombre', key: 'name', width: 20 },
    { header: 'Pedido', key: 'desc', width: 52 },
    { header: 'Valor', key: 'amount', width: 13 },
    { header: 'Bebidas y extras', key: 'extras', width: 17 },
    { header: 'IVA', key: 'iva', width: 11 },
    { header: 'Subtotal', key: 'subtotal', width: 13 },
    { header: 'Invitado', key: 'guest', width: 12 },
    { header: 'Total a pagar', key: 'total', width: 15 },
    { header: 'Pagado', key: 'paid', width: 12 },
    { header: 'Saldo', key: 'balance', width: 12 },
  ]
  const head = ws.getRow(1)
  head.font = { bold: true }
  head.eachCell(c => { c.fill = HEADER; c.border = BORDER })
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const money = (cell: ExcelJS.Cell) => { cell.numFmt = MONEY }

  summary.lines.forEach((l, i) => {
    const r = i + 2
    const row = ws.getRow(r)
    row.getCell(1).value = l.name
    row.getCell(2).value = l.attending ? l.description : 'Esta vez no'
    if (l.attending && l.amount > 0) row.getCell(3).value = l.amount
    if (l.attending && l.extras_amount > 0) row.getCell(4).value = l.extras_amount
    // Fórmulas vivas: si cambias Valor o Bebidas en Excel, todo se recalcula
    // Sin ROUND en el medio, igual que la hoja original: solo se redondea al mostrar
    row.getCell(5).value = { formula: `(C${r}+D${r})*${rate / 100}`, result: l.iva }
    row.getCell(6).value = { formula: `C${r}+D${r}+E${r}`, result: l.subtotal }
    if (!l.is_birthday) {
      row.getCell(7).value = l.guestShare
      row.getCell(8).value = { formula: `F${r}+G${r}`, result: l.subtotal + l.guestShare }
      // Pagado = lo que debía (así el saldo queda exactamente en 0)
      row.getCell(9).value = l.paidNow ? { formula: `H${r}`, result: l.subtotal + l.guestShare } : 0
      row.getCell(10).value = { formula: `H${r}-I${r}`, result: l.paidNow ? 0 : l.subtotal + l.guestShare }
    }
    for (let c = 1; c <= 10; c++) {
      const cell = row.getCell(c)
      cell.border = BORDER
      if (c >= 3) money(cell)
      if (l.is_birthday) cell.fill = YELLOW
    }
  })

  // Totales
  const first = 2
  const last = summary.lines.length + 1
  const tr = last + 1
  const totalRow = ws.getRow(tr)
  totalRow.getCell(1).value = 'Total'
  const sums: [number, string, number][] = [
    [3, 'C', summary.lines.reduce((s, l) => s + (l.attending ? l.amount : 0), 0)],
    [4, 'D', summary.lines.reduce((s, l) => s + (l.attending ? l.extras_amount : 0), 0)],
    [5, 'E', summary.lines.reduce((s, l) => s + l.iva, 0)],
    [6, 'F', summary.grandSubtotal],
    [7, 'G', summary.lines.reduce((s, l) => s + l.guestShare, 0)],
    [8, 'H', summary.lines.filter(l => !l.is_birthday).reduce((s, l) => s + l.subtotal + l.guestShare, 0)],
    [9, 'I', summary.lines.filter(l => !l.is_birthday && l.paidNow).reduce((s, l) => s + l.subtotal + l.guestShare, 0)],
    [10, 'J', summary.lines.filter(l => !l.is_birthday && !l.paidNow).reduce((s, l) => s + l.subtotal + l.guestShare, 0)],
  ]
  for (const [col, letter, result] of sums) {
    totalRow.getCell(col).value = last >= first
      ? { formula: `SUM(${letter}${first}:${letter}${last})`, result }
      : 0
  }
  // Que Excel recalcule todo al abrir (los valores guardados son solo de respaldo)
  wb.calcProperties.fullCalcOnLoad = true
  for (let c = 1; c <= 10; c++) {
    const cell = totalRow.getCell(c)
    cell.font = { bold: true }
    cell.border = BORDER
    if (c >= 3) money(cell)
  }

  // Datos del evento debajo de la tabla
  const birthdayNames = summary.lines.filter(l => l.is_birthday).map(l => l.name).join(', ')
  const payer = summary.lines.find(l => l.isPayer)
  const account = parseAccount(event.payment_info)
  const notes: [string, string][] = [
    ['Cumpleañero', birthdayNames || '—'],
    ['IVA', `${rate}%`],
    ['Pagó la cuenta', payer?.name ?? '—'],
  ]
  if (account && !account.legacy) {
    notes.push(['Cuenta', `${account.bank} · ${account.accountType} · ${account.holder}`])
    notes.push(['N° de cuenta', account.accountNumber])
    if (account.idNumber) notes.push(['Cédula/RUC', account.idNumber])
  }
  notes.forEach(([label, value], i) => {
    const row = ws.getRow(tr + 2 + i)
    row.getCell(1).value = label
    row.getCell(1).font = { bold: true }
    row.getCell(2).value = value
    // Que el número de cuenta y la cédula no se vuelvan notación científica
    if (label === 'N° de cuenta' || label === 'Cédula/RUC') row.getCell(2).numFmt = '@'
  })

  const buffer = await wb.xlsx.writeBuffer()
  const asciiName = `${sheetName}.xlsx`.replace(/[^\x20-\x7e]/g, '_')
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(`${sheetName}.xlsx`)}`,
      'Cache-Control': 'no-store',
    },
  })
}
