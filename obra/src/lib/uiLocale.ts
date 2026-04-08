/** Supported app UI locales (PRD: es, pt-BR). */
export type UiLocale = "es" | "pt-BR";

const ALLOWED: readonly UiLocale[] = ["es", "pt-BR"];

export function normalizeUiLocale(raw: string | null | undefined): UiLocale {
  if (raw === "pt-BR" || raw === "es") {
    return raw;
  }
  return "es";
}

export function isUiLocale(value: string): value is UiLocale {
  return (ALLOWED as readonly string[]).includes(value);
}
