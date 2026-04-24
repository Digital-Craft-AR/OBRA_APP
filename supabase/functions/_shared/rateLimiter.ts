/**
 * Fixed-window per-user rate limiter backed by the `rate_limit_buckets` PostgreSQL table.
 *
 * Usage in an Edge Function handler (after JWT validation, before expensive work):
 *
 *   const rl = await checkRateLimit(admin, userId, "ai-generate-content");
 *   if (!rl.allowed) return rateLimitResponse(rl);
 *
 * Limits and windows are configurable per endpoint via environment variables; defaults
 * are conservative but production-safe. Document any env-var overrides in README.md.
 */

export type AdminSupabaseClient = {
  rpc: (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
};

export type RateLimitResult =
  | { allowed: true; count: number; limit: number }
  | { allowed: false; count: number; limit: number; retryAfter: number };

/** Per-endpoint default configuration: [windowSeconds, maxCount]. */
const ENDPOINT_DEFAULTS: Record<string, [number, number]> = {
  "ai-generate-content":   [60,   10],
  "ai-generate-index":     [60,   10],
  "ai-optimize":           [60,   15],
  "ai-split-proposal":     [60,   10],
  "image-generate":        [60,    8],
  "export-pdf":            [300,   5],
  "export-zip":            [300,   3],
  "manuscript-upload-parse": [300, 5],
  "export-user-data":      [3600,  5],
};

/** Env-var name for the per-endpoint limit override, e.g. RATE_LIMIT_AI_GENERATE_CONTENT=20. */
function limitEnvVar(endpoint: string): string {
  return "RATE_LIMIT_" + endpoint.toUpperCase().replace(/-/g, "_");
}

/**
 * Reads per-endpoint config from environment variables, falling back to hardcoded defaults.
 * Only the max count is overridable via env; window width is fixed per endpoint type.
 */
function resolveConfig(endpoint: string): [number, number] {
  const defaults = ENDPOINT_DEFAULTS[endpoint] ?? [60, 20];
  const [windowSeconds, defaultMax] = defaults;
  const envVal = Deno.env.get(limitEnvVar(endpoint));
  const max = envVal !== undefined && envVal !== "" ? Math.max(1, parseInt(envVal, 10) || defaultMax) : defaultMax;
  return [windowSeconds, max];
}

/**
 * Checks and increments the per-user rate-limit counter for `endpoint`.
 * Returns a `RateLimitResult` — call `rateLimitResponse()` when `allowed` is false.
 *
 * Logs a structured warning (no PII) when the limit is exceeded.
 */
export async function checkRateLimit(
  admin: AdminSupabaseClient,
  userId: string,
  endpoint: string,
): Promise<RateLimitResult> {
  const [windowSeconds, maxCount] = resolveConfig(endpoint);

  const { data, error } = await admin.rpc("obra_rate_limit_check", {
    p_user_id:        userId,
    p_endpoint:       endpoint,
    p_window_seconds: windowSeconds,
    p_max_count:      maxCount,
  });

  if (error) {
    // If the RPC fails (e.g. migration not yet applied in dev), allow the request
    // and log the issue so it surfaces in Edge Function logs without blocking the user.
    console.warn("rate_limit_check_failed", { endpoint, error: error.message });
    return { allowed: true, count: 0, limit: maxCount };
  }

  const result = data as { allowed: boolean; count: number; limit: number; retry_after?: number };

  if (!result.allowed) {
    console.warn("rate_limit_exceeded", {
      endpoint,
      count:       result.count,
      limit:       result.limit,
      retry_after: result.retry_after,
    });
    return {
      allowed:    false,
      count:      result.count,
      limit:      result.limit,
      retryAfter: result.retry_after ?? windowSeconds,
    };
  }

  return { allowed: true, count: result.count, limit: result.limit };
}

const DEFAULT_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Builds a 429 JSON response with CORS and a `Retry-After` header.
 * Must only be called when `result.allowed === false`.
 *
 * CORS headers are included by default so the browser can read the response
 * body and the frontend can display the correct rate-limit toast.
 */
export function rateLimitResponse(
  result: RateLimitResult & { allowed: false },
  corsHeaders: Record<string, string> = DEFAULT_CORS_HEADERS,
): Response {
  return new Response(
    JSON.stringify({
      error:       "rate_limited",
      detail:      "too_many_requests",
      retry_after: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After":  String(result.retryAfter),
        ...corsHeaders,
      },
    },
  );
}
