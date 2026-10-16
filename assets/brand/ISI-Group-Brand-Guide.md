# ISI Group Design System

A design system for **ISI Group**, a multi-division industrial and real-estate conglomerate. The brand is navy-led, confident and engineered — built to signal permanence, scale and integration across six operating divisions (Steel, Land, Park, E&C, SEZ, Building Solutions).

> **Note on scope:** the provided source is a *brand identity kit* — logos, a six-color Pantone system, and the ABC Ginto typeface — with no product code or live-site screens. The tokens, components and the corporate-website UI kit here are built to that brand spec. Where a real product surface didn't exist, it's constructed to brand rather than recreated. Flagged substitutions are listed under **Caveats**.

## Sources provided
- `Brand Kit/Ginto/Ginto/` — ABC Ginto webfonts (Regular / Medium / Bold, `.otf`/`.woff`/`.woff2`). Copied to `assets/fonts/`.
- `Brand Kit/SVG/SVG/` — logo SVGs for the group and each division (three variants each). Copied to `assets/logos/`.
- `Brand Kit/ISI-Group-Color-System.pdf` — the six-color Pantone system. Copied to `_source/` and transcribed into `tokens/colors.css`.
- User-uploaded `MiSansKhmer-*.otf` (10 weights, Thin–Heavy) — the brand's Khmer-script companion typeface. Copied to `assets/fonts/khmer/`.

---

## Content fundamentals
How ISI Group writes.

- **Voice:** corporate, self-assured, plain-spoken. Statements of fact and capability, not hype. "Building the industrial backbone of a growing economy."
- **Person:** speaks as **"we"** (the group) to a **"you"** that is an investor, tenant, partner or government counterpart. B2B / institutional, not consumer.
- **Tone:** grounded and industrial — words like *integrated, at scale, end-to-end, value chain, backbone, lasting*. Confidence without adjectives-for-adjectives'-sake.
- **Casing:** Sentence case for headlines and body. **UPPERCASE only** for short eyebrow labels above headings, always with wide tracking (`--ls-label`, 0.14em). Division names are proper nouns: *ISI Steel*, *ISI Park*.
- **Numbers:** used sparingly and concretely — division count, people employed, hectares under development, founding year. No decorative statistics.
- **Emoji:** never. Not part of the brand.
- **Vibe:** a serious infrastructure group that builds real things. Every claim should be one it could defend to a board.

Example copy:
- Eyebrow → headline: `WHAT WE DO` → "An integrated group across the value chain"
- Hero: "Six divisions across steel, land, industrial parks and construction — integrated end-to-end, delivered at scale."
- CTA: "Partner with ISI Group" · "Investor relations" · "Get in touch"

---

## Visual foundations

**Color.** A navy spine with two accent families. Primary is **Ironclad Blue `#011E41`**, supported by **Apex Blue `#004A98`** (active/links) and **Dark Sapphire `#002169`** (deep sections). **Foundational White `#DCE3EB`** is the cool light ground. Two expressive accents: **Worksite Blaze `#E0592A`** (the single high-energy CTA / eyebrow color) and **Sustainable Green `#2C9942`** (eco / positive). Neutrals are navy-derived (never pure grey) — Mist, Cloud, Steel, Slate, Graphite, Ink. Imagery direction is cool and corporate; where photography is absent, solid navy panels carry a faint monogram watermark instead of gradients.

**Type.** Primary typeface: **ABC Ginto** (Dinamo) — a geometric grotesque — across display, UI and body. Display and headings are **Bold (700)** with tight tracking (`-0.02em` display, `-0.01em` headings). Body is **Regular (400)** at 16px / 1.6. **Medium (500)** for buttons, labels and form labels. **Khmer script:** **MiSans Khmer** (10 weights, Thin 100 – Heavy 900) is the Khmer companion — declared both as its own `"MiSans Khmer"` family and, via `unicode-range`, as the Khmer-script fallback *inside* `"ABC Ginto"` (`--font-sans`), so existing components render Khmer with zero markup changes. Khmer body copy uses a taller line-height (`--lh-khmer`, 1.9) to clear stacked vowels/subscripts.

