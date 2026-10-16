import type { Metadata } from 'next';
import { BrandLockup, BrandMark } from '@/components/shared/brand-logo';

export const metadata: Metadata = {
  title: 'Design system — ISI Group',
  description:
    'The ISI Group brand as it is implemented in this portal: values, colour, type, form and motion.',
};

/**
 * The design system, rendered from the system itself.
 *
 * Every swatch below reads its colour from the same token the product uses, so
 * this page cannot drift from the app: change `globals.css` or
 * `tailwind.config.ts` and this page changes with it. It is deliberately
 * outside `(portal)` — no permission, no sidebar — so anyone building a screen
 * can open `/brand` and check their work.
 */

const BRAND_COLORS = [
  {
    name: 'Ironclad Blue',
    hex: '#011E41',
    pantone: 'PANTONE 282 C',
    role: 'Primary. The spine of the brand — solid buttons, active navigation, headings.',
    onDark: false,
  },
  {
    name: 'Apex Blue',
    hex: '#004A98',
    pantone: 'PANTONE 2945 C',
    role: 'Active and informational — links, focus rings, selected state.',
    onDark: false,
  },
  {
    name: 'Dark Sapphire',
    hex: '#002169',
    pantone: 'PANTONE 280 C',
    role: 'Deep support. Full-bleed sections and the second stop of the brand gradient.',
    onDark: false,
  },
  {
    name: 'Foundational White',
    hex: '#DCE3EB',
    pantone: 'PANTONE 656 C',
    role: 'The cool light ground. Washes, secondary surfaces, inverse text on navy.',
    onDark: true,
  },
  {
    name: 'Worksite Blaze',
    hex: '#E0592A',
    pantone: 'PANTONE 7579 C',
    role: 'The single high-energy accent. One CTA per view, and eyebrow labels. Never decoration.',
    onDark: false,
  },
  {
    name: 'Sustainable Green',
    hex: '#2C9942',
    pantone: 'PANTONE 7739 C',
    role: 'Positive and on-track — completed, approved, healthy.',
    onDark: false,
  },
];

const NEUTRALS = [
  { name: 'White', hex: '#FFFFFF' },
  { name: 'Mist', hex: '#EEF2F6' },
  { name: 'Cloud', hex: '#DCE3EB' },
  { name: 'Steel', hex: '#B7C2D0' },
  { name: 'Slate', hex: '#7D8BA0' },
  { name: 'Graphite', hex: '#3B4A63' },
  { name: 'Ink', hex: '#011E41' },
];

const VALUES = [
  {
    value: 'Strength',
    line: 'Built to carry weight.',
    inTheUI:
      'Navy does the load-bearing. Corners stay low (10px), shadows stay soft and navy-tinted, and nothing bounces. The interface should feel engineered, not decorated.',
  },
  {
    value: 'Trust',
    line: 'Say what is true, plainly.',
    inTheUI:
      'Status is never carried by colour alone — every pill pairs a colour with a label and a shape. Numbers are concrete, copy is sentence case, and destructive actions always name what they will destroy.',
  },
  {
    value: 'Growth',
    line: 'Room to scale.',
    inTheUI:
      'One accent, used once per view, so the next action is always obvious. Tokens over hardcoded values, so a new module inherits the brand instead of reinventing it.',
  },
];

