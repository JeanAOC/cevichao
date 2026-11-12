import { SAUCE_AMOUNTS, SAUCE_AMOUNT_LABELS } from '@/lib/pricing'
import { itemsOf, money, type MenuData } from '@/lib/menu'

const SAUCES = ['Tomate', 'Limón', 'Mostaza', 'Ají']
const FREE_EXTRAS = ['Maní', 'Guacamole']

function Section({ step, title, note, children }: { step?: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border shadow-card" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <header className="px-5 pt-4 pb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2.5 text-xl font-extrabold">
          {step && (
            <span className="w-7 h-7 shrink-0 rounded-full inline-flex items-center justify-center text-sm font-black"
              style={{ background: 'var(--accent)', color: 'var(--accent-fg)' }} aria-hidden>
              {step}
            </span>
          )}
          {title}
        </h2>
        {note && <span className="chip chip-ok">{note}</span>}
      </header>
      <div className="px-5 pb-4">{children}</div>
    </section>
  )
}

/** Fila de carta: «Pescado ........ $2.25». Sin precio = viene incluido. */
function PriceRow({ label, price }: { label: string; price?: number }) {
  return (
    <li className="menu-row">
      <span className="font-semibold">{label}</span>
      <span className="leader" aria-hidden />
      {price !== undefined
        ? <span className="menu-price">{money(price)}</span>
        : <span className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>incluido</span>}
    </li>
  )
}

export default function Menu({ menu }: { menu: MenuData }) {
  const bases = itemsOf(menu, 'base')
  const proteins = itemsOf(menu, 'protein')
  const extras = itemsOf(menu, 'extra')
  const bebidas = itemsOf(menu, 'bebida')

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Section step="1" title="Base">
          <ul>
            {bases.map(b => <PriceRow key={b.key} label={b.label} price={b.price > 0 ? b.price : undefined} />)}
          </ul>
        </Section>

        <Section step="2" title="Proteínas">
          <ul>
            {proteins.map(p => <PriceRow key={p.key} label={p.label} price={p.price} />)}
          </ul>
        </Section>

        <Section step="3" title="Salsas" note="Gratis">
          <p className="text-xs font-bold tracking-wide mt-2 mb-2" style={{ color: 'var(--muted)' }}>LA SEÑORA LE PONE</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {FREE_EXTRAS.map(x => <span key={x} className="chip chip-ok">{x}</span>)}
          </div>
          <p className="text-xs font-bold tracking-wide mb-2" style={{ color: 'var(--muted)' }}>
            SALSAS · {SAUCE_AMOUNTS.map(a => SAUCE_AMOUNT_LABELS[a].toLowerCase()).join(' / ')}
          </p>
          <div className="flex flex-wrap gap-2">
            {SAUCES.map(s => <span key={s} className="chip chip-neutral">{s}</span>)}
          </div>
        </Section>

        {extras.length > 0 && (
          <Section title="Extras">
            <ul>
              {extras.map(x => <PriceRow key={x.key} label={x.label} price={x.price} />)}
            </ul>
          </Section>
        )}
      </div>

      {bebidas.length > 0 && (
        <Section title="Bebidas">
          <ul className="grid sm:grid-cols-2 sm:gap-x-10">
            {bebidas.map(b => <PriceRow key={b.key} label={b.label} price={b.price} />)}
          </ul>
        </Section>
      )}
    </div>
  )
}
