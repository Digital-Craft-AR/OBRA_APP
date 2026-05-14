import { FunctionsHttpError } from "@supabase/supabase-js";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import type { SubscriptionStatus } from "@/entitlement/types";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { tCheckoutConfigError, tMercadoPagoProviderError } from "@/lib/checkoutEdgeErrors";
import { toastApiFailure } from "@/lib/apiToast";
import { CREDIT_LEDGER_PAGE_SIZE, formatCreditDelta, type CreditLedgerRow } from "@/lib/creditLedger";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "@/toast";

type Props = {
  creditsBalance: number;
  subscriptionStatus: SubscriptionStatus;
  subscriptionAccessUntil: Date | null;
};

type TopUpReturnNotice = "success_sync" | "failure" | "pending" | null;

type CreditsCheckoutFnBody = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

type SubscriptionCheckoutFnBody = {
  redirect_url?: string;
  error?: string;
  detail?: string;
};

const TOP_UP_PRESETS = [
  { credits: 50,  unitPriceArs: 3000  },
  { credits: 150, unitPriceArs: 8000  },
  { credits: 350, unitPriceArs: 17000 },
] as const;
type TopUpPreset = (typeof TOP_UP_PRESETS)[number];

async function readCreditsCheckoutErrorBody(error: unknown): Promise<CreditsCheckoutFnBody | null> {
  if (error instanceof FunctionsHttpError) {
    try {
      return (await error.context.json()) as CreditsCheckoutFnBody;
    } catch {
      return null;
    }
  }
  return null;
}

function ledgerReasonLabel(reason: string, t: (key: string, o?: { defaultValue?: string }) => string): string {
  return t(`settings.credits.reason.${reason}`, { defaultValue: reason });
}

