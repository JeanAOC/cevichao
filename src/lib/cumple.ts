// Cuentas de un evento de cumpleaños. Funciones puras: se usan en pantallas, API y exportación.

export interface EventRow {
  id: string
  name: string
  event_date: string
  iva_rate: number
  status: 'open' | 'closed'
  payment_info: string
  payment_qr: string
  payer_order_id: string | null
  created_by: string | null
}

export interface EventOrderRow {
  id: string
  event_id: string
  user_id: string | null
  name: string
  attending: boolean
  description: string
  amount: number
  extras_amount: number
  is_birthday: boolean
  paid: boolean
}

export interface Line extends EventOrderRow {
  /** Valor + bebidas y extras (sin IVA) */
  base: number
  iva: number
  /** base + IVA: lo que cuesta su pedido */
  subtotal: number
  /** Su parte del pedido del cumpleañero (0 para el cumpleañero) */
  guestShare: number
  /** Lo que debe pagar (0 para el cumpleañero) */
  total: number
  /** Pagó él mismo o es quien adelantó la cuenta */
  isPayer: boolean
  paidNow: boolean
  /** Lo que todavía debe */
  balance: number
}

export interface Summary {
  lines: Line[]
  /** Lo que cuesta el pedido de todos (con IVA) */
  grandSubtotal: number
  /** Lo que cuesta el/los pedido(s) de los cumpleañeros: se reparte entre los demás */
  birthdayCost: number
  /** Cada persona (que no es cumpleañero) paga esto de más */
  guestShare: number
  payersCount: number
  /** Total que se debe recoger (suma de "total a pagar") */
  totalToCollect: number
  paid: number
  pending: number
}

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** "5,17" o "5.17" → 5.17. Devuelve null si no es un monto válido (0 a 9999.99). */
export function parseAmount(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return 0
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'))
  return Number.isFinite(n) && n >= 0 && n <= 9999.99 ? round2(n) : null
}

/**
 * Igual que la hoja de cálculo original: el IVA y la parte del cumpleañero NO se redondean en el medio
 * (solo se redondean al mostrarlos); lo que se redondea a centavos es el total de cada persona.
 * Así los totales coinciden con los del Excel que se venía usando.
 */
export function computeSummary(rows: EventOrderRow[], ivaRate: number, payerOrderId: string | null): Summary {
  const rate = ivaRate / 100

  const priced = rows.map(r => {
    const base = r.attending || r.is_birthday ? round2(Number(r.amount) + Number(r.extras_amount)) : 0
    const iva = base * rate
    return { r, base, iva, subtotal: base + iva }
  })

  const birthdayCost = priced.filter(p => p.r.is_birthday).reduce((s, p) => s + p.subtotal, 0)
  const payers = priced.filter(p => !p.r.is_birthday)
  const guestShare = payers.length > 0 ? birthdayCost / payers.length : 0

  const lines: Line[] = priced.map(({ r, base, iva, subtotal }) => {
    const total = r.is_birthday ? 0 : round2(subtotal + guestShare)
    const isPayer = r.id === payerOrderId
    const paidNow = r.is_birthday || r.paid || isPayer
    return {
      ...r, amount: Number(r.amount), extras_amount: Number(r.extras_amount),
      base, iva, subtotal,
      guestShare: r.is_birthday ? 0 : guestShare,
      total, isPayer, paidNow,
      balance: paidNow ? 0 : total,
    }
  })

  const totalToCollect = round2(lines.reduce((s, l) => s + l.total, 0))
  const pending = round2(lines.reduce((s, l) => s + l.balance, 0))
  return {
    lines,
    grandSubtotal: lines.reduce((s, l) => s + l.subtotal, 0),
    birthdayCost,
    guestShare,
    payersCount: payers.length,
    totalToCollect,
    paid: round2(totalToCollect - pending),
    pending,
  }
}
