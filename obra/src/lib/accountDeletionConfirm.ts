import type { TFunction } from "i18next";

/**
 * Browser-only strong confirmation for account deletion (PRD: re-enter email).
 * Returns true only if the user confirms and types their email exactly (case-insensitive).
 */
export function confirmAccountDeletionInBrowser(email: string | null | undefined, t: TFunction): boolean {
  if (!window.confirm(t("shell.account.deleteConfirm"))) return false;
  const normalized = email?.trim() ?? "";
  if (!normalized) {
    window.alert(t("shell.account.deleteEmailMissing"));
    return false;
  }
  const typed = window.prompt(t("shell.account.deleteTypeEmailHint"));
  if (typed?.trim().toLowerCase() !== normalized.toLowerCase()) {
    window.alert(t("shell.account.deleteEmailMismatch"));
    return false;
  }
  return true;
}
