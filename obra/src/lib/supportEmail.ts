const DEFAULT_SUPPORT_EMAIL = "support@obra.app";

function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Support email shown in Help page and used for mailto links.
 * Uses a single env-backed source so ops can switch per environment.
 */
export function getSupportEmail(): string {
  const configured = import.meta.env.VITE_SUPPORT_EMAIL?.trim();
  if (!configured) return DEFAULT_SUPPORT_EMAIL;
  return looksLikeEmail(configured) ? configured : DEFAULT_SUPPORT_EMAIL;
}

export { DEFAULT_SUPPORT_EMAIL };
