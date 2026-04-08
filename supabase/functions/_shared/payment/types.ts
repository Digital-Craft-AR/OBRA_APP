/** Provider-agnostic billing / checkout types (Obra domain). */

export type BillingCheckoutFailure =
  | { code: "provider_misconfigured"; detail?: string }
  | { code: "provider_http_error"; status: number; detail: string }
  | { code: "provider_no_redirect"; detail?: string };

export type BillingCheckoutResult =
  | { ok: true; redirectUrl: string; providerCheckoutId?: string }
  | { ok: false; error: BillingCheckoutFailure };

/** Recurring plan fields (mapped to provider APIs by the adapter). */
export type RecurringPlanParams = {
  reason: string;
  unitPrice: number;
  currencyId: string;
  frequency: number;
  frequencyType: string;
};

export type SubscriptionCheckoutInput = {
  creatorUserId: string;
  payerEmail?: string;
  /** Full notification URL the provider will call (webhook). */
  notificationUrl: string;
  /** Subscriber return URL after authorization (provider-specific). */
  returnUrl: string;
  plan: RecurringPlanParams;
};

export type CreditsPackCheckoutInput = {
  creatorUserId: string;
  payerEmail?: string;
  notificationUrl: string;
  returnUrl: string;
  externalReference: string;
  metadata: Record<string, string>;
  lineItem: {
    title: string;
    quantity: number;
    unitPrice: number;
    currencyId: string;
  };
  backUrls?: {
    success: string;
    failure: string;
    pending: string;
  };
};

export type WebhookVerificationInput = {
  secret: string;
  xSignature: string | null;
  xRequestId: string | null;
  /** Resource id from query or JSON body (e.g. MP `data.id`). */
  resourceId: string | null;
};

export type BillingWebhookTopic = "payment" | "subscription";

/** Normalized webhook pointer after signature verification. */
export type BillingWebhookResource = {
  topic: BillingWebhookTopic;
  resourceId: string;
};

export type BillingSubscriptionSnapshot = {
  status: string;
  externalReference: string | null;
};

export type BillingPaymentSnapshot = {
  providerPaymentId: string;
  status: string;
  externalReference: string | null;
};

/** When `found` is false, callers should keep the profile row as-is. */
export type SubscriptionReconcileResult =
  | { found: false }
  | {
      found: true;
      source: "subscription" | "payment";
      subscriptionStatus: "none" | "active" | "past_due";
    };
