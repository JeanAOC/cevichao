// Fecha de hoy (YYYY-MM-DD) en zona horaria de Ecuador
export function todayDate(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Guayaquil' }).format(new Date())
}
