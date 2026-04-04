/**
 * Obra design tokens — TypeScript mirror of the @theme values in index.css.
 * Use Tailwind classes (`bg-obra-blue-900`, `text-obra-green-400`) in JSX;
 * import from here only when you need raw values in JS logic (e.g. charts, canvas).
 */

export const colors = {
  "obra-blue-950": "#0F2438",
  "obra-blue-900": "#204970",
  "obra-blue-700": "#2D6499",
  "obra-blue-100": "#E8F0F7",
  "obra-blue-50": "#F4F8FC",

  "obra-green-400": "#C8E62B",

  "obra-neutral-900": "#0F2438",
  "obra-neutral-600": "#5A7A94",
  "obra-neutral-400": "#9CA3AF",
  "obra-neutral-200": "#DDE8F0",
  "obra-neutral-100": "#F8FAFB",
} as const

export const fonts = {
  display: '"Fraunces", serif',
  body: '"Plus Jakarta Sans", sans-serif',
} as const

export const radii = {
  pill: "9999px",
  card: "1rem",
  input: "0.5rem",
} as const

export const spacing = {
  sidebar: "280px",
  authCard: "420px",
} as const
