/**
 * OBRA DESIGN TOKENS — Single source of truth
 *
 * These values are mirrored as Tailwind utilities via @theme in index.css.
 * Always use the Tailwind class names in components, not the raw hex.
 *
 * ============================================================
 * HEX → TAILWIND TOKEN LOOKUP TABLE
 * ============================================================
 *   #F4F8FC  → bg-obra-blue-50   / bg-obra-canvas (same value as white in components)
 *   #E8F0F7  → bg-obra-blue-100
 *   #2D6499  → bg-obra-blue-700  / text-obra-blue-700 / border-obra-blue-700
 *   #204970  → bg-obra-blue-900  / text-obra-blue-900  (sidebar base)
 *   #0F2438  → bg-obra-blue-950  / text-obra-blue-950
 *   #CCFF00  → bg-obra-green-400 / text-obra-green-400 / border-obra-green-400
 *   #F8FAFB  → bg-obra-neutral-100
 *   #DDE8F0  → border-obra-neutral-200
 *   #9CA3AF  → text-obra-neutral-400
 *   #5A7A94  → text-obra-neutral-600
 *   #0F2438  → text-obra-neutral-900
 *   #204970  → bg-obra-sidebar     (sidebar — flat, no gradient)
 *   #FFFFFF  → bg-white / bg-obra-canvas (main content)
 *
 * Opacity shorthand (use / syntax, not rgba):
 *   rgba(255,255,255,0.5)      → white/50
 *   rgba(255,255,255,0.08)     → white/8
 *   rgba(200,230,43,0.15)      → obra-green-400/15
 *   rgba(45,100,153,0.20)      → obra-blue-700/20
 *   rgba(32,73,112,0.06)       → obra-blue-900/6
 *
 * Spacing tokens:
 *   w-[280px] / ml-[280px]  → w-sidebar / ml-sidebar  (--spacing-sidebar = 17.5rem)
 *   max-w-[420px]           → max-w-auth-card          (--spacing-auth-card = 26.25rem)
 *
 * ============================================================
 * BUTTON VARIANTS (only 3 — no others permitted)
 * ============================================================
 *   primary  → bg-obra-blue-700 text-white rounded-pill
 *              hover:bg-obra-blue-900
 *              Use for: primary actions on light backgrounds
 *
 *   cta      → bg-obra-green-400 text-obra-blue-950 rounded-pill
 *              hover:brightness-105
 *              Use for: main call-to-action, "Crear", "Siguiente", "Generar"
 *
 *   ghost    → bg-transparent text-obra-blue-700 rounded-pill
 *              hover:bg-obra-blue-50
 *              Use for: secondary/cancel actions, icon buttons
 *
 * ============================================================
 * INPUT STYLE (only 1 — same everywhere in the app)
 * ============================================================
 *   bg-obra-neutral-100 border border-obra-neutral-200 rounded-input
 *   text-obra-neutral-900 placeholder:text-obra-neutral-400
 *   focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700
 *   h-11 px-3 py-2 text-sm w-full outline-none transition-all
 *
 * ============================================================
 * CARD STYLE (only 1 base + 1 hover state)
 * ============================================================
 *   base  → bg-white border border-obra-blue-100 rounded-card shadow-card
 *
 *   hover → hover:border-obra-blue-700 hover:shadow-card-hover
 *           hover:-translate-y-1 (interactive cards only)
 *
 * ============================================================
 * BADGE VARIANTS (only 2)
 * ============================================================
 *   default → bg-obra-blue-100 text-obra-blue-700 rounded-pill
 *             Use for: status labels, counts, tags
 *
 *   warning → bg-yellow-50 text-yellow-700 rounded-pill
 *             Use for: alerts, pending states
 *
 * ============================================================
 * TEXT HIERARCHY (strict — no exceptions)
 * ============================================================
 *   Page title    → text-2xl font-display font-bold text-obra-blue-950
 *   Section title → text-lg font-semibold text-obra-blue-950
 *   Body          → text-sm font-body text-obra-neutral-900
 *   Caption/meta  → text-xs text-obra-neutral-600
 *   Minimum size  → text-sm (14px) for body; text-xs only for captions
 *
 * ============================================================
 * STRUCTURAL COLORS
 * ============================================================
 *   App canvas (main bg) → #FFFFFF  (bg-white — pure white, no tint)
 *   Sidebar / navbar     → #204970  flat (bg-obra-blue-900, no gradient)
 *   Cards                → #FFFFFF  (bg-white)
 *   Card border          → #E8F0F7  (border-obra-blue-100)
 */

export const colors = {
  // Structural
  canvas:        '#FFFFFF',
  sidebar:       '#204970',
  sidebarEnd:    '#204970',  // no gradient — same value

  // Blue scale (navy base: #204970)
  blue50:        '#F4F8FC',
  blue100:       '#E8F0F7',
  blue700:       '#2D6499',
  blue900:       '#204970',
  blue950:       '#0F2438',

  // Accent (tennis ball)
  green400:      '#CCFF00',

  // Neutral scale
  neutral100:    '#F8FAFB',
  neutral200:    '#DDE8F0',
  neutral400:    '#9CA3AF',
  neutral600:    '#5A7A94',
  neutral900:    '#0F2438',

  // Semantic
  success:       '#059669',
  error:         '#EF4444',
  white:         '#FFFFFF',
}

export const fonts = {
  display: "'Fraunces', serif",
  body:    "'Plus Jakarta Sans', sans-serif",
}

export const radius = {
  pill:  '9999px',
  input: '0.75rem',
  card:  '0.875rem',
  sm:    '6px',
  md:    '10px',
  lg:    '16px',
}

export const shadows = {
  card:      '0 2px 12px rgba(32, 73, 112, 0.08)',
  cardHover: '0 8px 32px rgba(45, 100, 153, 0.15)',
  sm:        '0 1px 3px rgba(32, 73, 112, 0.08)',
}

export const obra = { colors, fonts, radius, shadows }
export default obra
