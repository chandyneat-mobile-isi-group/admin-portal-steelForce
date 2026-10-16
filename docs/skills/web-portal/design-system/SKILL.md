---
name: design-system
description: Build and maintain a scalable design system — design tokens (color, typography, spacing, radius, shadow), theming and dark mode, Tailwind configuration, shadcn/ui and Radix primitives, component APIs with variants (cva), documentation in Storybook, and consistency governance. Use this skill whenever the user creates reusable components, sets up Tailwind/theme/dark mode, defines colors or tokens, builds a component library, or wants the UI to be consistent.
---

# Design System

A design system = **tokens** (decisions) + **components** (implementations) + **docs** (usage). Components consume tokens only — never raw hex values.

## Token layers
1. **Primitive**: `blue-600 = oklch(0.55 0.18 255)`
2. **Semantic**: `--primary`, `--background`, `--foreground`, `--muted`, `--border`, `--destructive`, `--ring`
3. **Component** (optional): `--button-height-md`
Only semantic tokens are used in components; theming swaps semantic values.

## CSS variables + Tailwind v4
```css
/* app/globals.css */
@import "tailwindcss";
@custom-variant dark (&:where(.dark, .dark *));

:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.55 0.18 255);
  --primary-foreground: oklch(0.98 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.55 0 0);
  --border: oklch(0.92 0 0);
  --destructive: oklch(0.58 0.22 27);
  --ring: oklch(0.55 0.18 255);
  --radius: 0.5rem;
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: oklch(0.7 0.15 255);
  --primary-foreground: oklch(0.145 0 0);
  --muted: oklch(0.27 0 0);
  --muted-foreground: oklch(0.71 0 0);
  --border: oklch(0.3 0 0);
}
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-ring: var(--ring);
  --radius-md: var(--radius);
  --font-sans: var(--font-inter), system-ui, sans-serif;
}
```
(Tailwind v3: map the same variables in `tailwind.config.ts` `theme.extend.colors`.)
Dark mode: `next-themes` with `attribute="class"`, `suppressHydrationWarning` on `<html>`. Verify contrast in both themes.

## Scales
- Spacing: 4px base (1,2,3,4,6,8,12,16 → 4–64px)
- Radius: sm 4, md 8, lg 12, full
- Type: xs 12, sm 14, base 16, lg 18, xl 20, 2xl 24, 3xl 30; line-height 1.5 body, 1.2 headings
- Shadow: 3 elevations max
- Z-index tokens: dropdown 50, sticky 100, overlay 200, modal 300, toast 400

## Component API with cva
```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils"; // clsx + tailwind-merge

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border border-border bg-background hover:bg-muted",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
      },
      size: { sm: "h-8 px-3", md: "h-10 px-4", lg: "h-11 px-6", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);
export interface ButtonProps extends React.ComponentPropsWithoutRef<"button">, VariantProps<typeof buttonVariants> { asChild?: boolean; loading?: boolean }
export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <Spinner className="size-4 animate-spin" aria-hidden />}{children}
    </Comp>
  );
}
```

## Component principles
- Build on accessible primitives (Radix / React Aria / shadcn/ui) — don't hand-roll dialogs, menus, comboboxes.
- Props mirror native elements; forward `className` and rest props; support `ref` (React 19 passes ref as prop).
- Variants are finite and named by intent (`destructive`), not appearance (`red`).
- Compound components for complex widgets: `<Card><CardHeader/><CardContent/></Card>`.
- Every interactive component has visible focus, disabled, loading states.

## Core inventory for a portal
Button, IconButton, Input, Textarea, Select, Combobox, Checkbox, Radio, Switch, Label, FormField (label+control+hint+error), Card, Badge, Avatar, Tabs, Dialog, Sheet/Drawer, DropdownMenu, Tooltip, Popover, Toast, Alert, Table/DataTable, Pagination, Skeleton, EmptyState, Breadcrumbs, Sidebar, CommandPalette, DatePicker.

## Documentation
- Storybook story per component with all variants/states + a11y addon + interaction tests.
- Usage guidance: when to use / when not to use.
- Visual regression (Chromatic or Playwright screenshots).

## Governance
- Lint ban on arbitrary values (`[#123456]`, `mt-[13px]`) except approved cases.
- New variant requires justification; prefer composition.
- Semver the package if shared; changelog.

## Checklist
- [ ] No hard-coded colors in components
- [ ] Light/dark both pass contrast
- [ ] Components accessible via primitives, keyboard tested
- [ ] Variants via cva; `cn` merges classes
- [ ] Storybook covers states
