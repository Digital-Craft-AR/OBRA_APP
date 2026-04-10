import type {
  BillingCheckoutResult,
  BillingPaymentSnapshot,
  BillingSubscriptionSnapshot,
  BillingWebhookResource,
  CreditsPackCheckoutInput,
  SubscriptionCheckoutInput,
  SubscriptionReconcileResult,
  WebhookVerificationInput,
} from "./types.ts";

/**
 * Pluggable billing / payments gateway. Implement per provider (Mercado Pago, ObraPay mock, Stripe, …).
 * Edge functions should depend only on this interface + `getBillingAdapter()`.
 */
export interface BillingAdapter {
  readonly providerId: string;

  /** Full webhook URL registered with the provider for this Supabase project. */
  webhookUrlForSupabaseProject(supabaseUrl: string): string;

  verifyWebhookSignature(input: WebhookVerificationInput): boolean;

  /**
   * Map provider-specific JSON body + query string to a resource id, or null to ignore.
   */
  parseWebhookResource(body: unknown, url: URL): BillingWebhookResource | null;

  fetchSubscriptionSnapshot(accessToken: string, resourceId: string): Promise<BillingSubscriptionSnapshot>;

  fetchPaymentSnapshot(accessToken: string, resourceId: string): Promise<BillingPaymentSnapshot>;

  createSubscriptionCheckout(
    accessToken: string,
    input: SubscriptionCheckoutInput,
  ): Promise<BillingCheckoutResult>;

  createCreditsPackCheckout(
    accessToken: string,
    input: CreditsPackCheckoutInput,
  ): Promise<BillingCheckoutResult>;

  reconcileSubscriptionStatusForUser(
    accessToken: string,
    userExternalReference: string,
  ): Promise<SubscriptionReconcileResult>;
}
