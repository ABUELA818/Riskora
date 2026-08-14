/** @type {import('tailwindcss').Config} */
//
// Riskora Design System — "Deep Ink + Amber Signal"
// ---------------------------------------------------------------------------
// Palette:
//   ink-*      Dark charcoal/navy surfaces for the sidebar, topbar accents,
//              and the auth hero panel (ink-950 darkest -> ink-800 lightest).
//   canvas     Warm off-white app background (replaces flat gray eduBg).
//   brand-*    Amber/gold signal color for primary actions, active nav pill,
//              focus rings and key accents (replaces eduPurple everywhere).
//   risk-*     Muted, "designed" semantic scale for student risk levels:
//              risk-low (emerald), risk-medium (ochre, distinct from brand
//              amber), risk-high (rose/garnet). Each has -bg/-fg/-border.
// Typography:
//   font-display -> Sora (headings, KPI numbers, page titles)
//   font-sans    -> Inter (body copy, tables, forms) — Tailwind default
// `eduPurple`/`eduBg` are kept as deprecated aliases mapped onto the new
// tokens so any not-yet-migrated class reference still renders on-brand.
// ---------------------------------------------------------------------------
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0b0e14',
          900: '#12161f',
          800: '#1a1f2b',
          700: '#242a38',
        },
        canvas: '#f6f5f2',
        brand: {
          50: '#fbf3e4',
          100: '#f6e6c4',
          200: '#eccd8d',
          300: '#e3b563',
          400: '#daa347',
          500: '#d99a3f',
          600: '#b87b2c',
          700: '#946123',
        },
        risk: {
          low: '#4f9d6e',
          'low-bg': '#e7f3ec',
          'low-fg': '#2f6a48',
          'low-border': '#bfe0cd',
          medium: '#c78a2e',
          'medium-bg': '#faf0dd',
          'medium-fg': '#8a5c17',
          'medium-border': '#eecf9e',
          high: '#c25a52',
          'high-bg': '#f8e8e6',
          'high-fg': '#8f362f',
          'high-border': '#eabab4',
        },
        // Deprecated aliases — kept so unmigrated classes stay on-brand.
        eduPurple: '#d99a3f',
        eduBg: '#f6f5f2',
      },
      fontFamily: {
        display: ['Sora', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(15, 15, 15, 0.04), 0 8px 24px -8px rgba(15, 15, 15, 0.08)',
      },
    },
  },
  plugins: [],
}
