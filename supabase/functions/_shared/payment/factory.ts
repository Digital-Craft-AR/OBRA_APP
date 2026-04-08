import type { BillingAdapter } from "./BillingAdapter.ts";
import { MercadoPagoAdapter } from "./mercadopago/MercadoPagoAdapter.ts";

/**
 * Active billing provider. Set `PAYMENT_PROVIDER=mercadopago` (default) or extend when adding gateways.
 */
export function getBillingAdapter(): BillingAdapter {
  const id = (Deno.env.get("PAYMENT_PROVIDER") ?? "mercadopago").trim().toLowerCase();
  if (id === "mercadopago") {
    return new MercadoPagoAdapter();
  }
  throw new Error(`Unsupported PAYMENT_PROVIDER: ${id}`);
}
