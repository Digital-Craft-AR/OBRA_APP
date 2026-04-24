import type { TFunction } from "i18next";
import { toast } from "@/toast";

export const INVOKE_ERROR_INSUFFICIENT_CREDITS = "insufficient_credits";
export const INVOKE_ERROR_RATE_LIMITED = "rate_limited";

export type ToastApiFailureMeta = {
  /** When the Edge function returned `insufficient_credits`, show credit-specific copy. */
  errorCode?: string | null;
  /**
   * Optional description key when `errorCode` is insufficient credits (defaults to `toast.api.insufficientCreditsHint`).
   * Use a contextual key (e.g. wizard copy) so the body matches the action.
   */
  creditDescriptionKey?: string;
  creditDescriptionOptions?: Record<string, unknown>;
};

/**
 * Toast for server-side insufficient-credits responses. Title and body both reference credits.
 */
export function toastInsufficientCredits(
  t: TFunction,
  descriptionKey: string,
  descriptionOptions?: Record<string, unknown>,
): void {
  toast.error({
    title: t("toast.api.insufficientCreditsTitle"),
    description: t(descriptionKey, descriptionOptions),
  });
}

/**
 * Toast for server-side rate-limit (429) responses.
 */
export function toastRateLimited(t: TFunction): void {
  toast.error({
    title: t("toast.api.rateLimitedTitle"),
    description: t("toast.api.rateLimitedHint"),
  });
}

/**
 * Non-blocking error toast for failed API / Edge / Supabase actions.
 * Keep copy in i18n; pass the same key you use for inline messages when possible.
 */
export function toastApiFailure(
  t: TFunction,
  titleKey: string,
  titleOptions?: Record<string, unknown>,
  meta?: ToastApiFailureMeta,
): void {
  if (meta?.errorCode?.startsWith(INVOKE_ERROR_RATE_LIMITED)) {
    toastRateLimited(t);
    return;
  }
  if (meta?.errorCode === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
    const descKey = meta.creditDescriptionKey ?? "toast.api.insufficientCreditsHint";
    toastInsufficientCredits(t, descKey, meta.creditDescriptionOptions);
    return;
  }
  toast.error({
    title: t(titleKey, titleOptions),
    description: t("toast.api.genericHint"),
  });
}
