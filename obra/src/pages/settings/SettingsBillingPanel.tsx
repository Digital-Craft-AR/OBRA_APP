import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus } from "@/entitlement/types";

type Props = {
  subscriptionStatus: SubscriptionStatus;
  onRefreshStatus: () => Promise<void>;
};

export function SettingsBillingPanel({ subscriptionStatus, onRefreshStatus }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const mpUrl = import.meta.env.VITE_MERCADOPAGO_SUBSCRIBER_PORTAL_URL?.trim();

  async function refresh() {
    setBusy(true);
    await onRefreshStatus();
    setBusy(false);
  }

  function openMp() {
    if (!mpUrl) return;
    window.open(mpUrl, "_blank", "noopener,noreferrer");
  }

  const statusKey =
    subscriptionStatus === "active"
      ? "settings.billing.status.active"
      : subscriptionStatus === "past_due"
        ? "settings.billing.status.pastDue"
        : "settings.billing.status.none";

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.billing")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.billing.intro")}</p>
      </div>

      <div className="rounded-card border border-obra-blue-100 bg-white p-6 shadow-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">{t("settings.billing.statusLabel")}</p>
        <p className="mt-2 font-body text-sm font-semibold text-obra-blue-950">{t(statusKey)}</p>
        <p className="mt-4 text-sm text-obra-neutral-600">{t("settings.billing.reconcileHint")}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={busy} onClick={() => void refresh()}>
            {busy ? t("common.loading") : t("settings.billing.refresh")}
          </Button>
          <Button type="button" variant="tertiary" disabled={!mpUrl} onClick={openMp}>
            {t("settings.billing.openMp")}
          </Button>
        </div>
        {!mpUrl ? <p className="mt-3 text-xs text-obra-neutral-500">{t("settings.billing.mpUrlMissing")}</p> : null}
      </div>
    </div>
  );
}
