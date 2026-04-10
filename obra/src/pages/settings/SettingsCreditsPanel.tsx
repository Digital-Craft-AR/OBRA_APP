import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";
import type { SubscriptionStatus } from "@/entitlement/types";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { toastApiFailure } from "@/lib/apiToast";
import { CREDIT_LEDGER_PAGE_SIZE, formatCreditDelta, type CreditLedgerRow } from "@/lib/creditLedger";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  creditsBalance: number;
  subscriptionStatus: SubscriptionStatus;
};

function ledgerReasonLabel(reason: string, t: (key: string, o?: { defaultValue?: string }) => string): string {
  return t(`settings.credits.reason.${reason}`, { defaultValue: reason });
}

export function SettingsCreditsPanel({ creditsBalance, subscriptionStatus }: Props) {
  const { t, i18n } = useTranslation();
  const { refetchProfile } = useEntitlement();
  const topUpEnabled = subscriptionStatus === "active";

  const [rows, setRows] = useState<CreditLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerError, setLedgerError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);

  const loadLedger = useCallback(async () => {
    setLedgerError(null);
    setLedgerLoading(true);
    const { data, error } = await supabase
      .from("credit_ledger_entries")
      .select("id, created_at, delta, balance_after, reason, project_id")
      .order("created_at", { ascending: false })
      .limit(CREDIT_LEDGER_PAGE_SIZE);
    setLedgerLoading(false);
    if (error) {
      setLedgerError(error.message);
      setRows([]);
      toastApiFailure(t, "settings.credits.ledgerLoadError");
      return;
    }
    setRows((data ?? []) as CreditLedgerRow[]);
  }, []);

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadLedger(), refetchProfile()]);
    setRefreshing(false);
  }

  async function onTopUp() {
    setTopUpError(null);
    setTopUpBusy(true);
    const { data, error } = await supabase.functions.invoke<{
      redirect_url?: string;
      error?: string;
      detail?: string;
    }>("create-credits-checkout", { body: {} });
    setTopUpBusy(false);

    if (error) {
      if (error instanceof FunctionsHttpError) {
        try {
          const body = (await error.context.json()) as { error?: string };
          if (body.error === "subscription_required") {
            const key = "settings.credits.topUpSubscriptionRequired";
            setTopUpError(t(key));
            toastApiFailure(t, key);
            return;
          }
        } catch {
          /* ignore JSON parse failures */
        }
      }
      const keyErr = "settings.credits.topUpError";
      setTopUpError(t(keyErr));
      toastApiFailure(t, keyErr);
      return;
    }

    if (data?.error === "subscription_required") {
      const key = "settings.credits.topUpSubscriptionRequired";
      setTopUpError(t(key));
      toastApiFailure(t, key);
      return;
    }

    if (data?.error && !data.redirect_url) {
      const keyErr = "settings.credits.topUpError";
      setTopUpError(t(keyErr));
      toastApiFailure(t, keyErr);
      return;
    }

    if (data?.redirect_url) {
      window.location.assign(data.redirect_url);
      return;
    }

    const keyFallback = "settings.credits.topUpError";
    setTopUpError(t(keyFallback));
    toastApiFailure(t, keyFallback);
  }

  const localeTag = i18n.language === "pt-BR" ? "pt-BR" : "es-AR";

  return (
    <div className="flex max-w-2xl flex-col gap-8">
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
            <Button
              type="button"
              variant="primary"
              disabled={!topUpEnabled || topUpBusy}
              className="shrink-0"
              onClick={() => void onTopUp()}
            >
              {topUpBusy ? t("common.loading") : t("settings.credits.topUp")}
            </Button>
          </div>
        </div>
        {!topUpEnabled ? (
          <p className="mt-2 text-xs text-obra-neutral-600">{t("settings.credits.topUpDisabled")}</p>
        ) : (
          <p className="mt-2 text-xs text-obra-neutral-500">{t("settings.credits.topUpRedirectHint")}</p>
        )}
        {topUpError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {topUpError}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-obra-blue-950">{t("settings.credits.historyHeading")}</h3>
          <Button type="button" variant="tertiary" size="small" disabled={refreshing || ledgerLoading} onClick={() => void onRefresh()}>
            {refreshing ? t("common.loading") : t("settings.credits.refreshHistory")}
          </Button>
        </div>
        <p className="text-xs text-obra-neutral-500">{t("settings.credits.historyCapped", { count: CREDIT_LEDGER_PAGE_SIZE })}</p>

        {ledgerLoading ? (
          <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p>
        ) : ledgerError ? (
          <p className="text-sm text-red-600" role="alert">
            {ledgerError}
          </p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-obra-neutral-600">{t("settings.credits.historyEmpty")}</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-obra-blue-100">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-obra-blue-100 bg-obra-blue-50">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                    {t("settings.credits.colDate")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                    {t("settings.credits.colReason")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                    {t("settings.credits.colDelta")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                    {t("settings.credits.colBalanceAfter")}
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-obra-neutral-600">
                    {t("settings.credits.colProject")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-obra-blue-100 last:border-b-0">
                    <td className="px-4 py-3 font-body text-xs text-obra-neutral-600 whitespace-nowrap">
                      {new Date(row.created_at).toLocaleString(localeTag, {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-4 py-3 font-body text-obra-blue-950">{ledgerReasonLabel(row.reason, t)}</td>
                    <td
                      className={
                        row.delta > 0
                          ? "px-4 py-3 font-body font-semibold text-obra-blue-700"
                          : "px-4 py-3 font-body font-semibold text-red-600"
                      }
                    >
                      {formatCreditDelta(row.delta)}
                    </td>
                    <td className="px-4 py-3 font-body text-obra-neutral-900">{row.balance_after.toLocaleString()}</td>
                    <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-xs text-obra-neutral-600" title={row.project_id ?? undefined}>
                      {row.project_id ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
