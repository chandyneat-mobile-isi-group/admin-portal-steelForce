---
name: responsive-web
description: Build layouts that work on every screen — mobile-first CSS, Tailwind breakpoints, container queries, fluid typography with clamp, responsive navigation (sidebar → drawer), responsive tables and forms, touch targets, safe areas, viewport units, and cross-device testing. Use this skill whenever the user builds a layout or page, mentions mobile/tablet support, says something "breaks on mobile", or wants a responsive dashboard or portal.
---

# Responsive Web

Design **mobile-first**, let content decide breakpoints, and prefer intrinsic layouts (flex/grid that adapt) over many media queries.

## Breakpoints (Tailwind defaults)
`sm 640` · `md 768` · `lg 1024` · `xl 1280` · `2xl 1536`. Unprefixed classes = mobile; add prefixes to enhance upward.
```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">…</div>
```

## Intrinsic layouts (fewer breakpoints)
```css
.cards { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); }
```
```tsx
<div className="flex flex-wrap gap-2">…</div>   // toolbars wrap naturally
```

## Container queries (component-level responsiveness)
```tsx
<div className="@container">
  <div className="flex flex-col @md:flex-row @md:items-center">…</div>
</div>
```
Use for cards/widgets that appear in sidebars and main areas alike.

## Fluid type & space
```css
h1 { font-size: clamp(1.75rem, 1.2rem + 2.5vw, 3rem); }
.section { padding-block: clamp(2rem, 5vw, 5rem); }
```
Keep body text ≥16px on mobile (prevents iOS zoom on input focus).

## Portal shell pattern
- **≥lg**: persistent sidebar (collapsible to icons).
- **<lg**: top bar with hamburger → off-canvas drawer (`Sheet`), focus-trapped.
- Optional **bottom tab bar** on mobile for 3–5 primary destinations.
```tsx
<aside className="hidden lg:flex lg:w-64 lg:flex-col border-r">…</aside>
<header className="lg:hidden sticky top-0 flex h-14 items-center border-b px-4">
  <Sheet><SheetTrigger aria-label="Open menu"><Menu /></SheetTrigger><SheetContent side="left"><Nav /></SheetContent></Sheet>
</header>
<main className="min-w-0 flex-1 p-4 lg:p-8">…</main>
```
`min-w-0` on flex children prevents overflow from long content.

## Tables on small screens
Options, in order of preference:
1. Horizontal scroll container with sticky first column: `<div className="overflow-x-auto">`.
2. Hide low-priority columns: `hidden md:table-cell`.
3. Transform to card list below `md`.
Never let the page body scroll horizontally.

## Forms
- Full-width inputs on mobile; 2 columns only ≥md for short related fields.
- Correct `type`/`inputMode`/`autoComplete` to get the right keyboard.
- Sticky bottom action bar for long mobile forms.

## Touch & input
- Targets ≥44×44px on touch (min 24px per WCAG 2.2); spacing between targets.
- Don't rely on hover: `@media (hover: hover)` for hover-only affordances; Tailwind v4 `hover:` already applies only on hover-capable devices.
- Use `pointer: coarse` to enlarge controls where needed.

## Viewport & safe areas
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```
(Next.js: export `viewport` from layout.) Use `min-h-dvh` instead of `h-screen` (mobile URL bars). Pad fixed bars with `env(safe-area-inset-bottom)`.

## Media
- `next/image` with accurate `sizes`; `object-cover` inside aspect-ratio boxes (`aspect-video`).
- `<picture>` for art direction.
- Prevent overflow: `img, video { max-width: 100%; height: auto; }`.

## Modals
Full-screen sheets on mobile, centered dialogs on desktop. Ensure scrollable content inside with `max-h-[calc(100dvh-2rem)] overflow-y-auto`.

## Testing
- Widths: 320, 375, 414, 768, 1024, 1280, 1440+; landscape phone.
- Real devices (iOS Safari especially) + DevTools device mode.
- Playwright projects for `Pixel 7` and `iPhone 14` with screenshot comparisons.
- Check 200% zoom and long strings (German, emails, IDs) — use `break-words`/`truncate` with `title`.

## Checklist
- [ ] Mobile-first classes; no horizontal page scroll at 320px
- [ ] Navigation usable on mobile (drawer, focus trap)
- [ ] Tables have a small-screen strategy
- [ ] Touch targets adequate; no hover-only actions
- [ ] `dvh` + safe-area handled
- [ ] Images sized with `sizes`
- [ ] Tested on real iOS/Android
