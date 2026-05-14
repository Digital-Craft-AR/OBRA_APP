import type { RecurringPlanParams } from "../types.ts";

export function loadMercadoPagoAccessToken(): string | undefined {
  return Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")?.trim() || undefined;
}

/** When set, overrides the real user email sent to MP as payer_email.
 * Useful in dev/local to avoid sending real emails to the MP sandbox. */
export function loadPayerEmailOverride(): string | undefined {
  return Deno.env.get("MERCADOPAGO_PAYER_EMAIL_OVERRIDE")?.trim() || undefined;
}

export function loadMercadoPagoWebhookSecret(): string | undefined {
  return Deno.env.get("MERCADOPAGO_WEBHOOK_SECRET")?.trim() || undefined;
}

export function loadObraAppUrl(): string | undefined {
  const raw = Deno.env.get("OBRA_APP_URL")?.replace(/\/$/, "").trim();
  return raw || undefined;
}

/** Subscription / recurring plan from env (Mercado Pago preapproval mapping). */
export function loadRecurringPlanFromEnv(): RecurringPlanParams | { error: string } {
  const reason = Deno.env.get("MERCADOPAGO_SUBSCRIPTION_REASON") ?? "Obra recurring subscription";
  const unitPrice = Number(
    Deno.env.get("MERCADOPAGO_SUBSCRIPTION_AMOUNT") ??
      Deno.env.get("MERCADOPAGO_CHECKOUT_UNIT_PRICE") ??
      "100",
  );
  const currencyId =
    Deno.env.get("MERCADOPAGO_SUBSCRIPTION_CURRENCY_ID") ??
    Deno.env.get("MERCADOPAGO_CHECKOUT_CURRENCY_ID") ??
    "ARS";
  const frequency = Number(Deno.env.get("MERCADOPAGO_SUBSCRIPTION_FREQUENCY") ?? "1");
  const rawFrequencyType = Deno.env.get("MERCADOPAGO_SUBSCRIPTION_FREQUENCY_TYPE") ?? "months";
  const frequencyType = normalizeFrequencyType(rawFrequencyType);

  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "price" };
  }
  if (!Number.isFinite(frequency) || frequency <= 0) {
    return { error: "frequency" };
  }

  return { reason, unitPrice, currencyId, frequency, frequencyType };
}

export function loadCreditsPackFromEnv(): {
  packCredits: number;
  unitPrice: number;
  currencyId: string;
  itemTitle: string;
} | { error: string } {
  const creditsRaw = Deno.env.get("MERCADOPAGO_CREDITS_PACK_CREDITS") ?? "50";
  const unitPriceRaw = Deno.env.get("MERCADOPAGO_CREDITS_PACK_UNIT_PRICE") ?? "1000";
  const currencyId = Deno.env.get("MERCADOPAGO_CREDITS_PACK_CURRENCY_ID") ?? "ARS";
  const itemTitle =
    Deno.env.get("MERCADOPAGO_CREDITS_PACK_TITLE")?.trim() ||
    `Obra credits (${creditsRaw})`;

  const packCredits = Number(creditsRaw);
  const unitPrice = Number(unitPriceRaw);
  if (!Number.isInteger(packCredits) || packCredits <= 0 || packCredits > 1_000_000) {
    return { error: "credits_pack" };
  }
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
    return { error: "price" };
  }

  return { packCredits, unitPrice, currencyId, itemTitle };
}

function normalizeFrequencyType(raw: string): string {
  const value = raw.trim().toLowerCase();
  if (value === "month" || value === "months") return "months";
  if (value === "day" || value === "days") return "days";
  return value;
}
