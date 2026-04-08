export const CONTENT_LOCALE_OPTIONS = ["es", "pt-BR", "en-US", "en-GB"] as const;
export type ContentLocale = (typeof CONTENT_LOCALE_OPTIONS)[number];

export const CONTENT_SOURCE_OPTIONS = ["ai", "upload"] as const;
export type ContentSource = (typeof CONTENT_SOURCE_OPTIONS)[number];

export function isContentLocale(value: string): value is ContentLocale {
  return CONTENT_LOCALE_OPTIONS.includes(value as ContentLocale);
}

export function isContentSource(value: string): value is ContentSource {
  return CONTENT_SOURCE_OPTIONS.includes(value as ContentSource);
}
