import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { toastApiFailure } from "@/lib/apiToast";
import { confirmAccountDeletionInBrowser } from "@/lib/accountDeletionConfirm";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
import { supabase } from "@/lib/supabaseClient";

export function SettingsPrivacyPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExportData() {
    setMessage(null);
    setBusy(true);
    const { data, error } = await supabase.functions.invoke<{ ok?: boolean; data?: unknown }>("export-user-data", {
      method: "POST",
      body: {},
    });
    setBusy(false);
    if (error) {
      const key = "shell.account.exportUnavailable";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }
    if (data?.ok && data.data != null) {
      const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `obra-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage(t("shell.account.exportDownloaded"));
      return;
    }
    const key = "shell.account.exportUnavailable";
    setMessage(t(key));
    toastApiFailure(t, key);
  }

  async function onDeleteAccount() {
    setMessage(null);
    if (!confirmAccountDeletionInBrowser(session?.user?.email ?? null, t)) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST", body: {} });
    setBusy(false);
    if (error) {
      const code = await getFunctionsInvokeErrorCode(error);
      if (code === "subscription_blocks_delete") {
        const key = "shell.account.deleteSubscriptionActive";
        setMessage(t(key));
        toastApiFailure(t, key);
        return;
      }
      const key = "shell.account.deleteUnavailable";
      setMessage(t(key));
      toastApiFailure(t, key);
      return;
    }
    await supabase.auth.signOut();
    void navigate("/", { replace: true });
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.privacy")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.privacy.intro")}</p>
      </div>

      <div className="flex flex-col gap-3 border-b border-obra-blue-100 pb-8">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("settings.privacy.exportHeading")}</h3>
        <p className="text-sm text-obra-neutral-600">{t("settings.privacy.exportBody")}</p>
        <Button type="button" variant="tertiary" className="self-start" disabled={busy} onClick={() => void onExportData()}>
          {t("shell.account.exportData")}
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-red-600">{t("settings.privacy.deleteHeading")}</h3>
        <p className="text-sm text-obra-neutral-600">{t("settings.privacy.deleteBody")}</p>
        <Button type="button" variant="destructive" className="self-start" disabled={busy} onClick={() => void onDeleteAccount()}>
          {t("shell.account.deleteAccount")}
        </Button>
      </div>

      {message ? (
        <p className="text-sm text-obra-neutral-700" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
