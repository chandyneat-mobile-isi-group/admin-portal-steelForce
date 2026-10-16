# Icons

**The ISI Group brand kit ships no icon set.** This folder is a placeholder so
there is an obvious home for one if the brand ever gains house icons.

Until then the portal uses **[Lucide](https://lucide.dev)** via `lucide-react`,
already a dependency. It is a 2px-stroke outline set whose geometric
construction sits well next to ABC Ginto — the brand kit itself flags Lucide as
the intended stand-in.

House rules:

- Import from `lucide-react`. Do not paste raw SVG into components.
- 18–20px for standalone icon buttons, 16px inline beside text.
- Colour comes from `currentColor`, so icons inherit the brand text token.
- **No emoji, ever.** Not part of this brand.

If ISI produces a house icon set, drop the SVGs here, add a step to
`scripts/build-brand-assets.py` to copy them into `public/brand/icons/`, and
replace the Lucide imports module by module.
