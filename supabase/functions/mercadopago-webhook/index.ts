import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * Stub: validates presence of a webhook secret env + signature header only.
 * Full Mercado Pago verification is implemented in a follow-up (#26 / payments epic).
 */
Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const secret = Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET");
  const sig =
    req.headers.get("x-signature") ??
    req.headers.get("x-mp-signature") ??
    req.headers.get("x-mercadopago-signature");

  if (!secret || !sig) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "not_implemented" }), {
    status: 501,
    headers: { "Content-Type": "application/json" },
  });
});
