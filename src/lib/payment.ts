export const ACCOUNT_TYPES = ['Ahorros', 'Corriente'] as const

// Bancos, cooperativas y billeteras comunes en Ecuador. "Otro" permite escribir uno distinto.
export const EC_BANKS = [
  'Banco Pichincha',
  'Banco del Pacífico',
  'Banco de Guayaquil',
  'Produbanco',
  'Banco Internacional',
  'Banco Bolivariano',
  'Banco del Austro',
  'Banco de Loja',
  'Banco Solidario',
  'Banco Amazonas',
  'Banco General Rumiñahui',
  'Banco Capital',
  'Banco Machala',
  'Banco Diners Club',
  'Banco Comercial de Manabí',
  'Banco Desarrollo de los Pueblos (Codesarrollo)',
  'Banco Delbank',
  'Banco Litoral',
  'Cooperativa JEP',
  'Cooperativa 29 de Octubre',
  'Cooperativa Jardín Azuayo',
  'Cooperativa Policía Nacional',
  'Cooperativa Alianza del Valle',
  'Cooperativa Cacpeco',
  'Cooperativa Riobamba',
  'Cooperativa OSCUS',
  'Deuna',
] as const
export const OTHER_BANK = 'Otro'

export interface PaymentAccount {
  bank: string
  accountType: string
  holder: string
  accountNumber: string
  /** Cédula (10 dígitos) o RUC (13). Opcional. */
  idNumber: string
}

export const emptyAccount = (): PaymentAccount => ({
  bank: '', accountType: ACCOUNT_TYPES[0], holder: '', accountNumber: '', idNumber: '',
})

/** Lee lo guardado en settings.payment_info. Si es texto libre (versión anterior), lo devuelve en `legacy`. */
export function parseAccount(raw?: string | null): (PaymentAccount & { legacy?: string }) | null {
  const text = (raw ?? '').trim()
  if (!text) return null
  if (text.startsWith('{')) {
    try {
      const a = JSON.parse(text) as Partial<PaymentAccount>
      return { ...emptyAccount(), ...a }
    } catch { /* cae a texto libre */ }
  }
  return { ...emptyAccount(), legacy: text }
}

/** Valida y limpia lo que llega del navegador. Devuelve null o un mensaje de error. */
export function sanitizeAccount(raw: unknown): { account: PaymentAccount } | { error: string } {
  if (!raw || typeof raw !== 'object') return { error: 'Datos inválidos' }
  const r = raw as Record<string, unknown>
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

  const bank = str(r.bank, 60)
  const holder = str(r.holder, 80)
  const accountNumber = str(r.accountNumber, 30).replace(/[\s-]/g, '')
  const idNumber = str(r.idNumber, 20).replace(/[\s-]/g, '')
  const accountType = (ACCOUNT_TYPES as readonly string[]).includes(String(r.accountType)) ? String(r.accountType) : ''

  if (!bank) return { error: 'Elige el banco' }
  if (!accountType) return { error: 'Elige el tipo de cuenta' }
  if (holder.length < 2) return { error: 'Escribe el nombre del titular' }
  if (!/^\d{5,20}$/.test(accountNumber)) return { error: 'El número de cuenta debe tener solo números (5 a 20 dígitos)' }
  if (idNumber && !/^\d{10}(\d{3})?$/.test(idNumber)) return { error: 'La cédula tiene 10 dígitos (o 13 si es RUC)' }

  return { account: { bank, accountType, holder, accountNumber, idNumber } }
}
