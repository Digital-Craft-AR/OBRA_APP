/**
 * Design tokens — semantic colors, radii, shadows, layout (see CONVENCIONES.md).
 * Tailwind mirrors these in `index.css` @theme as `obra-*` and named utilities.
 * Source parity: Figma design system (figma.site) / figma_make theme.
 */

export const tokens = {
  blue950: "#0F2438",
  blue900: "#204970",
  blue700: "#2D6499",
  blue100: "#E8F0F7",
  blue50: "#F4F8FC",
  green400: "#C8E62B",
  neutral900: "#0F2438",
  neutral600: "#5A7A94",
  neutral400: "#9CA3AF",
  neutral200: "#DDE8F0",
  neutral100: "#F8FAFB",
} as const;

export const radius = {
  input: "8px",
  card: "12px",
  modal: "16px",
} as const;

export const shadows = {
  card: "0px 1px 3px rgba(15,36,56,0.08), 0px 1px 2px rgba(15,36,56,0.04)",
  cardHover: "0px 4px 12px rgba(15,36,56,0.12), 0px 2px 4px rgba(15,36,56,0.06)",
} as const;

export const layout = {
  sidebarWidth: "280px",
  authCardMaxWidth: "420px",
  wizardMaxWidth: "720px",
  contentMaxWidth: "900px",
  toastMaxWidth: "360px",
} as const;

export const fontSizes = {
  "2xs": "0.6875rem",
  label: "0.8125rem",
  sm: "0.875rem",
} as const;
