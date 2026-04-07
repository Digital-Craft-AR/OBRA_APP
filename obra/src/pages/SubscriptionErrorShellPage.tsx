import { useState } from "react";
import { useTranslation } from "react-i18next";
import { BlockingShellFrame } from "@/components/shells/BlockingShellFrame";
import { MinimalAccountSummary } from "@/components/shells/MinimalAccountSummary";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { supabase } from "@/lib/supabaseClient";

export function SubscriptionErrorShellPage() {
  const { t } = useTranslation();
  const { user, reconcileSubscription } = useEntitlement();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onExportData() {
    setBusy(true);
    const { error } = await supabase.functions.invoke("export-user-data", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.exportUnavailable") : t("shell.account.exportStarted"));
  }

  async function onDeleteAccount() {
    const confirmed = window.confirm(t("shell.account.deleteConfirm"));
    if (!confirmed) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.deleteUnavailable") : t("shell.account.deleteStarted"));
  }

  return (
    <BlockingShellFrame titleKey="shell.subscriptionError.title">
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.body")}</p>
      <p className="text-sm text-obra-neutral-600">{t("shell.subscriptionError.credits")}</p>
      <MinimalAccountSummary
        user={user}
        busy={busy}
        statusMessage={message}
        onRefreshStatus={() => reconcileSubscription()}
        onExportData={() => onExportData()}
        onDeleteAccount={() => onDeleteAccount()}
      />
    </BlockingShellFrame>
  );
}
