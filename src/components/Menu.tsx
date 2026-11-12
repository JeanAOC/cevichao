import { SAUCE_AMOUNTS, SAUCE_AMOUNT_LABELS } from '@/lib/pricing'
import { itemsOf, money, type MenuData } from '@/lib/menu'

const SAUCES = ['Tomate', 'Limón', 'Mostaza', 'Ají']
const FREE_EXTRAS = ['Maní', 'Guacamole']

function Section({ step, title, note, children }: { step?: string; title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border overflow-hidden" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
      <div className="px-5 py-3 flex items-baseline justify-between gap-3" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        <h2 className="font-black uppercase tracking-wide">
          {step && <span className="opacity-80 mr-2 text-sm">{step}</span>}{title}
        </h2>
        {note && <span className="text-xs font-semibold opacity-90">{note}</span>}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

function PriceRow({ label, price }: { label: string; price?: number }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5 border-b last:border-b-0" style={{ borderColor: 'var(--border)' }}>
      <span className="font-semibold">{label}</span>
      {price !== undefined && (
        <span className="font-black px-3 py-0.5 rounded-full text-sm" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
          {money(price)}
        </span>
      )}
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
        <Section step="Paso 1" title="Base">
          <ul>
            {bases.map(b => <PriceRow key={b.key} label={b.label} price={b.price > 0 ? b.price : undefined} />)}
          </ul>
        </Section>

        <Section step="Paso 2" title="Proteínas">
          <ul>
            {proteins.map(p => <PriceRow key={p.key} label={p.label} price={p.price} />)}
          </ul>
        </Section>

        <Section step="Paso 3" title="Salsas" note="Gratis">
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>LA SEÑORA LE PONE</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {FREE_EXTRAS.map(x => <span key={x} className="chip chip-ok">{x}</span>)}
          </div>
          <p className="text-xs font-bold mb-2" style={{ color: 'var(--muted)' }}>
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
          <ul className="grid sm:grid-cols-2 sm:gap-x-8">
            {bebidas.map(b => <PriceRow key={b.key} label={b.label} price={b.price} />)}
          </ul>
        </Section>
      )}
    </div>
  )
}
