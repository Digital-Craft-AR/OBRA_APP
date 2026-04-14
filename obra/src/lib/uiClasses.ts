/**
 * Canonical layout / surface classes aligned with CONVENCIONES.md and Figma design system tokens.
 */

/** Shared white card for auth + entitlement blocking shells (same max width, padding, radius). */
const authAndShellCardClass =
  "flex w-full max-w-auth-card flex-col gap-6 rounded-card border border-obra-neutral-200 bg-white p-10";

/** Auth card — matches Figma login (`figma_make` / mac-latte figma.site): rounded-2xl, p-10, flex gap-6 */
export const authCardClass = authAndShellCardClass;

/** Logo sizing shared by auth cards and entitlement blocking shells */
export const authChromeLogoImgClass = "h-10 w-auto max-w-[200px] object-contain";

/** Text inputs (not buttons — those stay pill / rounded-full) */
export const inputFieldClass =
  "h-11 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 py-2 text-sm text-obra-neutral-900 placeholder:text-obra-neutral-400 outline-none ring-obra-blue-700 focus:border-obra-blue-700 focus:ring-2";

/** Blocking shell inner panel — same surface as auth cards */
export const shellPanelClass = authAndShellCardClass;

/** Dashboard / app content card */
export const contentCardClass =
  "max-w-lg rounded-card border border-obra-neutral-200 bg-white p-6";