export function SettingsCreditsPanel({ creditsBalance, subscriptionStatus, subscriptionAccessUntil }: Props) {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const { refetchProfile } = useEntitlement();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const inGracePeriod =
    subscriptionStatus === "cancelled" &&
    subscriptionAccessUntil != null &&
    subscriptionAccessUntil > new Date();
  const topUpEnabled = subscriptionStatus === "active" || inGracePeriod;

  const [rows, setRows] = useState<CreditLedgerRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topUpBusy, setTopUpBusy] = useState(false);
  const [topUpReturnNotice, setTopUpReturnNotice] = useState<TopUpReturnNotice>(null);
  const topupPollCancelRef = useRef(false);
  const [showGracePeriodModal, setShowGracePeriodModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [selectedPresetIdx, setSelectedPresetIdx] = useState(0);
  const [reactivateBusy, setReactivateBusy] = useState(false);

  const loadLedger = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent === true;
      if (!silent) {
        setLedgerLoading(true);
      }
      const { data, error } = await supabase
        .from("credit_ledger_entries")
        .select("id, created_at, delta, balance_after, reason, project_id")
        .order("created_at", { ascending: false })
        .limit(CREDIT_LEDGER_PAGE_SIZE);
      if (!silent) {
        setLedgerLoading(false);
      }
      if (error) {
        if (!silent) {
          setRows([]);
          toastApiFailure(t, "settings.credits.ledgerLoadError");
        }
        return;
      }
      setRows((data ?? []) as CreditLedgerRow[]);
    },
    [t],
  );

  useEffect(() => {
    void loadLedger();
  }, [loadLedger]);

  const topupReturn = searchParams.get("topup_return");
  const topupStatus = searchParams.get("topup_status");

  useEffect(() => {
    if (topupReturn !== "1") {
      topupPollCancelRef.current = false;
      return;
    }

    const notice: TopUpReturnNotice =
      topupStatus === "failure" ? "failure" : topupStatus === "pending" ? "pending" : "success_sync";
    setTopUpReturnNotice(notice);
    void navigate("/app/settings/credits", { replace: true });

    topupPollCancelRef.current = false;
    let cancelled = false;

    void (async () => {
      await Promise.all([refetchProfile(), loadLedger()]);

      if (notice !== "success_sync" || cancelled || topupPollCancelRef.current) return;

      for (let i = 0; i < 6; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        if (cancelled || topupPollCancelRef.current) return;
        await Promise.all([refetchProfile(), loadLedger({ silent: true })]);
      }
    })();

    return () => {
      cancelled = true;
      topupPollCancelRef.current = true;
    };
  }, [topupReturn, topupStatus, navigate, refetchProfile, loadLedger]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([loadLedger(), refetchProfile()]);
    setRefreshing(false);
  }

  async function reactivateSubscription() {
    setReactivateBusy(true);
    if (!session?.access_token) {
      setReactivateBusy(false);
      toastApiFailure(t, "shell.pending.checkoutStartError");
      return;
    }

    const { data, error } = await supabase.functions.invoke<SubscriptionCheckoutFnBody>(
      "create-subscription-checkout",
      { method: "POST", body: {}, headers: { Authorization: `Bearer ${session.access_token}` } },
    );

    setReactivateBusy(false);

    if (error) { toastApiFailure(t, "shell.pending.checkoutStartError"); return; }
    if (data?.error === "unauthorized") { toastApiFailure(t, "auth.callbackError"); return; }
    if (data?.error === "email_not_verified") { toastApiFailure(t, "shell.pending.checkoutEmailNotVerified"); return; }
    if (data?.error === "checkout_unavailable" || data?.error === "server_misconfigured") {
      toast.error({ title: tCheckoutConfigError(t, data.detail), description: t("toast.api.genericHint") });
      return;
    }
    if (data?.error === "mercadopago_error" || data?.error === "mercadopago_no_redirect") {
      toast.error({ title: tMercadoPagoProviderError(t), description: t("toast.api.genericHint") });
      return;
    }
    if (data?.error || !data?.redirect_url) { toastApiFailure(t, "shell.pending.checkoutStartError"); return; }

    window.location.assign(data.redirect_url);
  }

  function openTopUpModal() {
    setSelectedPresetIdx(0);
    setShowTopUpModal(true);
  }

  async function onConfirmTopUp(preset: TopUpPreset) {
    setShowTopUpModal(false);
    setTopUpBusy(true);
    if (!session?.access_token) {
      setTopUpBusy(false);
      toastApiFailure(t, "auth.callbackError");
      return;
    }

    const { data, error } = await supabase.functions.invoke<CreditsCheckoutFnBody>("create-credits-checkout", {
      body: { amount: preset.unitPriceArs, credits: preset.credits },
      headers: {
        Authorization: `Bearer ${session.access_token}`,
      },
    });
    setTopUpBusy(false);

    if (error) {
      const errBody = await readCreditsCheckoutErrorBody(error);
      if (errBody?.error === "subscription_required") {
        toastApiFailure(t, "settings.credits.topUpSubscriptionRequired");
        return;
      }
      if (errBody?.error === "checkout_unavailable" || errBody?.error === "server_misconfigured") {
        const msg = tCheckoutConfigError(t, errBody.detail);
        toast.error({ title: msg, description: t("toast.api.genericHint") });
        return;
      }
      if (errBody?.error === "mercadopago_error" || errBody?.error === "mercadopago_no_redirect") {
        const msg = tMercadoPagoProviderError(t);
        toast.error({ title: msg, description: t("toast.api.genericHint") });
        return;
      }
      toastApiFailure(t, "settings.credits.topUpError");
      return;
    }

    if (data?.error === "subscription_required") {
      toastApiFailure(t, "settings.credits.topUpSubscriptionRequired");
      return;
    }

    if (data?.error === "checkout_unavailable" || data?.error === "server_misconfigured") {
      const msg = tCheckoutConfigError(t, data.detail);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error === "mercadopago_error" || data?.error === "mercadopago_no_redirect") {
      const msg = tMercadoPagoProviderError(t);
      toast.error({ title: msg, description: t("toast.api.genericHint") });
      return;
    }

    if (data?.error && !data.redirect_url) {
      toastApiFailure(t, "settings.credits.topUpError");
      return;
    }

    if (data?.redirect_url) {
      window.location.assign(data.redirect_url);
      return;
    }

    toastApiFailure(t, "settings.credits.topUpError");
  }

  const localeTag = i18n.language === "pt-BR" ? "pt-BR" : "es-AR";

  const topUpReturnNoticeKey =
    topUpReturnNotice === "failure"
      ? "settings.credits.topUpReturnedFailure"
      : topUpReturnNotice === "pending"
        ? "settings.credits.topUpReturnedPending"
        : topUpReturnNotice === "success_sync"
          ? "settings.credits.topUpReturnSyncing"
          : null;

  const topUpReturnNoticeClass =
    topUpReturnNotice === "failure"
      ? "border-red-200 bg-red-50 text-red-900"
      : "border-obra-blue-100 bg-white text-obra-blue-950";

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.credits")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.credits.intro")}</p>
      </div>

      {topUpReturnNoticeKey ? (
        <div
          className={`flex flex-col gap-3 rounded-card border p-4 text-sm ${topUpReturnNoticeClass}`}
          role="status"
        >
          <p>{t(topUpReturnNoticeKey)}</p>
          <div>
            <Button type="button" variant="tertiary" size="small" onClick={() => setTopUpReturnNotice(null)}>
              {t("settings.credits.topUpReturnDismiss")}
            </Button>
          </div>
        </div>
      ) : null}

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
              onClick={() => inGracePeriod ? setShowGracePeriodModal(true) : openTopUpModal()}
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

      <Modal
        open={showTopUpModal}
        onClose={() => setShowTopUpModal(false)}
        data-testid="top-up-preset-modal"
      >
        <ModalHead>
          <ModalTitle>{t("settings.credits.topUpModal.title")}</ModalTitle>
        </ModalHead>
        <ModalContent>
          <p className="mb-4 text-sm text-obra-neutral-600">
            {t("settings.credits.topUpModal.balance", { count: creditsBalance })}
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TOP_UP_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                data-testid={`top-up-preset-card-${idx}`}
                onClick={() => setSelectedPresetIdx(idx)}
                className={`flex flex-col items-center gap-1 rounded-card border-2 p-4 text-center transition-colors ${
                  selectedPresetIdx === idx
                    ? "border-obra-blue-900 bg-obra-blue-50"
                    : "border-obra-blue-100 bg-white hover:border-obra-blue-300"
                }`}
              >
                <span className="font-display text-2xl font-semibold text-obra-blue-950">
                  {preset.credits.toLocaleString()}
                </span>
                <span className="text-xs text-obra-neutral-600">{t("settings.credits.units")}</span>
                <span className="mt-1 text-xs text-obra-neutral-600">
                  {t("settings.credits.topUpModal.arsPrice", {
                    amount: preset.unitPriceArs.toLocaleString("es-AR"),
                  })}
                </span>
              </button>
            ))}
          </div>
        </ModalContent>
        <ModalFooter className="justify-end">
          <Button
            type="button"
            variant="tertiary"
            disabled={topUpBusy}
            data-testid="top-up-preset-cancel-btn"
            onClick={() => setShowTopUpModal(false)}
          >
            {t("settings.credits.topUpModal.cancel")}
          </Button>
          <Button
            type="button"
            variant="cta"
            disabled={topUpBusy}
            data-testid="top-up-preset-confirm-btn"
            onClick={() => void onConfirmTopUp(TOP_UP_PRESETS[selectedPresetIdx])}
          >
            {topUpBusy ? t("common.loading") : t("settings.credits.topUpModal.confirm")}
          </Button>
        </ModalFooter>
      </Modal>

      {inGracePeriod && subscriptionAccessUntil ? (
        <Modal
          open={showGracePeriodModal}
          onClose={() => setShowGracePeriodModal(false)}
          data-testid="grace-period-topup-modal"
        >
          <ModalHead>
            <ModalTitle>{t("settings.credits.gracePeriodModal.title")}</ModalTitle>
          </ModalHead>
          <ModalContent>
            <p className="text-sm text-obra-neutral-600">
              {t("settings.credits.gracePeriodModal.body", {
                date: new Intl.DateTimeFormat(localeTag, { day: "numeric", month: "short", year: "numeric" }).format(
                  subscriptionAccessUntil,
                ),
              })}
            </p>
          </ModalContent>
          <ModalFooter className="justify-end">
            <Button
              type="button"
              variant="tertiary"
              disabled={reactivateBusy || topUpBusy}
              onClick={() => {
                setShowGracePeriodModal(false);
                openTopUpModal();
              }}
            >
              {t("settings.credits.gracePeriodModal.continue")}
            </Button>
            <Button
              type="button"
              variant="cta"
              disabled={reactivateBusy || topUpBusy}
              onClick={() => void reactivateSubscription()}
              data-testid="grace-period-modal-reactivate-btn"
            >
              {reactivateBusy ? t("common.loading") : t("settings.credits.gracePeriodModal.reactivate")}
            </Button>
          </ModalFooter>
        </Modal>
      ) : null}
    </div>
  );
}
