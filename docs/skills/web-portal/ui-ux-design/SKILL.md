---
name: ui-ux-design
description: Design clear, usable web portal interfaces — information architecture, navigation, dashboards, data tables, forms, empty/loading/error states, visual hierarchy, typography, spacing, color, feedback, and microcopy. Use this skill whenever the user asks to design or improve a page, screen, dashboard, admin panel, form, table, onboarding flow, or says the UI "looks bad", "is confusing", or wants it "more modern/professional".
---

# UI/UX Design for Web Portals

Portals are tools. Optimize for **clarity, speed of task completion, and trust** over decoration.

## Process
1. **Who & what**: primary users, their top 3 tasks, frequency.
2. **IA**: group features by user goal; ≤7 top-level nav items.
3. **Sketch the layout** with real content (not lorem ipsum).
4. **Design all states** (below) before polishing.
5. **Review** against the heuristics checklist.

## Layout patterns
- **App shell**: left sidebar (collapsible) + top bar (search, notifications, user menu) + content with page header (title, description, primary action top-right, breadcrumbs).
- Content max-width ~1200–1440px for dashboards; ~680px for reading/forms.
- Consistent 4/8px spacing scale; generous section spacing (24–48px).

## Visual hierarchy
- One primary action per view (filled button). Secondary = outline/ghost. Destructive = red, confirm needed.
- Type scale: 12 / 14 (body in dense UIs) / 16 / 20 / 24 / 30. Max 2 weights typically (400, 600).
- Color: neutral base (90% of UI), one brand accent, semantic colors (success, warning, danger, info). Text contrast ≥4.5:1.
- Use size, weight, and spacing before color to create hierarchy.

## Every data view needs these states
| State | Design |
|---|---|
| Loading | Skeletons matching final layout (avoid spinners for >300ms content) |
| Empty (first use) | Illustration/icon + explanation + primary CTA |
| Empty (no results) | "No results for 'x'" + clear filters action |
| Error | What happened, what to do, retry button |
| Partial / stale | Inline notice, keep showing last data |
| Success | Toast for background actions; inline confirmation for forms |
| Permission denied | Explain and who to ask |

## Dashboards
- Top: 3–5 KPI cards (value, delta vs period, sparkline).
- Middle: primary trend chart with time range selector.
- Bottom: actionable table (recent items needing attention).
- Every metric answers "so what?" — link to the detail view.

## Data tables
- Left-align text, right-align numbers (tabular-nums), consistent date formats.
- Sticky header; sortable columns with indicators; row hover.
- Toolbar: search, filters (as chips), column visibility, export.
- Bulk selection with contextual action bar.
- Pagination or virtual scroll; show total count.
- Row actions in a kebab menu; primary row click → detail.
- On mobile: collapse to cards.

## Forms
- Single column; labels above inputs; mark optional (not required) fields when most are required.
- Group related fields with headings; long forms → steps with progress.
- Validate on blur, re-validate on change after first error; error text below field, specific ("Email must include @").
- Disable submit only while submitting (show spinner in button); keep inputs editable after errors.
- Sensible defaults, autofill attributes, input types (`email`, `tel`, `inputmode="numeric"`).
- Warn on unsaved changes.

## Feedback & timing
- <100ms: feels instant. <1s: no indicator needed. 1–10s: spinner/progress. >10s: background job + notification.
- Optimistic UI for low-risk actions; undo instead of confirm for reversible deletes.
- Confirmation dialogs name the object and consequence: "Delete project 'Apollo'? This removes 42 files."

## Microcopy
- Buttons are verbs: "Create invoice", not "Submit".
- Plain language, sentence case, no blame ("We couldn't save", not "You failed").
- Consistent terminology across the product.

## Nielsen heuristics review
- [ ] System status visible
- [ ] Matches user's language
- [ ] Undo/escape available
- [ ] Consistent patterns & terms
- [ ] Error prevention (constraints, confirmations)
- [ ] Recognition over recall (visible options, recent items)
- [ ] Shortcuts for experts (⌘K command palette, keyboard nav)
- [ ] Minimal, focused design
- [ ] Helpful error recovery
- [ ] Contextual help where needed

## Anti-patterns
- Multiple competing primary buttons
- Icon-only buttons without tooltips/labels
- Placeholder-as-label
- Modals on top of modals
- Toasts for errors that need action
- Gray text on colored backgrounds with low contrast
