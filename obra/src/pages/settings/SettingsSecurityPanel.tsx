import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { UserIdentity } from "@supabase/supabase-js";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { inputFieldClass } from "@/lib/uiClasses";

type Props = {
  userEmail: string | null | undefined;
};

export function SettingsSecurityPanel({ userEmail }: Props) {
  const { t } = useTranslation();
  const [identities, setIdentities] = useState<UserIdentity[]>([]);
  const [identitiesLoading, setIdentitiesLoading] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reloadIdentities = useCallback(async () => {
    setIdentitiesLoading(true);
    const { data } = await supabase.auth.getUser();
    setIdentities(data.user?.identities ?? []);
    setIdentitiesLoading(false);
  }, []);

  useEffect(() => {
    void reloadIdentities();
  }, [reloadIdentities]);

  const hasEmailIdentity = useMemo(
    () => identities.some((i) => i.provider === "email"),
    [identities],
  );

  const hasGoogle = useMemo(() => identities.some((i) => i.provider === "google"), [identities]);

  const canUnlinkOAuth = identities.length > 1;

  const mismatch = Boolean(newPassword && confirmPassword && newPassword !== confirmPassword);

  async function onPasswordSubmit() {
    setMessage(null);
    setError(null);
    if (newPassword.length < 8) {
      setError(t("settings.security.passwordTooShort"));
      return;
    }
    if (mismatch) {
      setError(t("settings.security.passwordMismatch"));
      return;
    }
    if (hasEmailIdentity) {
      if (!currentPassword) {
        setError(t("settings.security.currentRequired"));
        return;
      }
      if (!userEmail) {
        setError(t("settings.security.emailMissing"));
        return;
      }
    }

    setBusy(true);
    if (hasEmailIdentity && userEmail) {
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: currentPassword,
      });
      if (signErr) {
        setBusy(false);
        setError(t("settings.security.currentWrong"));
        return;
      }
    }

    const { error: upErr } = await supabase.auth.updateUser({ password: newPassword });
    setBusy(false);
    if (upErr) {
      setError(upErr.message);
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage(t("settings.security.passwordUpdated"));
    void reloadIdentities();
  }

  async function onUnlink(identity: UserIdentity) {
    setMessage(null);
    setError(null);
    if (!canUnlinkOAuth) {
      setError(t("settings.security.unlinkBlocked"));
      return;
    }
    setBusy(true);
    const { error: unlinkErr } = await supabase.auth.unlinkIdentity(identity);
    setBusy(false);
    if (unlinkErr) {
      setError(unlinkErr.message);
      return;
    }
    setMessage(t("settings.security.unlinked"));
    void reloadIdentities();
  }

  async function onLinkGoogle() {
    setMessage(null);
    setError(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: linkErr } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo },
    });
    setBusy(false);
    if (linkErr) {
      setError(linkErr.message);
    }
  }

  function providerLabel(provider: string): string {
    if (provider === "google") return t("settings.security.provider.google");
    if (provider === "email") return t("settings.security.provider.email");
    return provider;
  }

  return (
    <div className="flex max-w-lg flex-col gap-8">
      <div>
        <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.sectionNav.security")}</h2>
        <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.security.intro")}</p>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("settings.security.passwordHeading")}</h3>
        {hasEmailIdentity ? (
          <div className="relative">
            <label htmlFor="sec-current-pw" className="text-sm font-semibold text-obra-neutral-900">
              {t("settings.security.currentPassword")}
            </label>
            <input
              id="sec-current-pw"
              type={showCurrent ? "text" : "password"}
              autoComplete="current-password"
              className={`${inputFieldClass} mt-1 pr-10`}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-2 top-8 rounded p-1 text-obra-neutral-400 hover:text-obra-neutral-600"
              onClick={() => setShowCurrent((v) => !v)}
              aria-label={showCurrent ? t("settings.security.hidePassword") : t("settings.security.showPassword")}
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        ) : (
          <p className="text-sm text-obra-neutral-600">{t("settings.security.setPasswordHint")}</p>
        )}

        <div className="relative">
          <label htmlFor="sec-new-pw" className="text-sm font-semibold text-obra-neutral-900">
            {hasEmailIdentity ? t("settings.security.newPassword") : t("settings.security.newPasswordBackup")}
          </label>
          <input
            id="sec-new-pw"
            type={showNew ? "text" : "password"}
            autoComplete="new-password"
            className={`${inputFieldClass} mt-1 pr-10`}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-8 rounded p-1 text-obra-neutral-400 hover:text-obra-neutral-600"
            onClick={() => setShowNew((v) => !v)}
            aria-label={showNew ? t("settings.security.hidePassword") : t("settings.security.showPassword")}
          >
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        <div className="relative">
          <label htmlFor="sec-confirm-pw" className="text-sm font-semibold text-obra-neutral-900">
            {t("settings.security.confirmPassword")}
          </label>
          <input
            id="sec-confirm-pw"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            className={`${inputFieldClass} mt-1 pr-10`}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <button
            type="button"
            className="absolute right-2 top-8 rounded p-1 text-obra-neutral-400 hover:text-obra-neutral-600"
            onClick={() => setShowConfirm((v) => !v)}
            aria-label={showConfirm ? t("settings.security.hidePassword") : t("settings.security.showPassword")}
          >
            {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-sm text-obra-neutral-700" role="status">
            {message}
          </p>
        ) : null}

        <Button
          type="button"
          variant="secondary"
          disabled={busy || !newPassword || !confirmPassword || mismatch}
          onClick={() => void onPasswordSubmit()}
        >
          {hasEmailIdentity ? t("settings.security.updatePassword") : t("settings.security.setPassword")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 border-t border-obra-blue-100 pt-6">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("settings.security.providersHeading")}</h3>
        {identitiesLoading ? (
          <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {identities.map((identity) => (
              <li
                key={`${identity.provider}-${identity.identity_id}`}
                className="flex items-center justify-between gap-3 rounded-card border border-obra-blue-100 bg-obra-blue-50 px-4 py-3"
              >
                <span className="text-sm font-medium text-obra-blue-950">{providerLabel(identity.provider)}</span>
                {identity.provider !== "email" ? (
                  <Button
                    type="button"
                    variant="tertiary"
                    size="small"
                    disabled={busy || !canUnlinkOAuth}
                    title={!canUnlinkOAuth ? t("settings.security.unlinkNeedOther") : undefined}
                    onClick={() => void onUnlink(identity)}
                  >
                    {t("settings.security.unlink")}
                  </Button>
                ) : (
                  <span className="text-xs text-obra-neutral-500">{t("settings.security.primarySignIn")}</span>
                )}
              </li>
            ))}
          </ul>
        )}

        {!hasGoogle ? (
          <div>
            <Button type="button" variant="tertiary" disabled={busy} onClick={() => void onLinkGoogle()}>
              {t("settings.security.linkGoogle")}
            </Button>
          </div>
        ) : null}

        <p className="text-xs text-obra-neutral-600">{t("settings.security.unlinkPolicy")}</p>
      </div>
    </div>
  );
}
