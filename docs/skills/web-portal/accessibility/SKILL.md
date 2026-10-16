---
name: accessibility
description: Make web apps accessible to WCAG 2.2 AA — semantic HTML, keyboard navigation, focus management, ARIA usage, forms and error announcements, color contrast, screen reader support, accessible dialogs/menus/tables/charts, and automated a11y testing with axe. Use this skill whenever building or reviewing any UI component, form, modal, navigation, or when the user mentions a11y, WCAG, screen readers, keyboard support, or compliance (ADA, EAA, Section 508).
---

# Accessibility (WCAG 2.2 AA)

Accessibility is built in from the markup up. **Use native HTML first; ARIA only fills gaps.** "No ARIA is better than bad ARIA."

## Foundations
- `<html lang="en">`; unique descriptive `<title>` per page.
- Landmarks: `<header>`, `<nav aria-label="Main">`, `<main id="main">`, `<footer>`. One `<main>`.
- Skip link as first focusable element: `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>`.
- Heading order logical (one `h1`, no skipped levels).
- Buttons do things (`<button>`), links go places (`<a href>`). Never `<div onClick>`.

## Keyboard
- Everything operable with Tab/Shift+Tab, Enter, Space, Esc, arrow keys (in composite widgets).
- Visible focus: `focus-visible:ring-2` — never `outline: none` without replacement.
- Focus not obscured by sticky headers (`scroll-padding-top`).
- Logical tab order = DOM order; avoid positive `tabIndex`.
- Target size ≥ 24×24 CSS px (WCAG 2.2).

## Focus management
- Dialog open → focus first field/heading; trap focus; Esc closes; return focus to trigger.
- Route change (client nav) → move focus to the `h1` or announce page title.
- After deleting an item → move focus to a sensible neighbor.
Use Radix/React Aria primitives that do this correctly.

## Names, roles, states
```tsx
<button aria-label="Close dialog"><XIcon aria-hidden /></button>
<button aria-expanded={open} aria-controls="filters">Filters</button>
<button aria-pressed={bold}>Bold</button>
<nav aria-label="Breadcrumb"><ol>…<li><a aria-current="page">Settings</a></li></ol></nav>
```
Decorative images: `alt=""`. Informative: concise `alt` describing purpose. Icons next to text: `aria-hidden`.

## Forms
```tsx
<label htmlFor="email">Email</label>
<input id="email" type="email" autoComplete="email" required
  aria-invalid={!!error} aria-describedby={error ? "email-err" : "email-hint"} />
<p id="email-hint">We'll never share it.</p>
{error && <p id="email-err" role="alert">{error}</p>}
```
- On submit with errors: show summary at top, focus it, link to each field.
- Group radios/checkboxes in `<fieldset><legend>`.
- Don't rely on placeholder as label; don't use color alone for errors (add icon/text).
- Avoid redundant entry; allow paste in password/OTP fields (WCAG 2.2 accessible authentication).

## Live regions
```tsx
<div aria-live="polite" className="sr-only">{statusMessage}</div>   // "3 results found", "Saved"
```
Use `role="alert"` (assertive) only for urgent errors. Toast libs must announce.

## Color & motion
- Text contrast ≥ 4.5:1 (≥3:1 for large text ≥24px/19px bold); UI components & focus indicators ≥ 3:1.
- Don't convey meaning by color alone (status badges include text/icon).
- Respect `prefers-reduced-motion`: `motion-safe:animate-…`.
- Support 200% zoom and 320px width reflow without horizontal scrolling.

## Components
- **Tables**: `<table>`, `<caption>`, `<th scope="col">`; sortable header is a `<button>` inside `<th>` with `aria-sort`.
- **Tabs**: `role="tablist"/"tab"/"tabpanel"`, arrow-key navigation (use a primitive).
- **Combobox/autocomplete**: use React Aria / Radix / Downshift.
- **Charts**: text summary + accessible data table alternative.
- **Loading**: `aria-busy="true"` on region; skeletons `aria-hidden`.
- **Icon-only buttons**: accessible name + tooltip.

## Testing
Automated (catches ~30–40%):
```ts
// Playwright
import AxeBuilder from "@axe-core/playwright";
const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a","wcag2aa","wcag22aa"]).analyze();
expect(violations).toEqual([]);
```
Plus `eslint-plugin-jsx-a11y`, Storybook a11y addon, Testing Library `getByRole` queries (fail if roles are wrong).

Manual (required):
1. Unplug the mouse: complete key flows by keyboard.
2. Screen reader pass: VoiceOver (Safari) / NVDA (Firefox/Chrome).
3. 200% zoom and 320px width.
4. High contrast / forced-colors mode.

## Checklist
- [ ] Semantic landmarks, headings, skip link
- [ ] All interactive elements keyboard reachable with visible focus
- [ ] Every control has an accessible name
- [ ] Forms: labels, described errors, focus on error
- [ ] Dialog focus trap and return
- [ ] Contrast AA in light & dark
- [ ] Reduced motion honored
- [ ] axe clean in CI + manual SR check
