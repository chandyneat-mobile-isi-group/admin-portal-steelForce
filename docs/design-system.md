# Design system

The ISI Group brand, as this portal implements it. This file is about the
code; the assets and the brand guide it was built from live in
[`assets/`](../assets/README.md), which is self-contained — the original kit
under `docs/system-design/` is no longer referenced by anything and can be
deleted.

Open **`/brand`** in the running app for the rendered reference — swatches,
type specimens, radii and elevation, all drawn from the live tokens. That page
cannot go stale, because it reads the same variables the product does.

## Core values

The lockup carries them: **Strength. Trust. Growth.** Each one is a design
decision, not a slogan:

| Value | The decision it governs |
| --- | --- |
| Strength | Navy does the load-bearing. Low corners (10px), soft navy-tinted shadows, no bounce in motion. |
| Trust | Status never rides on colour alone — a colour always ships with a label, and severity states also carry a shape. |
| Growth | One accent per view, so the next action is obvious. Tokens over hardcoded values, so new modules inherit the brand. |

## The three layers

Colour flows in one direction. Add upstream, consume downstream.

```
src/styles/isi-brand.css     the brand    --isi-ironclad-blue: #011e41
        ↓
src/app/globals.css          the roles    --primary: 213 97% 13%
        ↓
tailwind.config.ts           the utilities  bg-primary, text-brand-accent, bg-blue-600
```

1. **`src/styles/isi-brand.css`** — the six Pantone-backed brand colours, the
   navy-derived neutrals, the `@font-face` declarations, and the few derived
   tints dark mode needs. Nothing here knows about the product.
2. **`src/app/globals.css`** — maps those onto the semantic slots the UI
   consumes (`--primary`, `--card`, `--ring`, …) for both light and dark. The
   brand hex is named in a comment beside every value.
3. **`tailwind.config.ts`** — exposes all of it as utilities.

## The palette is already the brand

Tailwind's stock hue families have been **replaced** by brand-derived ramps.
The portal had roughly 1,500 call sites written against the default palette;
rather than rewrite each one — and watch the next one drift back — the palette
itself was re-pointed:

| You write | You get |
| --- | --- |
| `blue-*` | Apex Blue → Dark Sapphire → Ironclad |
| `sky-*`, `cyan-*` | a lighter cut of the same family |
| `indigo-*` | Dark Sapphire |
| `green-*`, `emerald-*`, `teal-*`, `lime-*` | Sustainable Green |
| `orange-*` | Worksite Blaze |
| `amber-*`, `yellow-*` | Ember — warm caution, kept yellower than Blaze so warning reads apart from CTA |
| `red-*` | the system's one added colour, `#C0362C` |
| `rose-*`, `pink-*` | Crimson, a pinker cut of the same |
| `violet-*`, `purple-*`, `fuchsia-*` | Royal — pulled toward navy so it stops clashing |
| `gray-*`, `slate-*`, `zinc-*`, `neutral-*`, `stone-*` | navy-derived neutrals. **There is no pure grey in this brand.** |

Two further sets are available when a surface is deliberately brand-led:

- `isi-ironclad`, `isi-apex`, `isi-sapphire`, `isi-foundational`, `isi-blaze`,
  `isi-green`, plus `isi-mist / cloud / steel / slate / graphite / ink` — fixed
  values, identical in both themes.
- `brand`, `brand-deep`, `brand-accent`, `brand-info`, `brand-success`,
  `brand-warning`, `brand-danger` — theme-aware, they follow light/dark.

## Type

**ABC Ginto** is the single Latin family (400 / 500 / 700). **MiSans Khmer** is
declared twice: as its own family (`font-khmer`), and by `unicode-range`
*inside* `"ABC Ginto"` — so Khmer copy renders correctly anywhere in the app
with no markup change. Khmer body copy gets a 1.9 line-height to clear stacked
vowels and subscripts.

| Utility | Use |
| --- | --- |
| `tracking-display` (-0.02em) | display sizes |
| `tracking-heading` (-0.01em) | headings — applied to `h1`–`h6` already |
| `tracking-label` (0.14em) | eyebrows only, always uppercase |
| `.isi-eyebrow` | the whole eyebrow treatment: 12px, bold, tracked, uppercase, Worksite Blaze |

> ABC Ginto is licensed from Dinamo. The webfonts are served publicly from
> `public/brand/fonts/` — confirm the licence covers web use for the number of
> pageviews this portal will see before it goes to production. All 10 MiSans
> Khmer weights are archived in `assets/fonts/khmer/`; four are shipped.

## Form and motion

- **Radius** — `rounded-card` is 10px and is the radius for every card, panel,
  toolbar and overlay. `--radius` (0.625rem) drives shadcn's `sm`/`md`/`lg`.
  Corners are low and engineered; nothing is bubbly.
- **Elevation** — `shadow-isi-xs` … `shadow-isi-xl`. All navy-tinted
  (`rgba(1,30,65,…)`). The brand has no grey shadow.
- **Motion** — `ease-standard` and `ease-entrance`, with `duration-fast|med|slow`
  (120/200/320ms). Fades and small translates. No bounces, no infinite loops.
- **Blur** — reserved for the sticky header (`.glass`) and the dialog scrim.

## Assets

`assets/` holds the masters — every font weight, every logo variant, the brand
guide, the kit's original tokens. `public/brand/` holds the subset the browser
downloads and is **generated**:

```
npm run brand:build      # assets/  →  public/brand/
```

Import paths from `src/lib/brand/assets.ts` (`BRAND_LOGOS`, `DIVISION_LOGOS`,
`DIVISION_NAMES`) rather than writing `/brand/...` strings at call sites.

The brand ships **no icon set** — the portal uses Lucide via `lucide-react`.
See `assets/icons/README.md`.

## Marks

`src/components/shared/brand-logo.tsx`:

- `<BrandMark on="brand" | "surface" />` — the ISI glyph on a transparent
  ground, white for navy tiles and navy for light surfaces.
- `<BrandLockup />` — the full lockup with the values line; swaps to its
  inverse cut under `.dark` via CSS, so the correct mark is in the first paint.

Both are generated from `assets/logos/product/`, recoloured from the original
bright blue to brand navy. The group and division logos ship alongside them
under `public/brand/logos/{group,divisions}/`.

## Adding a colour

1. Name it in `src/styles/isi-brand.css`.
2. Give it a role in `src/app/globals.css`, in **both** `:root` and `.dark`.
3. Expose it in `tailwind.config.ts`.

A literal hex inside a component is the one thing guaranteed to drift, and it
will be invisible in dark mode. There should be none left in `src/`.
