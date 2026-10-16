import type { Config } from 'tailwindcss';

/**
 * ISI Group design system — Tailwind layer.
 *
 * Three things happen here:
 *
 * 1. `colors.isi` exposes the six brand colours and the navy-derived neutrals
 *    by name, for when a surface is deliberately brand-led.
 * 2. `colors.brand|blaze|success|info` bind to the CSS variables in
 *    `globals.css`, so they follow light/dark automatically.
 * 3. Tailwind's stock hue families are *replaced* by brand-derived ramps. The
 *    portal had ~1,500 `bg-blue-500` / `text-gray-600` style call sites written
 *    against the default palette; rather than rewrite each one (and have the
 *    next one drift back), the palette itself is re-pointed at the brand. A
 *    `blue` is now Apex Blue, a `gray` is navy-derived, an `orange` is Worksite
 *    Blaze. Semantics survive, the colours become ours.
 *
 * Adding a new colour: put it in `src/styles/isi-brand.css` first.
 */

/** Navy-derived neutrals. The brand has no pure grey. */
const navy = {
  50: '#f6f8fa',
  100: '#eef2f6', // Mist
  200: '#dce3eb', // Cloud / Foundational White
  300: '#ccd5e0',
  400: '#adbaca',
  500: '#7d8ba0', // Slate
  600: '#5b6a82',
  700: '#3b4a63', // Graphite
  800: '#22344f',
  900: '#12233d',
  950: '#011e41', // Ink / Ironclad Blue
} as const;

/** Apex Blue family — interactive, informational. Ends on the two brand navies. */
const apex = {
  50: '#eaf2fb',
  100: '#d3e4f7',
  200: '#a6c8ef',
  300: '#6fa6e2',
  400: '#3b84d1',
  500: '#0d63b5',
  600: '#004a98', // Apex Blue
  700: '#003c7c',
  800: '#002169', // Dark Sapphire
  900: '#011e41', // Ironclad Blue
  950: '#01152d',
} as const;

/** A lighter cut of the same family, so `sky` stays distinguishable from `blue`. */
const apexLight = {
  50: '#edf5fd',
  100: '#d8e9fa',
  200: '#b2d2f4',
  300: '#82b4e9',
  400: '#4f92da',
  500: '#2571c2',
  600: '#0b57a6',
  700: '#004a98',
  800: '#003a78',
  900: '#002f61',
  950: '#001f42',
} as const;

/** Dark Sapphire family — deep, institutional. */
const sapphire = {
  50: '#eaeffb',
  100: '#d5def6',
  200: '#adbdec',
  300: '#7f97dd',
  400: '#5271c8',
  500: '#2f4fae',
  600: '#1a3791',
  700: '#002169', // Dark Sapphire
  800: '#001b56',
  900: '#011640',
  950: '#010f2b',
} as const;

/** Sustainable Green — positive, eco, "on track". */
const green = {
  50: '#ecf7ee',
  100: '#d5edda',
  200: '#aedbb8',
  300: '#7dc48e',
  400: '#4cb063',
  500: '#2c9942', // Sustainable Green
  600: '#238036',
  700: '#1d662c',
  800: '#195023',
  900: '#14401d',
  950: '#08240f',
} as const;

/** Worksite Blaze — the single high-energy accent. CTAs, eyebrows, escalation. */
const blaze = {
  50: '#fdf1ec',
  100: '#fbdfd4',
  200: '#f7bda8',
  300: '#f0957a',
  400: '#e87450',
  500: '#e0592a', // Worksite Blaze
  600: '#c94a1f',
  700: '#a63b18',
  800: '#833016',
  900: '#6a2814',
  950: '#3a1309',
} as const;

/** Warm caution — kept yellower than Blaze so "warning" reads apart from "CTA". */
const ember = {
  50: '#fdf4e8',
  100: '#fae5c6',
  200: '#f5cd8c',
  300: '#eeb054',
  400: '#e5942c',
  500: '#d47c17',
  600: '#b36211',
  700: '#8d4b10',
  800: '#713c12',
  900: '#5d3212',
  950: '#341a08',
} as const;

