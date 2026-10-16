# Brand assets

The masters. Everything the ISI Group brand needs to survive on its own — this
folder is the reason the portal no longer depends on
`docs/system-design/ISI Group Design System/`, which can be deleted.

Nothing here is served to the browser. `public/brand/` holds the subset that
ships, and it is **generated** from this folder:

```
npm run brand:build      # assets/  →  public/brand/
```

## What's here

```
assets/
  fonts/
    latin/    ABC Ginto — Regular / Medium / Bold, .woff2 + .woff
    khmer/    MiSans Khmer — all 10 weights, Thin (100) → Heavy (900), .otf
  logos/
    group/      ISI Group corporate marks (3 variants) + mark-group-inline.svg,
                which fills with `currentColor` and so recolours anywhere
    divisions/  the six operating divisions, plus the two named ISI Park sites
    product/    Primary.png / Square.png — the SteelForce lockup, in its
                original bright blue. Every navy mark in public/brand/logos/ is
                derived from these two files, so keep them.
  icons/        see icons/README.md — the brand ships no icon set
  brand/
    ISI-Group-Brand-Guide.md   the brand kit's own guide: voice, tone, content
                               fundamentals, visual foundations, caveats
    tokens/                    the kit's original CSS tokens, kept as
                               provenance for src/styles/isi-brand.css
```

## What ships, and what doesn't

`npm run brand:build` copies only what the stylesheet declares:

- **Fonts** — 3 Latin weights (×2 formats) and 4 Khmer weights
  (Regular / Medium / Semibold / Bold). The other 6 Khmer weights stay here.
  To ship one, add an `@font-face` in `src/styles/isi-brand.css` **and** add
  the weight to `KHMER_WEIGHTS` in the build script.
- **Logos** — all group and division SVGs, plus six product marks the script
  generates by recolouring `logos/product/`.

The recolouring step needs Pillow (`pip install Pillow`). Without it the script
copies fonts and SVGs and leaves the existing PNGs alone.

## Licensing

**ABC Ginto is a licensed typeface from [Dinamo](https://abcdinamo.com).** It is
served publicly from `public/brand/fonts/`. Confirm the licence covers web use,
at this portal's pageview volume, before production.

MiSans Khmer was supplied with the brand kit. Check its terms the same way.

## Related

- `docs/design-system.md` — how the brand is implemented in code
- `src/styles/isi-brand.css` — the token layer these assets feed
- `src/lib/brand/assets.ts` — import paths from here, never hardcode them
- `/brand` in the running app — the rendered reference
