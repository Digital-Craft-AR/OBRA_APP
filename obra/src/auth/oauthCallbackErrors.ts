export type OAuthCallbackErrorKind = "cancelled" | "server" | "unknown";

/**
 * Maps OAuth2 `error` query values from the provider redirect to a small set for UX copy (#34).
 */
export function classifyOAuthCallbackError(providerError: string | null): OAuthCallbackErrorKind {
  if (!providerError) return "unknown";
  const e = providerError.toLowerCase();
  if (e === "access_denied" || e === "cancel" || e === "user_cancelled") {
    return "cancelled";
  }
  if (e === "server_error" || e === "temporarily_unavailable") {
    return "server";
  }
  return "unknown";
}

export function formatOAuthCallbackUserMessage(
  translate: (key: string) => string,
  kind: OAuthCallbackErrorKind,
  providerDescription: string | null,
): string {
  const detail = providerDescription?.replace(/\+/g, " ").trim() ?? "";
  switch (kind) {
    case "cancelled":
      return translate("auth.oauthCancelled");
    case "server":
      return detail ? `${translate("auth.oauthServerError")} ${detail}` : translate("auth.oauthServerError");
    default:
      return detail
        ? `${translate("auth.oauthProviderError")} ${detail}`
        : translate("auth.oauthProviderError");
  }
}
