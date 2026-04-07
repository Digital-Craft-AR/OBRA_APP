import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus } from "@/entitlement/types";

type Props = {
  creditsBalance: number;
  subscriptionStatus: SubscriptionStatus;
};

export function SettingsCreditsPanel({ creditsBalance, subscriptionStatus }: Props) {
  const { t } = useTranslation();
  const topUpEnabled = subscriptionStatus === "active";

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.credits")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.credits.intro")}</p>
      </div>

      <div>
        <div className="rounded-card border border-obra-blue-100 bg-obra-blue-50 p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">
            {t("settings.credits.balanceLabel")}
          </p>
          <div className="mt-2 flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="font-display text-3xl text-obra-blue-950">{creditsBalance.toLocaleString()}</span>
              <span className="text-sm text-obra-neutral-600">{t("settings.credits.units")}</span>
            </div>
            <Button type="button" variant="primary" disabled={!topUpEnabled} className="shrink-0">
              {t("settings.credits.topUp")}
            </Button>
          </div>
        </div>
        {!topUpEnabled ? (
          <p className="mt-2 text-xs text-obra-neutral-600">{t("settings.credits.topUpDisabled")}</p>
        ) : (
          <p className="mt-2 text-xs text-obra-neutral-500">{t("settings.credits.topUpSoon")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("settings.credits.historyHeading")}</h3>
        <p className="text-sm text-obra-neutral-600">{t("settings.credits.historyEmpty")}</p>
      </div>
    </div>
  );
}
