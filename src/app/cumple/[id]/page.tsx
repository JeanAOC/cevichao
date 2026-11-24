import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getStaff } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { computeSummary, isExcluded, orderText, sodaShares, type EventOrderRow, type EventRow, type Line } from '@/lib/cumple'
import { parseAccount } from '@/lib/payment'
import { ensureEveryoneInEvent, loadSodas } from '@/lib/cumple-server'
import SodaEditor from '../SodaEditor'
import { money } from '@/lib/menu'
import type { NavItem } from '@/components/Navbar'
import CumpleShell from '../CumpleShell'
import ActionButton from '@/components/ActionButton'
import PaymentAccountView from '@/components/PaymentAccountView'
import PayerAccountModal from '@/components/PayerAccountModal'
import AccountForm from '@/app/(app)/pagos/AccountForm'
import QrForm from '@/app/(app)/pagos/QrForm'
import OrderEditor from '../OrderEditor'
import EventSettingsForm from '../EventSettingsForm'
import EventPayerSelect from '../EventPayerSelect'
import ParticipantRow from '../ParticipantRow'
import AddPerson from '../AddPerson'

export const revalidate = 0

const MANAGE = '/api/cumple/manage'
const ME = '/api/cumple/me'

function Card({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border p-5 shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h2 className="font-extrabold text-xl">{title}</h2>
          {hint && <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({ label, value, color = 'var(--text)' }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-2xl border p-4 text-center shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <p className="text-2xl font-extrabold font-display" style={{ color }}>{value}</p>
      <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{label}</p>
    </div>
  )
}

function Chips({ l }: { l: Line }) {
  return (
    <>
      {l.is_birthday && <span className="chip chip-warn chip-sm">🎂 Cumpleañero</span>}
      {l.isPayer && <span className="chip chip-info chip-sm">💳 Pagó la cuenta</span>}
    </>
  )
}

export default async function EventPage({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: rawTab } = await searchParams

  const staff = await getStaff()
  if (!staff) redirect('/login')

  const supabase = await createClient()
  const { data: eventData, error } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
  if (error || !eventData) notFound()
  const event = eventData as EventRow

  // Todos pagan por defecto: en un evento abierto, cualquier cuenta que falte (por ejemplo, quien se registró después) entra sola
  if (event.status === 'open') await ensureEveryoneInEvent(id)

  const { data: rowsData } = await supabase.from('event_orders').select('*').eq('event_id', id).order('created_at', { ascending: true })
  const rows = (rowsData ?? []) as EventOrderRow[]

  // Gaseosas compartidas: se pagan solo entre quienes las toman (las maneja el organizador)
  const sodas = await loadSodas(id)
  const summary = computeSummary(rows, Number(event.iva_rate), event.payer_order_id, sodaShares(sodas, rows))
  const me = summary.lines.find(l => l.user_id === staff.userId)
  // Mi fila aunque haya elegido «No participo» (en ese caso no está en el resumen)
  const myRow = rows.find(r => r.user_id === staff.userId)
  const excludedRows = rows.filter(isExcluded)
  const payer = summary.lines.find(l => l.isPayer)
  const closed = event.status === 'closed'
  const organizer = staff.canOrganize
  const ivaRate = Number(event.iva_rate)

  // Participantes (no organizadores): «Lo que debes» y «Cómo pagar» van en pestañas propias.
  // El organizador las sigue viendo bajo «Mi pedido» porque ya tiene muchas pestañas.
  const splitPay = !organizer

  const tabs = [
    { id: 'pedido', label: 'Mi pedido', icon: '📝' },
    ...(splitPay ? [
      { id: 'debes', label: 'Debes', icon: '💰', badge: me && !me.paidNow && me.total > 0 ? '!' : undefined },
      { id: 'pagar', label: 'Pagar', icon: '💳' },
      // Si el organizador te eligió como quien pagó la cuenta, aquí pones dónde te depositan
      ...(me?.isPayer ? [{ id: 'micuenta', label: 'Mi cuenta', icon: '🏦', badge: event.payment_info || event.payment_qr ? undefined : '!' }] : []),
    ] : []),
    { id: 'pedidos', label: 'Pedidos', icon: '🍽️', badge: summary.lines.some(l => l.attending) ? String(summary.lines.filter(l => l.attending).length) : undefined },
    { id: 'resumen', label: 'Resumen', icon: '📊' },
    ...(organizer ? [
      { id: 'pagos', label: 'Pagos', icon: '💵', badge: summary.pending > 0 ? String(summary.lines.filter(l => !l.paidNow).length) : undefined },
      { id: 'gaseosa', label: 'Gaseosa', icon: '🥤', badge: sodas.length > 0 ? String(sodas.length) : undefined },
      { id: 'cuenta', label: 'Cuenta', icon: '🏦' },
      { id: 'organizar', label: 'Organizar', icon: '⚙️' },
    ] : []),
  ]
  const tab = tabs.some(t => t.id === rawTab) ? (rawTab as string) : 'pedido'

  // Las secciones van en la barra superior (como en Cevichao); «Mi pedido» es la de por defecto y no lleva ?tab=
  const navItems: NavItem[] = tabs.map(t => ({
    href: t.id === 'pedido' ? `/cumple/${event.id}` : `/cumple/${event.id}?tab=${t.id}`,
    label: t.label, icon: t.icon, badge: t.badge,
  }))

  // Personas de la app que todavía no están en el evento (para que el organizador las agregue)
  let missingPeople: { id: string; name: string }[] = []
  // Cuentas con las que se puede vincular un invitado sin cuenta: las que aún no están o solo tienen una fila vacía
  let linkable: { id: string; name: string }[] = []
  if (organizer && tab === 'organizar') {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').order('display_name')
    const inEvent = new Set(rows.map(r => r.user_id).filter(Boolean))
    missingPeople = (profiles ?? []).filter(p => !inEvent.has(p.id)).map(p => ({ id: p.id, name: p.display_name }))
    const emptyRows = new Set(rows.filter(r => r.user_id && !r.attending && !r.description && !Number(r.amount) && !Number(r.extras_amount) && !r.paid && !r.is_birthday).map(r => r.user_id))
    linkable = (profiles ?? []).filter(p => !inEvent.has(p.id) || emptyRows.has(p.id)).map(p => ({ id: p.id, name: p.display_name }))
  }

  // Solo la primera letra en mayúscula («Jueves, 12 de noviembre de 2026»); `capitalize` de CSS ponía «De» en cada palabra
  const rawDate = new Date(event.event_date + 'T12:00:00')
    .toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1)
  const birthdayNames = summary.lines.filter(l => l.is_birthday).map(l => l.name)
  const withIva = (n: number) => n * (1 + ivaRate / 100)
  // Quiénes pueden tomar gaseosa: los que pidieron (o el cumpleañero) y siguen en el evento
  const sodaPeople = summary.lines.filter(l => l.attending || l.is_birthday).map(l => ({ id: l.id, name: l.name }))

  const owesCard = me ? (
    <Card title="Lo que debes">
      {me.is_birthday ? (
        <p className="font-semibold">🎉 Eres el cumpleañero: no pagas nada.</p>
      ) : (
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Tu pedido (con IVA)</span><span>{money(me.subtotal - withIva(me.soda))}</span></div>
          {me.soda > 0 && (
            <div className="flex justify-between"><span style={{ color: 'var(--muted)' }}>Gaseosa compartida</span><span>{money(withIva(me.soda))}</span></div>
          )}
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>Parte del cumpleañero{birthdayNames.length ? ` (${birthdayNames.join(', ')})` : ''}</span>
            <span>{money(me.guestShare)}</span>
          </div>
          <div className="flex justify-between items-center font-black text-lg border-t pt-2" style={{ borderColor: 'var(--border)' }}>
            <span>Total a pagar</span>
            <span className="font-display text-2xl" style={{ color: 'var(--accent)' }}>{money(me.total)}</span>
          </div>
          <div>
            {me.isPayer
              ? <span className="chip chip-info">💳 Tú pagaste la cuenta: no te pagas a ti</span>
              : <span className={`chip ${me.paidNow ? 'chip-ok' : 'chip-warn'}`}>{me.paidNow ? '✓ Pagado' : 'Pendiente'}</span>}
          </div>
        </div>
      )}
    </Card>
  ) : null

  const hasPayData = !!(payer || event.payment_info || event.payment_qr)
  const howToPayCard = me && !me.paidNow && me.total > 0 && hasPayData ? (
    <Card title="Cómo pagar">
      {payer && (
        <p className="mb-3">
          Págale <span className="font-black">{money(me.total)}</span> a{' '}
          <span className="font-black" style={{ color: 'var(--primary)' }}>{payer.name}</span>
        </p>
      )}
      <PaymentAccountView raw={event.payment_info} />
      {event.payment_qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.payment_qr} alt="QR de pago" className="mt-3 mx-auto w-56 max-w-full rounded-xl border bg-white" style={{ borderColor: 'var(--border)' }} />
      )}
    </Card>
  ) : null

  // Mensaje cuando no hay nada que mostrar en la pestaña «Cómo pagar»
  let noPayMessage = ''
  if (!me) noPayMessage = 'Todavía no hiciste tu pedido. Hazlo en «Mi pedido» y aquí verás cómo pagar.'
  else if (me.is_birthday) noPayMessage = '🎉 Eres el cumpleañero: no tienes que pagar nada.'
  else if (me.isPayer) noPayMessage = '💳 Tú pagaste la cuenta: no tienes que pagarle a nadie. Pon dónde quieres que te depositen en la pestaña «Mi cuenta».'
  else if (me.paidNow) noPayMessage = '✓ Ya está pagado. ¡Gracias!'
  else if (me.total <= 0) noPayMessage = 'No tienes nada que pagar en este evento.'
  else if (!hasPayData) noPayMessage = 'El organizador todavía no puso los datos de pago. Vuelve a revisar más tarde.'

  return (
    <CumpleShell displayName={staff.displayName} items={navItems}>
    {/* Me eligieron como quien pagó la cuenta y aún no hay dónde depositarme: aviso con botón a donde se pone */}
    {me?.isPayer && !event.payment_info && !event.payment_qr && tab !== (splitPay ? 'micuenta' : 'cuenta') && (
      <PayerAccountModal href={`/cumple/${event.id}?tab=${splitPay ? 'micuenta' : 'cuenta'}`}
        text={`Te eligieron como quien pagó la cuenta de «${event.name}». Pon tu cuenta (o tu QR) para que los demás sepan dónde depositarte.`} />
    )}
    <div className="space-y-4">
      <div>
        <Link href="/cumple"
          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border text-sm font-bold shadow-card transition-colors"
          style={{ background: 'var(--card)', borderColor: 'var(--border)', color: 'var(--primary)' }}>
          <span aria-hidden>←</span> Eventos
        </Link>
        <div className="flex items-start justify-between gap-3 mt-3">
          <div className="min-w-0">
            <h1 className="text-3xl font-extrabold truncate">🎂 {event.name}</h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{dateLabel}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`chip ${closed ? 'chip-neutral' : 'chip-ok'}`}>{closed ? 'Cerrado' : 'Abierto'}</span>
            {organizer && (
              <a href={`/api/cumple/export?eventId=${event.id}`}
                className="text-sm px-3 min-h-11 inline-flex items-center rounded-lg font-bold border"
                style={{ borderColor: 'var(--success)', color: 'var(--success)' }}>
                ⬇ Excel
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ───────── Mi pedido ───────── */}
      {tab === 'pedido' && (
        <>
          <Card title="Mi pedido" hint={closed ? 'Este evento está cerrado: ya no se pueden hacer cambios.' : 'Pon lo que vas a pedir y cuánto cuesta.'}>
            {closed ? (
              myRow
                ? <p className="text-sm">{orderText(myRow)}</p>
                : <p className="text-sm" style={{ color: 'var(--muted)' }}>No hiciste pedido en este evento.</p>
            ) : myRow && isExcluded(myRow) ? (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Estás fuera de este evento: no pagas nada. Si fue un error, pídele a un admin que te incluya en Organizar → Personas.
              </p>
            ) : (
              <div className="space-y-4">
                <OrderEditor key={myRow?.id ?? 'new'} mode="me" eventId={event.id} ivaRate={ivaRate}
                  initial={myRow ? { attending: myRow.attending, description: myRow.description, amount: Number(myRow.amount), extras_amount: Number(myRow.extras_amount) } : undefined}
                  submitLabel={myRow ? 'Actualizar mi pedido' : 'Guardar mi pedido'} />
                {/* Sin «Quitar mi pedido»: todos están en el evento y pagan la parte del cumpleañero; para no pedir se elige «Esta vez no». */}
              </div>
            )}
          </Card>

          {!splitPay && owesCard}
          {!splitPay && howToPayCard}
        </>
      )}

      {/* ───────── Lo que debes (participantes) ───────── */}
      {splitPay && tab === 'debes' && (
        owesCard ?? (
          <Card title="Lo que debes">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Todavía no hiciste tu pedido. Hazlo en «Mi pedido» y aquí verás cuánto debes.</p>
          </Card>
        )
      )}

      {/* ───────── Cómo pagar (participantes) ───────── */}
      {splitPay && tab === 'pagar' && (
        howToPayCard ?? (
          <Card title="Cómo pagar">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>{noPayMessage}</p>
          </Card>
        )
      )}

      {/* ───────── Mi cuenta (quien pagó la cuenta; el organizador usa la pestaña Cuenta) ───────── */}
      {splitPay && me?.isPayer && tab === 'micuenta' && (
        <>
          <Card title="Mi cuenta bancaria" hint="Ahí te depositan los demás. La ven en «Cómo pagar» mientras no hayan pagado.">
            <AccountForm initial={parseAccount(event.payment_info)?.legacy ? null : parseAccount(event.payment_info)}
              endpoint={ME} extra={{ action: 'savePayment', eventId: event.id }} />
          </Card>
          <Card title="Código QR" hint="Opcional. Se muestra junto a la cuenta.">
            <QrForm initialQr={event.payment_qr} endpoint={ME} extra={{ action: 'savePayment', eventId: event.id }} />
          </Card>
        </>
      )}

      {/* ───────── Pedidos: tabla aparte, solo quienes pidieron, con su pedido y su precio ───────── */}
      {tab === 'pedidos' && (() => {
        const ordered = summary.lines.filter(l => l.attending)
        const orderedTotal = ordered.reduce((s, l) => s + l.subtotal - withIva(l.soda), 0)
        return (
          <Card title={`Lo que pidieron (${ordered.length})`} hint="Precio de cada pedido con IVA, sin la parte del cumpleañero.">
            {ordered.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Todavía nadie pidió.</p>
            ) : (
              <div className="overflow-x-auto -mx-1 px-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                      <th className="py-2 pr-3 font-bold">Persona</th>
                      <th className="py-2 pr-3 font-bold">Pedido</th>
                      <th className="py-2 text-right font-bold">Precio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map(l => (
                      <tr key={l.id} className="border-t align-top" style={{ borderColor: 'var(--border)' }}>
                        <td className="py-2.5 pr-3 font-bold leading-tight">
                          {l.name}
                          {l.is_birthday && <span className="block"><span className="chip chip-warn chip-sm">🎂</span></span>}
                        </td>
                        <td className="py-2.5 pr-3">
                          {l.description || 'Sin descripción'}
                          {l.soda > 0 && <span className="block text-xs" style={{ color: 'var(--muted)' }}>+ gaseosa {money(withIva(l.soda))}</span>}
                        </td>
                        <td className="py-2.5 text-right font-extrabold font-display whitespace-nowrap" style={{ color: 'var(--accent)' }}>
                          {money(l.subtotal - withIva(l.soda))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2" style={{ borderColor: 'var(--border)' }}>
                      <td colSpan={2} className="py-3 font-black">Total de los pedidos</td>
                      <td className="py-3 text-right font-black font-display whitespace-nowrap">{money(orderedTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Card>
        )
      })()}

      {/* ───────── Resumen ───────── */}
      {tab === 'resumen' && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Pedido del cumpleañero" value={money(summary.birthdayCost)} />
            <Stat label={`Cada uno paga de más (${summary.payersCount})`} value={money(summary.guestShare)} color="var(--accent)" />
            <Stat label="Total a recoger" value={money(summary.totalToCollect)} />
            <Stat label="Falta" value={money(summary.pending)} color={summary.pending > 0 ? 'var(--accent)' : 'var(--success)'} />
          </div>

          <Card title={`Personas (${summary.lines.length})`} hint="Lo que debe pagar cada una.">
            {summary.lines.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Todavía nadie puso su pedido.</p>
            ) : (
              <ul>
                {summary.lines.map(l => (
                  <li key={l.id} className="py-3 border-t first:border-t-0 flex items-start justify-between gap-3" style={{ borderColor: 'var(--border)' }}>
                    <div className="min-w-0">
                      <p className="font-bold leading-tight flex flex-wrap items-center gap-1.5">{l.name} <Chips l={l} /></p>
                      <p className="text-sm" style={{ color: 'var(--muted)' }}>{orderText(l)}</p>
                      {(l.attending || l.guestShare > 0) && <p className="text-xs" style={{ color: 'var(--muted)' }}>Pedido {money(l.subtotal)}{l.soda > 0 ? ` (incluye gaseosa ${money(withIva(l.soda))})` : ''}{l.guestShare > 0 ? ` + ${money(l.guestShare)} del cumpleañero` : ''}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {l.is_birthday
                        ? <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>No paga</span>
                        : <>
                            <p className="font-extrabold font-display" style={{ color: 'var(--accent)' }}>{money(l.total)}</p>
                            <span className={`chip chip-sm ${l.paidNow ? 'chip-ok' : 'chip-warn'}`}>{l.paidNow ? '✓ Pagado' : 'Pendiente'}</span>
                          </>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* ───────── Gaseosa compartida (solo organizador) ───────── */}
      {organizer && tab === 'gaseosa' && (
        <>
          <Card title="Gaseosa compartida" hint="Se paga entre quienes la toman: marca quiénes. Quien no la toma no paga nada, aunque haya pedido. Se cobra junto con lo demás, a quien pagó la cuenta.">
            {sodas.length === 0 && <p className="text-sm" style={{ color: 'var(--muted)' }}>Todavía no hay ninguna. Agrégala abajo.</p>}
          </Card>
          {sodas.map(s => (
            <Card key={s.id} title={`🥤 ${s.label}`}>
              <SodaEditor eventId={event.id} soda={s} people={sodaPeople} ivaRate={ivaRate} />
            </Card>
          ))}
          <Card title="Agregar gaseosa">
            <SodaEditor key={`new-${sodas.length}`} eventId={event.id} people={sodaPeople} ivaRate={ivaRate} />
          </Card>
        </>
      )}

      {/* ───────── Pagos (organizador) ───────── */}
      {organizer && tab === 'pagos' && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Total a recoger" value={money(summary.totalToCollect)} />
            <Stat label="Pagado" value={money(summary.paid)} color="var(--success)" />
            <Stat label="Falta" value={money(summary.pending)} color={summary.pending > 0 ? 'var(--accent)' : 'var(--muted)'} />
          </div>

          <Card title="Quién ya pagó"
            hint={summary.pending > 0 ? `${summary.lines.filter(l => !l.paidNow).length} sin pagar` : summary.lines.length > 0 ? 'Todos pagaron 🎉' : undefined}
            action={summary.lines.some(l => !l.paidNow) ? (
              <ActionButton endpoint={MANAGE} body={{ action: 'markAllPaid', eventId: event.id }} variant="success" confirmText="Sí, todos pagaron">
                ✓ Marcar todos pagados
              </ActionButton>
            ) : undefined}>
            {summary.lines.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Todavía nadie puso su pedido.</p>
            ) : (
              <ul>
                {[...summary.lines].sort((a, b) => Number(a.paidNow) - Number(b.paidNow)).map(l => (
                  <li key={l.id} className="flex items-center gap-3 py-3 border-t first:border-t-0" style={{ borderColor: 'var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold leading-tight flex flex-wrap items-center gap-1.5">{l.name} <Chips l={l} /></p>
                      <p className="text-sm font-extrabold font-display" style={{ color: 'var(--accent)' }}>{l.is_birthday ? '—' : money(l.total)}</p>
                    </div>
                    {!l.is_birthday && !l.isPayer && (
                      <ActionButton endpoint={MANAGE} body={{ action: 'setPaid', orderId: l.id, paid: !l.paid }} variant={l.paid ? 'success' : 'ghost'}>
                        {l.paid ? '✓ Pagado' : 'Marcar pagado'}
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}

      {/* ───────── Cuenta (organizador) ───────── */}
      {organizer && tab === 'cuenta' && (
        <>
          <Card title="¿Quién pagó la cuenta?"
            hint="Su pedido queda como pagado y no se cobra a sí mismo. Los demás le pagan a esta persona.">
            <EventPayerSelect eventId={event.id} current={event.payer_order_id}
              people={summary.lines.map(l => ({ orderId: l.id, name: l.name }))} />
          </Card>
          <Card title="Cuenta bancaria" hint="Ahí le pagan los demás. La ven en «Mi pedido» mientras no hayan pagado.">
            <AccountForm initial={parseAccount(event.payment_info)?.legacy ? null : parseAccount(event.payment_info)}
              endpoint={MANAGE} extra={{ action: 'savePayment', eventId: event.id }} />
          </Card>
          <Card title="Código QR" hint="Opcional. Se muestra junto a la cuenta.">
            <QrForm initialQr={event.payment_qr} endpoint={MANAGE} extra={{ action: 'savePayment', eventId: event.id }} />
          </Card>
        </>
      )}

      {/* ───────── Organizar (organizador) ───────── */}
      {organizer && tab === 'organizar' && (
        <>
          <Card title="Evento">
            <EventSettingsForm eventId={event.id} name={event.name} eventDate={event.event_date} ivaRate={ivaRate} />
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
              <ActionButton endpoint={MANAGE} body={{ action: 'updateEvent', eventId: event.id, status: closed ? 'open' : 'closed' }}
                variant={closed ? 'success' : 'ghost'}>
                {closed ? '🔓 Reabrir pedidos' : '🔒 Cerrar pedidos'}
              </ActionButton>
              <ActionButton endpoint={MANAGE} body={{ action: 'deleteEvent', eventId: event.id }}
                variant="danger" confirmText="Sí, borrar el evento" redirectTo="/cumple">
                Borrar evento
              </ActionButton>
            </div>
          </Card>

          <Card title={`Personas (${summary.lines.length})`}
            hint="Marca al cumpleañero: no paga y su pedido se reparte entre los demás.">
            {summary.lines.length === 0 ? (
              <p className="text-center py-6" style={{ color: 'var(--muted)' }}>Todavía nadie puso su pedido.</p>
            ) : (
              <ul>
                {summary.lines.map(l => (
                  <ParticipantRow key={l.id} eventId={event.id} ivaRate={ivaRate} accounts={linkable} canExclude={staff.isAdmin}
                    row={{
                      hasAccount: !!l.user_id,
                      id: l.id, name: l.name, attending: l.attending, description: l.description,
                      amount: l.amount, extras_amount: l.extras_amount, is_birthday: l.is_birthday,
                      subtotal: l.subtotal, isPayer: l.isPayer,
                    }} />
                ))}
              </ul>
            )}
          </Card>

          {excludedRows.length > 0 && (
            <Card title={`No participan (${excludedRows.length})`}
              hint={staff.isAdmin
                ? 'No aparecen en el resumen ni pagan nada. Para volver a incluir a alguien, pulsa Editar y elige «Voy a pedir» o «Esta vez no».'
                : 'No aparecen en el resumen ni pagan nada. Solo un admin puede cambiarlo.'}>
              <ul>
                {excludedRows.map(r => (
                  <ParticipantRow key={r.id} eventId={event.id} ivaRate={ivaRate} accounts={linkable} canExclude={staff.isAdmin}
                    row={{
                      hasAccount: !!r.user_id,
                      id: r.id, name: r.name, attending: r.attending, description: r.description,
                      amount: Number(r.amount), extras_amount: Number(r.extras_amount), is_birthday: false,
                      subtotal: 0, isPayer: false,
                    }} />
                ))}
              </ul>
            </Card>
          )}

          <Card title="Agregar invitado" hint="Todas las cuentas de la app ya están en el evento. Aquí solo agregas a alguien que no tiene cuenta.">
            <AddPerson eventId={event.id} ivaRate={ivaRate} people={missingPeople} />
          </Card>
        </>
      )}
    </div>
    </CumpleShell>
  )
}
