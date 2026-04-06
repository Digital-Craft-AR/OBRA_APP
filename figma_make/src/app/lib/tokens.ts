/**
 * Obra Design System — Token Reference
 * ─────────────────────────────────────
 * Source of truth for all design values.
 * CSS tokens are defined in /src/styles/theme.css (@theme block).
 * Tailwind utilities (e.g. bg-obra-blue-900, rounded-card) are generated
 * from those @theme variables and must be used in components instead of
 * hardcoded values.
 *
 * This file re-exports every token as a typed constant so that:
 *  1. Logic code (e.g. inline styles for dynamic user-defined colors) can
 *     reference values without hardcoding strings.
 *  2. It serves as documentation alongside the CSS source.
 *
 * Rule: If a token is missing here and in theme.css, ADD it — never
 * hardcode values inline or use Tailwind bracket notation [value].
 */

/* ── Colors ──────────────────────────────────────────────────────────────── */
export const COLORS = {
  /** Darkest text / primary brand navy */
  obraBlue950: "#0F2438",
  /** Sidebar and nav background */
  obraBlue900: "#204970",
  /** Primary buttons, links, focus rings */
  obraBlue700: "#2D6499",
  /** Card borders, default badge backgrounds */
  obraBlue100: "#E8F0F7",
  /** Subtle page backgrounds */
  obraBlue50:  "#F4F8FC",
  /** CTA buttons, key highlights, credits badge */
  obraGreen400: "#C8E62B",
  /** Body text */
  obraNeutral900: "#0F2438",
  /** Secondary text, captions, metadata */
  obraNeutral600: "#5A7A94",
  /** Placeholder text */
  obraNeutral400: "#9CA3AF",
  /** Input borders */
  obraNeutral200: "#DDE8F0",
  /** Input backgrounds */
  obraNeutral100: "#F8FAFB",
  /** Main content area — pure white, no tint */
  white: "#FFFFFF",
} as const;

/* ── Typography ──────────────────────────────────────────────────────────── */
export const FONTS = {
  /** Display / headings — Fraunces (serif) → font-display */
  display: "'Fraunces', Georgia, serif",
  /** Body and UI copy — Plus Jakarta Sans (geometric sans) → font-body */
  body:    "'Plus Jakarta Sans', system-ui, sans-serif",
} as const;

export const FONT_SIZES = {
  /** 11px — micro labels, scaled-down preview UI → text-2xs */
  "2xs":   "0.6875rem",
  /** 12px — captions, metadata → text-xs */
  xs:      "0.75rem",
  /** 13px — form label per design spec → text-label */
  label:   "0.8125rem",
  /** 14px — body text minimum → text-sm */
  sm:      "0.875rem",
  /** 16px — base → text-base */
  base:    "1rem",
  /** 18px — section titles → text-lg */
  lg:      "1.125rem",
  /** 24px — page titles → text-2xl */
  "2xl":   "1.5rem",
} as const;

/* ── Spacing ─────────────────────────────────────────────────────────────── */
/**
 * Base unit: 4px. All spacing must be multiples of 4.
 * Use Tailwind's default numeric scale (p-1 = 4px, p-2 = 8px, …)
 * or a named token for semantically significant sizes.
 */
export const SPACING = {
  /** 4px */  xs:  "0.25rem",
  /** 8px */  sm:  "0.5rem",
  /** 12px */ md:  "0.75rem",
  /** 16px */ lg:  "1rem",
  /** 24px */ xl:  "1.5rem",
  /** 32px */ "2xl": "2rem",
  /** 40px */ "3xl": "2.5rem",
  /** 48px */ "4xl": "3rem",
} as const;

/* ── Border Radius ────────────────────────────────────────────────────────── */
export const RADIUS = {
  /** 8px  — inputs → rounded-input */
  input:  "8px",
  /** 12px — cards → rounded-card */
  card:   "12px",
  /** 9999px — buttons & badges (pill) → rounded-full */
  pill:   "9999px",
  /** 16px — modals → rounded-modal */
  modal:  "16px",
} as const;

/* ── Shadows ─────────────────────────────────────────────────────────────── */
export const SHADOWS = {
  /** Cards base state → shadow-card */
  card:      "0px 1px 3px rgba(15,36,56,0.08), 0px 1px 2px rgba(15,36,56,0.04)",
  /** Cards hover state → shadow-card-hover */
  cardHover: "0px 4px 12px rgba(15,36,56,0.12), 0px 2px 4px rgba(15,36,56,0.06)",
  /** Subtle elements → shadow-sm */
  sm:        "0px 1px 2px rgba(15,36,56,0.06)",
} as const;

/* ── Layout ──────────────────────────────────────────────────────────────── */
export const LAYOUT = {
  /** 280px — sidebar width → w-sidebar */
  sidebarWidth:     "280px",
  /** 420px — auth card max-width → max-w-auth-card */
  authCardMaxWidth: "420px",
  /** 720px — wizard content max-width → max-w-wizard */
  wizardMaxWidth:   "720px",
  /** 900px — showcase / main content max-width → max-w-content */
  contentMaxWidth:  "900px",
  /** 360px — toast notification max-width → max-w-toast */
  toastMaxWidth:    "360px",
  /** calc(100vw - 2rem) — full-bleed responsive modal → w-modal-full */
  modalFullWidth:   "calc(100vw - 2rem)",
} as const;

/* ── Tailwind Class Reference ────────────────────────────────────────────── */
/**
 * Canonical Tailwind utility classes for each design token.
 * Import and use these in components to avoid magic strings.
 *
 * Example:
 *   import { TW } from "@/lib/tokens";
 *   <div className={TW.card.base}>…</div>
 */
export const TW = {
  color: {
    blue950:      "text-obra-blue-950",
    blue900bg:    "bg-obra-blue-900",
    blue700:      "text-obra-blue-700",
    blue700bg:    "bg-obra-blue-700",
    green400bg:   "bg-obra-green-400",
    neutral600:   "text-obra-neutral-600",
    neutral400:   "text-obra-neutral-400",
  },
  font: {
    display: "font-display",
    body:    "font-body",
  },
  radius: {
    input: "rounded-input",
    card:  "rounded-card",
    pill:  "rounded-full",
    modal: "rounded-modal",
  },
  shadow: {
    card:      "shadow-card",
    cardHover: "shadow-card-hover",
  },
  layout: {
    sidebar:  "w-sidebar",
    content:  "max-w-content",
    toast:    "max-w-toast",
    modal:    "w-modal-full",
    wizard:   "max-w-wizard",
    authCard: "max-w-auth-card",
  },
  card: {
    base:    "bg-white border border-obra-blue-100 rounded-card shadow-card",
    hover:   "hover:border-obra-blue-700 hover:shadow-card-hover hover:-translate-y-0.5",
  },
  input: {
    base:    "bg-obra-neutral-100 border border-obra-neutral-200 rounded-input text-obra-neutral-900 placeholder:text-obra-neutral-400 focus:ring-2 focus:ring-obra-blue-700 focus:border-obra-blue-700",
    error:   "border-red-500 focus:ring-red-500 focus:border-red-500",
  },
  button: {
    primary:     "bg-obra-blue-700 text-white hover:bg-obra-blue-900 rounded-full",
    cta:         "bg-obra-green-400 text-obra-blue-950 hover:brightness-105 rounded-full",
    ghost:       "bg-transparent text-obra-blue-700 border border-obra-blue-700 hover:bg-obra-blue-50 rounded-full",
    destructive: "bg-red-500 text-white hover:bg-red-600 rounded-full",
  },
} as const;
