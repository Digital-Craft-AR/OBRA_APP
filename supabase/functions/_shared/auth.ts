/**
 * Shared JWT extraction and validation helpers used by browser-callable Edge Functions.
 *
 * All browser-callable functions use `verify_jwt = true` in config.toml so the gateway
 * rejects invalid tokens early. Handlers call these helpers as defense-in-depth to
 * obtain the validated user record and enforce ownership checks.
 */

export type SupabaseAuthClient = {
  auth: {
    getUser: (jwt: string) => Promise<{
      data: { user: { id: string } | null };
      error: { message: string } | null;
    }>;
  };
};

export type AuthOk = { ok: true; userId: string; jwt: string };
export type AuthFail = { ok: false; status: 401; error: string; detail: string };
export type AuthResult = AuthOk | AuthFail;

/** Extracts the Bearer token from the Authorization header, or returns null. */
export function extractBearer(req: Request): string | null {
  const h = req.headers.get("Authorization");
  if (!h?.startsWith("Bearer ")) return null;
  return h.slice(7);
}

/**
 * Validates a JWT string with the provided Supabase auth client.
 * Returns the userId on success, or a 401 AuthFail on any error.
 */
export async function validateJwt(
  jwt: string,
  client: SupabaseAuthClient,
): Promise<AuthResult> {
  const {
    data: { user },
    error,
  } = await client.auth.getUser(jwt);
  if (error || !user) {
    return {
      ok: false,
      status: 401,
      error: "unauthorized",
      detail: "invalid_or_expired_session",
    };
  }
  return { ok: true, userId: user.id, jwt };
}

/**
 * Extracts the Bearer token from the request and validates it.
 * Returns AuthOk with userId, or AuthFail with status 401.
 *
 * Usage in handlers:
 *   const authClient = createClient(supabaseUrl, anonKey);
 *   const auth = await extractAndValidateJwt(req, authClient);
 *   if (!auth.ok) return json({ error: auth.error, detail: auth.detail }, auth.status);
 *   const { userId } = auth;
 */
export async function extractAndValidateJwt(
  req: Request,
  client: SupabaseAuthClient,
): Promise<AuthResult> {
  const jwt = extractBearer(req);
  if (!jwt) {
    return { ok: false, status: 401, error: "unauthorized", detail: "missing_bearer" };
  }
  return validateJwt(jwt, client);
}
