/**
 * Canonical layout / surface classes aligned with CONVENCIONES.md and Figma design system tokens.
 */

/** Auth card — matches Figma login (`figma_make` / mac-latte figma.site): rounded-2xl, p-10, flex gap-6 */
export const authCardClass =
  "flex w-full max-w-auth-card flex-col gap-6 rounded-2xl border border-obra-blue-100 bg-white p-10 shadow-card";

/** Text inputs (not buttons — those stay pill / rounded-full) */
export const inputFieldClass =
  "h-11 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 py-2 text-sm text-obra-neutral-900 placeholder:text-obra-neutral-400 outline-none ring-obra-blue-700 focus:border-obra-blue-700 focus:ring-2";

/** Blocking shell inner panel */
export const shellPanelClass =
  "w-full max-w-lg space-y-6 rounded-card border border-obra-blue-100 bg-white p-8 shadow-card";

/** Dashboard / app content card */
export const contentCardClass =
  "max-w-lg rounded-card border border-obra-blue-100 bg-white p-6 shadow-card";