/** Destructive. The brand kit ships no red; this is the system's one addition. */
const danger = {
  50: '#fcefee',
  100: '#f8dbd8',
  200: '#efb8b2',
  300: '#e28d85',
  400: '#d2635a',
  500: '#c0362c',
  600: '#a52c24',
  700: '#87241e',
  800: '#6c1e19',
  900: '#591a16',
  950: '#300b09',
} as const;

/** A pinker cut of danger, so `rose` and `red` stay separable. */
const crimson = {
  50: '#fdeef0',
  100: '#fad9dd',
  200: '#f2b3bb',
  300: '#e78694',
  400: '#d75c6e',
  500: '#c33a50',
  600: '#a72f41',
  700: '#882736',
  800: '#6d212d',
  900: '#5b1d27',
  950: '#320d14',
} as const;

/** Royal — for tier/segment accents. Pulled toward navy so it stops clashing. */
const royal = {
  50: '#f0effb',
  100: '#e0ddf6',
  200: '#c2bced',
  300: '#9e96de',
  400: '#7b71c9',
  500: '#5e53ae',
  600: '#4a4092',
  700: '#3b3376',
  800: '#2f295e',
  900: '#26214c',
  950: '#16122c',
} as const;

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--isi-font-sans)'],
        display: ['var(--isi-font-sans)'],
        khmer: ['var(--isi-font-khmer)'],
        mono: ['var(--isi-font-mono)'],
      },
      letterSpacing: {
        display: '-0.02em',
        heading: '-0.01em',
        label: '0.14em',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':
          'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'gradient-brand': 'var(--gradient-primary)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Single radius for every card, panel, toolbar and overlay surface.
        // Previously inlined as `style={{ borderRadius: '18px' }}` in 22 places,
        // which is how 18/20/16px variants crept in side by side. Now 10px —
        // the brand's card radius. Corners are low and engineered.
        card: '10px',
      },
      boxShadow: {
        // Navy-tinted and soft. The brand never uses a grey shadow.
        'isi-xs': '0 1px 2px rgba(1, 30, 65, 0.06)',
        'isi-sm': '0 1px 3px rgba(1, 30, 65, 0.10), 0 1px 2px rgba(1, 30, 65, 0.06)',
        'isi-md': '0 4px 12px rgba(1, 30, 65, 0.10), 0 2px 4px rgba(1, 30, 65, 0.06)',
        'isi-lg': '0 12px 28px rgba(1, 30, 65, 0.14), 0 4px 10px rgba(1, 30, 65, 0.08)',
        'isi-xl': '0 24px 56px rgba(1, 30, 65, 0.18)',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        entrance: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        fast: '120ms',
        med: '200ms',
        slow: '320ms',
      },
      colors: {
        // ── The brand, by name ──────────────────────────────────────────
        isi: {
          ironclad: '#011e41',
          apex: '#004a98',
          sapphire: '#002169',
          foundational: '#dce3eb',
          blaze: '#e0592a',
          green: '#2c9942',
          white: '#ffffff',
          mist: '#eef2f6',
          cloud: '#dce3eb',
          steel: '#b7c2d0',
          slate: '#7d8ba0',
          graphite: '#3b4a63',
          ink: '#011e41',
        },

        // ── The brand, by role (theme-aware) ────────────────────────────
        brand: {
          DEFAULT: 'hsl(var(--brand))',
          deep: 'hsl(var(--brand-deep))',
          accent: 'hsl(var(--brand-accent))',
          info: 'hsl(var(--brand-info))',
          success: 'hsl(var(--brand-success))',
          warning: 'hsl(var(--brand-warning))',
          danger: 'hsl(var(--brand-danger))',
        },

        // ── shadcn semantic slots ───────────────────────────────────────
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },

        // ── Stock hue families, re-pointed at the brand ─────────────────
        gray: navy,
        slate: navy,
        zinc: navy,
        neutral: navy,
        stone: navy,
        blue: apex,
        sky: apexLight,
        cyan: apexLight,
        indigo: sapphire,
        green,
        emerald: green,
        teal: green,
        lime: green,
        orange: blaze,
        amber: ember,
        yellow: ember,
        red: danger,
        rose: crimson,
        pink: crimson,
        violet: royal,
        purple: royal,
        fuchsia: royal,
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0',
          },
          to: {
            height: 'var(--radix-accordion-content-height)',
          },
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)',
          },
          to: {
            height: '0',
          },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
export default config;
