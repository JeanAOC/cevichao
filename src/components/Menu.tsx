import {
  PROTEIN_PRICES, PROTEIN_LABELS,
  BASE_LABELS, BASE_PRICES,
  EXTRA_PRICES, EXTRA_LABELS,
  BEBIDAS, BEBIDA_PRICES, BEBIDA_LABELS,
  SAUCE_AMOUNTS, SAUCE_AMOUNT_LABELS,
  type Protein, type Base,
} from '@/lib/pricing'

const PROTEINS = (Object.keys(PROTEIN_PRICES) as Protein[]).filter(p => PROTEIN_PRICES[p] > 0)
const BASES = (Object.keys(BASE_LABELS) as Base[]).filter(b => b !== 'no_gracias')
const SAUCES = ['Tomate', 'Limón', 'Mostaza', 'Ají']
const FREE_EXTRAS = ['Maní', 'Guacamole']

const money = (n: number) => `$${n.toFixed(2)}`

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

export default function Menu() {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Section step="Paso 1" title="Base">
          <ul>
            {BASES.map(b => <PriceRow key={b} label={BASE_LABELS[b]} price={BASE_PRICES[b] > 0 ? BASE_PRICES[b] : undefined} />)}
          </ul>
        </Section>

        <Section step="Paso 2" title="Proteínas">
          <ul>
            {PROTEINS.map(p => <PriceRow key={p} label={PROTEIN_LABELS[p]} price={PROTEIN_PRICES[p]} />)}
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

        <Section title="Extras">
          <ul>
            {Object.keys(EXTRA_PRICES).map(k => <PriceRow key={k} label={EXTRA_LABELS[k]} price={EXTRA_PRICES[k]} />)}
          </ul>
        </Section>
      </div>

      <Section title="Bebidas">
        <ul className="grid sm:grid-cols-2 sm:gap-x-8">
          {BEBIDAS.filter(b => BEBIDA_PRICES[b] > 0).map(b => <PriceRow key={b} label={BEBIDA_LABELS[b]} price={BEBIDA_PRICES[b]} />)}
        </ul>
      </Section>
    </div>
  )
}
