import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { confirmAccountDeletionInBrowser } from "@/lib/accountDeletionConfirm";
import { supabase } from "@/lib/supabaseClient";

export function SettingsPrivacyPanel() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onExportData() {
    setMessage(null);
    setBusy(true);
    const { error } = await supabase.functions.invoke("export-user-data", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.exportUnavailable") : t("shell.account.exportStarted"));
  }

  async function onDeleteAccount() {
    setMessage(null);
    if (!confirmAccountDeletionInBrowser(session?.user?.email ?? null, t)) return;
    setBusy(true);
    const { error } = await supabase.functions.invoke("delete-account", { method: "POST", body: {} });
    setBusy(false);
    setMessage(error ? t("shell.account.deleteUnavailable") : t("shell.account.deleteStarted"));
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
