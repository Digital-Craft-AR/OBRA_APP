/**
 * Normalizes query params from Mercado Pago return URLs.
 * Checkout Pro often uses `collection_status`; our mock uses `status=success`.
 */
export type ParsedPaymentReturn = "success" | "failure" | "pending" | "unknown";

export function parsePaymentReturnOutcome(searchParams: URLSearchParams): ParsedPaymentReturn {
  const status = searchParams.get("status")?.toLowerCase() ?? "";
  const collectionStatus = searchParams.get("collection_status")?.toLowerCase() ?? "";

  const successSignals =
    status === "success" ||
    status === "approved" ||
    collectionStatus === "approved" ||
    collectionStatus === "authorized" ||
    // MP subscription (preapproval) back_url: MP appends `?preapproval_id=<id>` without a
    // status param. Presence of preapproval_id means the user authorized the subscription.
    searchParams.has("preapproval_id");

  const failureSignals =
    status === "failure" ||
    status === "rejected" ||
    collectionStatus === "rejected" ||
    collectionStatus === "cancelled" ||
    collectionStatus === "failure";

  const pendingSignals =
    status === "pending" ||
    collectionStatus === "pending" ||
    collectionStatus === "in_process" ||
    collectionStatus === "in_mediation";

  if (successSignals) return "success";
  if (failureSignals) return "failure";
  if (pendingSignals) return "pending";
  return "unknown";
}

/** True when the URL likely came back from a payment provider on the site root. */
export function looksLikePaymentReturnQuery(searchParams: URLSearchParams): boolean {
  const keys = [
    "status",
    "collection_status",
    "collection_id",
    "payment_id",
    "payment_type",
    "preference_id",
    "preapproval_id",
    "external_reference",
  ];
  return keys.some((k) => searchParams.has(k));
}
