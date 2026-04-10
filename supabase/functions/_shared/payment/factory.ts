import type { BillingAdapter } from "./BillingAdapter.ts";
import { MercadoPagoAdapter } from "./mercadopago/MercadoPagoAdapter.ts";
import { ObraPayAdapter } from "./obrapay/ObraPayAdapter.ts";

/**
 * Active billing provider:
 * - `mercadopago` (default) — real Mercado Pago API.
 * - `obrapay` — mock adapter for dev/staging only (no MP calls).
 */
export function getBillingAdapter(): BillingAdapter {
  const id = (Deno.env.get("PAYMENT_PROVIDER") ?? "mercadopago").trim().toLowerCase();
  if (id === "mercadopago") {
    return new MercadoPagoAdapter();
  }
  if (id === "obrapay") {
    return new ObraPayAdapter();
  }
  throw new Error(`Unsupported PAYMENT_PROVIDER: ${id}`);
}
