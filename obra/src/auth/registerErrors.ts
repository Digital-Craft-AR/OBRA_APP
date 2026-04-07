/**
 * Maps Supabase Auth sign-up errors to stable i18n keys (#33).
 */
export function mapSignUpErrorToKey(message: string): "registerAlreadyExists" | "registerPasswordWeak" | "registerError" {
  const m = message.toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already registered") ||
    m.includes("already exists")
  ) {
    return "registerAlreadyExists";
  }
  if (
    (m.includes("password") && m.includes("weak")) ||
    m.includes("at least") ||
    m.includes("least 6") ||
    m.includes("least 8")
  ) {
    return "registerPasswordWeak";
  }
  return "registerError";
}
