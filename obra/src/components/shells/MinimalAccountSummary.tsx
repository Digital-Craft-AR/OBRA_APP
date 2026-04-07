import type { User } from "@supabase/supabase-js";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/Button";

type MinimalAccountSummaryProps = {
  user: User | null;
  busy?: boolean;
  statusMessage?: string | null;
  onRefreshStatus: () => void | Promise<void>;
  onExportData: () => void | Promise<void>;
  onDeleteAccount: () => void | Promise<void>;
};

function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, 1);
  return `${visible}***@${domain}`;
}

function providerLabel(provider: string): string {
  switch (provider.toLowerCase()) {
    case "google":
      return "Google";
    case "email":
      return "Email/Password";
    default:
      return provider;
  }
}

function getLinkedProviderNames(user: User | null): string[] {
  const identities = user?.identities ?? [];
  const providers = identities
    .map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider));
  return Array.from(new Set(providers)).map(providerLabel);
}

export function MinimalAccountSummary({
  user,
  busy = false,
  statusMessage,
  onRefreshStatus,
  onExportData,
  onDeleteAccount,
}: MinimalAccountSummaryProps) {
  const { t } = useTranslation();
  const email = user?.email ?? "";
  const providers = getLinkedProviderNames(user);
  const providerText = providers.length
    ? providers.join(", ")
    : t("shell.account.providersNone");

  return (
    <section
      className="rounded-card border border-obra-blue-100 bg-obra-blue-50 p-4 text-left"
      aria-label={t("shell.account.summaryTitle")}
    >
      <h2 className="text-sm font-semibold text-obra-blue-950">{t("shell.account.summaryTitle")}</h2>
      <dl className="mt-3 space-y-2 text-sm">
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-obra-neutral-900">{t("shell.account.emailLabel")}</dt>
          <dd className="text-obra-neutral-700">{email ? maskEmail(email) : t("shell.account.emailUnknown")}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-obra-neutral-900">{t("shell.account.providersLabel")}</dt>
          <dd className="text-obra-neutral-700">{providerText}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-obra-neutral-900">{t("shell.account.subscriptionLabel")}</dt>
          <dd className="text-obra-neutral-700">{t("shell.account.subscriptionState.subscription_error")}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-semibold text-obra-neutral-900">{t("shell.account.creditsLabel")}</dt>
          <dd className="text-obra-neutral-700">{t("shell.account.creditsPolicy")}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="tertiary" className="w-full sm:w-auto" onClick={() => void onRefreshStatus()}>
          {t("shell.account.refreshStatus")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full border border-obra-neutral-200 px-5 text-obra-neutral-600 sm:w-auto"
          disabled
          aria-disabled="true"
        >
          {t("shell.account.topUpDisabled")}
        </Button>
      </div>
      <p className="mt-2 text-xs text-obra-neutral-600">{t("shell.account.topUpDisabledHint")}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="tertiary" className="w-full sm:w-auto" disabled={busy} onClick={() => void onExportData()}>
          {t("shell.account.exportData")}
        </Button>
        <Button
          type="button"
          variant="destructive"
          className="w-full sm:w-auto"
          disabled={busy}
          onClick={() => void onDeleteAccount()}
        >
          {t("shell.account.deleteAccount")}
        </Button>
      </div>

      {statusMessage ? (
        <p className="mt-3 text-sm text-obra-neutral-700" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  );
}