const STATUS = [
  { name: 'Info', cls: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/25', hex: '#004A98' },
  { name: 'Positive', cls: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/25', hex: '#2C9942' },
  { name: 'Warning', cls: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/25', hex: '#D47C17' },
  { name: 'Critical', cls: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/25', hex: '#C33A50' },
  { name: 'Accent', cls: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/25', hex: '#E0592A' },
  { name: 'Neutral', cls: 'bg-slate-500/10 text-slate-600 dark:text-slate-300 border-slate-500/25', hex: '#7D8BA0' },
];

const RADII = [
  { name: 'xs', px: '2px' },
  { name: 'sm', px: '4px' },
  { name: 'md', px: '6px' },
  { name: 'card', px: '10px' },
  { name: 'xl', px: '16px' },
  { name: 'pill', px: '999px' },
];

// Written out in full — Tailwind scans for literal class names, so a
// template-built `shadow-${name}` would never be generated.
const SHADOWS = [
  { name: 'isi-xs', cls: 'shadow-isi-xs' },
  { name: 'isi-sm', cls: 'shadow-isi-sm' },
  { name: 'isi-md', cls: 'shadow-isi-md' },
  { name: 'isi-lg', cls: 'shadow-isi-lg' },
  { name: 'isi-xl', cls: 'shadow-isi-xl' },
];

function Section({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-10">
      <p className="isi-eyebrow">{eyebrow}</p>
      <h2 className="mt-2 text-[26px] font-bold tracking-heading text-foreground">{title}</h2>
      {lede && <p className="mt-2 max-w-[62ch] text-[15px] text-muted-foreground">{lede}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero — a solid navy panel with the monogram watermark, the brand's
          stand-in for photography. */}
      <header className="isi-brand-panel">
        <div className="mx-auto max-w-[1100px] px-6 py-16">
          <BrandMark size={52} />
          <p className="isi-eyebrow mt-8">ISI Group design system</p>
          <h1 className="mt-3 max-w-[20ch] text-[46px] font-bold leading-[1.06] tracking-display">
            Strength. Trust. Growth.
          </h1>
          <p className="mt-4 max-w-[58ch] text-[17px] leading-relaxed text-isi-foundational">
            The brand as this portal implements it. Everything on this page is rendered from the
            same tokens the product uses, so what you see here is what ships.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-[1100px] space-y-14 px-6 py-14">
        <Section
          eyebrow="What we stand for"
          title="Core values, and where they land in the interface"
          lede="A value that doesn't change a design decision isn't a value. Each one below names the decision it governs."
        >
          <div className="grid gap-4 md:grid-cols-3">
            {VALUES.map((v) => (
              <article
                key={v.value}
                className="rounded-card border border-border bg-card p-6 shadow-isi-sm"
              >
                <h3 className="text-[20px] font-bold tracking-heading text-foreground">{v.value}</h3>
                <p className="mt-1 text-[14px] font-medium text-brand-accent">{v.line}</p>
                <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{v.inTheUI}</p>
              </article>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Colour"
          title="Six brand colours"
          lede="Pantone-backed and fixed. Everything else in the system — every ramp, every status tint — is derived from these."
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BRAND_COLORS.map((c) => (
              <article
                key={c.hex}
                className="overflow-hidden rounded-card border border-border bg-card shadow-isi-sm"
              >
                <div
                  className="flex h-28 items-end p-4"
                  style={{ backgroundColor: c.hex, color: c.onDark ? '#011E41' : '#FFFFFF' }}
                >
                  <span className="font-mono text-[13px] font-medium">{c.hex}</span>
                </div>
                <div className="p-4">
                  <h3 className="text-[15px] font-bold text-foreground">{c.name}</h3>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                    {c.pantone}
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{c.role}</p>
                </div>
              </article>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Colour"
          title="Navy-derived neutrals"
          lede="There is no pure grey in this brand. Every neutral is pulled toward Ironclad Blue, which is why the whole portal reads cool rather than washed out."
        >
          <div className="overflow-hidden rounded-card border border-border shadow-isi-sm">
            <div className="grid grid-cols-7">
              {NEUTRALS.map((n) => (
                <div key={n.hex} className="h-20" style={{ backgroundColor: n.hex }} />
              ))}
            </div>
            <div className="grid grid-cols-7 bg-card">
              {NEUTRALS.map((n) => (
                <div key={n.hex} className="border-l border-border p-2 first:border-l-0">
                  <p className="text-[11px] font-semibold text-foreground">{n.name}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{n.hex}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Colour"
          title="Status"
          lede="Status is never carried by colour alone. Each tone always ships with a label, and severity-bearing states also carry a shape."
        >
          <div className="flex flex-wrap gap-3">
            {STATUS.map((s) => (
              <span
                key={s.name}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] font-semibold ${s.cls}`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: s.hex }}
                  aria-hidden
                />
                {s.name}
                <span className="font-mono text-[10px] opacity-70">{s.hex}</span>
              </span>
            ))}
          </div>
        </Section>

        <Section
          eyebrow="Type"
          title="ABC Ginto, and MiSans Khmer alongside it"
          lede="One family carries display, UI and body. Khmer is folded into the same font stack by unicode-range, so Khmer copy renders correctly with no markup change."
        >
          <div className="space-y-6 rounded-card border border-border bg-card p-7 shadow-isi-sm">
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">Display · 46px · Bold · -0.02em</p>
              <p className="mt-1 text-[46px] font-bold leading-[1.06] tracking-display text-foreground">
                Building the industrial backbone
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">Heading · 26px · Bold · -0.01em</p>
              <p className="mt-1 text-[26px] font-bold tracking-heading text-foreground">
                An integrated group across the value chain
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">Body · 16px · Regular · 1.6</p>
              <p className="mt-1 max-w-[62ch] text-[16px] leading-[1.6] text-foreground">
                Six divisions across steel, land, industrial parks and construction — integrated
                end-to-end, delivered at scale.
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Khmer · MiSans Khmer · 16px · 1.9 line-height
              </p>
              <p className="mt-1 max-w-[62ch] font-khmer text-[16px] leading-[1.9] text-foreground">
                ក្រុមហ៊ុន អាយ អេស អាយ គ្រុប — សំណង់ និង ដែកថែប សម្រាប់ កម្ពុជា។
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">
                Eyebrow · 12px · Bold · 0.14em · uppercase · Worksite Blaze
              </p>
              <p className="isi-eyebrow mt-1">What we do</p>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Form"
          title="Corners, elevation, motion"
          lede="Low and engineered. Shadows are navy-tinted rather than grey, and motion is functional — fades and small translates, never a bounce."
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-card border border-border bg-card p-6 shadow-isi-sm">
              <h3 className="text-[14px] font-bold text-foreground">Radius</h3>
              <div className="mt-4 flex flex-wrap gap-4">
                {RADII.map((r) => (
                  <div key={r.name} className="text-center">
                    <div
                      className="h-14 w-14 border border-border bg-secondary"
                      style={{ borderRadius: r.px }}
                    />
                    <p className="mt-1.5 text-[11px] font-semibold text-foreground">{r.name}</p>
                    <p className="font-mono text-[10px] text-muted-foreground">{r.px}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-border bg-card p-6 shadow-isi-sm">
              <h3 className="text-[14px] font-bold text-foreground">Elevation</h3>
              <div className="mt-4 flex flex-wrap gap-5">
                {SHADOWS.map((s) => (
                  <div key={s.name} className="text-center">
                    <div className={`h-14 w-14 rounded-card bg-card ${s.cls}`} />
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground">{s.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Application"
          title="The marks"
          lede="The lockup carries the values line. Use the glyph alone when the wordmark is already present, or when the space is smaller than about 120px wide."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center justify-center rounded-card border border-border bg-card p-10 shadow-isi-sm">
              <BrandLockup width={280} />
            </div>
            <div className="isi-brand-panel flex items-center justify-center rounded-card p-10">
              <BrandMark size={72} />
            </div>
          </div>
        </Section>

        <Section
          eyebrow="Rules"
          title="How to build with this"
          lede="Three habits keep the portal on brand without anyone policing it."
        >
          <ol className="space-y-3 text-[15px] leading-relaxed text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">Reach for a token, never a hex.</span>{' '}
              The Tailwind palette is already the brand — <code className="font-mono text-[13px]">bg-blue-600</code>{' '}
              is Apex Blue, <code className="font-mono text-[13px]">text-gray-500</code> is Slate. A
              literal hex in a component is the one thing that will drift.
            </li>
            <li>
              <span className="font-semibold text-foreground">One Worksite Blaze per view.</span>{' '}
              The accent marks the single action you want taken. A second one cancels the first.
            </li>
            <li>
              <span className="font-semibold text-foreground">New colour? Add it upstream.</span>{' '}
              Name it in <code className="font-mono text-[13px]">src/styles/isi-brand.css</code>,
              map it in <code className="font-mono text-[13px]">globals.css</code>, expose it in{' '}
              <code className="font-mono text-[13px]">tailwind.config.ts</code>. Then it exists for
              everyone, in both themes.
            </li>
          </ol>
        </Section>
      </main>
    </div>
  );
}
