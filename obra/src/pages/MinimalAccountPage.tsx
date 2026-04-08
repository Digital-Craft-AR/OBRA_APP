import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router-dom";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { MinimalAccountSummary } from "@/components/shells/MinimalAccountSummary";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import {
  isMinimalAccountEntitlementOutcome,
  outcomeToPath,
} from "@/entitlement/resolveEntitlement";
import { confirmAccountDeletionInBrowser } from "@/lib/accountDeletionConfirm";
import { supabase } from "@/lib/supabaseClient";

/** Minimal account / privacy path for `pending_subscription`, `activating`, `subscription_error` (#39). */
export function MinimalAccountPage() {
  const { t } = useTranslation();
  const { outcome, user, creditsBalance, reconcileSubscription } = useEntitlement();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!isMinimalAccountEntitlementOutcome(outcome)) {
    return <Navigate to={outcomeToPath(outcome)} replace />;
  }

  const backPath = outcomeToPath(outcome);

  async function onExportData() {
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.functions.invoke("export-user-data", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.exportUnavailable") : t("shell.account.exportStarted"));
  }

  async function onDeleteAccount() {
    if (!confirmAccountDeletionInBrowser(user?.email ?? null, t)) return;
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.deleteUnavailable") : t("shell.account.deleteStarted"));
  }

  return (
    <BlockingShellFrame titleKey="shell.account.pageTitle">
      <p className="text-sm text-obra-neutral-600">{t("shell.account.pageIntro")}</p>
      <div className="text-left">
        <MinimalAccountSummary
          user={user}
          shellOutcome={outcome}
          creditsBalance={creditsBalance}
          busy={busy}
          statusMessage={message}
          onRefreshStatus={() => void reconcileSubscription()}
          onExportData={() => void onExportData()}
          onDeleteAccount={() => void onDeleteAccount()}
        />
      </div>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          to={backPath}
          className="text-sm font-semibold text-obra-blue-700 underline-offset-2 hover:underline"
        >
          {t("shell.account.backToShell")}
        </Link>
      </div>
    </BlockingShellFrame>
  );
}
