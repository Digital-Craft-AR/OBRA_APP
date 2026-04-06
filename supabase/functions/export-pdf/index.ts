import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Stub for PDF export (Puppeteer) proxy. Requires valid Supabase JWT (verify_jwt).
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
