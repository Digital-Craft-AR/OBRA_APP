type SupportMailtoOptions = {
  subject?: string;
};

export function buildSupportMailtoHref(email: string, options?: SupportMailtoOptions): string {
  const base = `mailto:${email}`;
  const subject = options?.subject?.trim();
  if (!subject) return base;
  const params = new URLSearchParams({ subject });
  return `${base}?${params.toString()}`;
}
