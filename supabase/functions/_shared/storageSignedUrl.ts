/**
 * Local Supabase may return Storage signed URLs using the internal Docker hostname
 * (e.g. http://kong:8000/...). Browsers cannot resolve "kong". Rewrite the origin
 * to the public API URL from SUPABASE_URL (same value the app uses to reach the API).
 */
export function rewriteStorageSignedUrlForPublicAccess(
  signedUrl: string | null | undefined,
  publicSupabaseApiUrl: string | undefined,
): string | null {
  if (signedUrl == null || signedUrl === "") return null;
  if (!publicSupabaseApiUrl?.trim()) return signedUrl;

  let base: URL;
  try {
    base = new URL(publicSupabaseApiUrl.replace(/\/$/, ""));
  } catch {
    return signedUrl;
  }

  let u: URL;
  try {
    u = new URL(signedUrl);
  } catch {
    return signedUrl;
  }

  if (u.hostname !== "kong") {
    return signedUrl;
  }

  u.protocol = base.protocol;
  u.hostname = base.hostname;
  u.port = base.port;
  return u.toString();
}
