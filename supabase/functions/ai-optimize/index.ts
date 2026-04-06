import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Stub for short wizard “optimize with AI” proxy. Requires valid Supabase JWT (verify_jwt).
 * Returns 401 until a real Claude integration is wired (#26 follow-ups).
 */
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "unauthorized", detail: "stub" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
});