**Spacing & layout.** 4px base grid. Content maxes at 1200px with 32px gutters. Generous vertical section rhythm (64–104px). Grids with `gap` — not inline flow.

**Corners.** Low and engineered — `2/4/6/10/16px` plus a pill. Buttons and inputs use 6px; cards 10px. Nothing bubbly.

**Elevation.** Soft, **navy-tinted** shadows (`rgba(1,30,65,…)`) — never neutral grey. Five steps xs→xl. Cards are elevated (shadow-md) or outline; hover lifts interactive cards `translateY(-2px)` to shadow-lg.

**Borders.** 1px, navy-derived (`--border-subtle` #e2e8f0, `--border-default` steel). Focus uses a 3px Apex-Blue ring (`--focus-ring`).

**Motion.** Restrained and functional. Standard ease `cubic-bezier(0.2,0,0,1)`, entrance ease-out `cubic-bezier(0.16,1,0.3,1)`; durations 120/200/320ms. Fades and small translate/scale pops (dialogs) — no bounces, no infinite loops.

**Interaction states.** Hover = darker fill for solid buttons (`--primary-hover`), tinted wash for secondary/ghost. Press = `translateY(1px)`. Toggles/switches animate the knob with ease-out. Transparency + blur reserved for the sticky header (92% white + 10px blur) and the dialog scrim (navy 45% + 2px blur).

---

## Iconography
The brand kit ships **no icon set**. Approach:
- **Substitution (flagged):** UI icons use **[Lucide](https://lucide.dev)** via CDN (`unpkg.com/lucide`) — a clean, consistent 2px-stroke outline set that matches the engineered, geometric feel of Ginto. Recommended size 18–20px in `IconButton`, 16px inline in buttons.
- **Brand mark as icon:** the circular **ISI monogram** (`ISILogoMark` in the UI kit) doubles as a compact brand glyph — used in division cards and as a faint hero watermark.
- **No emoji, no Unicode-symbol icons.** SVG only.
- If ISI has a house icon library, drop it into `assets/icons/` and update `IconButton` usage — Lucide is a stand-in until then.

---

## Tokens
`styles.css` (root) is the single entry point; it `@import`s everything:
- `tokens/fonts.css` — ABC Ginto `@font-face` (400/500/700).
- `tokens/colors.css` — brand palette (exact Pantone hexes) + neutral ramp + semantic aliases (surface/text/border/status).
- `tokens/typography.css` — font stacks, weights, type scale, line-heights, tracking.
- `tokens/spacing.css` — 4px spacing scale, radii, navy-tinted shadows, layout, motion.
- `tokens/base.css` — minimal element resets, link colors, `.isi-eyebrow` utility.

## Components
React primitives under `components/<group>/`. Import from the compiled bundle: `const { Button } = window.ISIGroupDesignSystem_919b22`.

- **Actions** — `Button`, `IconButton`
- **Forms** — `Input`, `Select`, `Checkbox`, `Radio`, `Switch`
- **Data display** — `Card`, `Badge`, `Tag`
- **Navigation** — `Tabs`
- **Overlay** — `Dialog`, `Tooltip`

Each directory has `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one `@dsCard` showcase HTML.

## UI kits
- `ui_kits/corporate-website/` — interactive ISI Group corporate site (home · divisions · sustainability · contact), composed from the primitives. See its `README.md`.

## Assets
- `assets/fonts/` — ABC Ginto webfonts.
- `assets/logos/` — group + division logo SVGs, plus `mark-group-inline.svg` (recolorable, currentColor fill).

## Design System tab
18 specimen cards across **Brand** (logos, divisions), **Colors** (core / accents / neutrals / status), **Type** (display / headings / body), **Spacing** (scale / radius / elevation), and **Components** (buttons / forms / cards-badges-tags / tabs / dialog-tooltip).

---

## Caveats & substitutions
- **Icons:** Lucide (CDN) substituted for a missing brand icon set. Replace with ISI's own if one exists.
- **Fonts:** ABC Ginto is the real provided font — no substitution needed. It is a licensed typeface (Dinamo); ensure your license covers web use before shipping.
- **UI kit:** built to brand spec, not recreated from a live product (none was provided).
- **Photography:** none provided; solid brand panels + monogram watermark used as placeholders.
