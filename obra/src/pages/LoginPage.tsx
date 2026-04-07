import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { GoogleIcon } from "@/components/obra/GoogleIcon";
import { ObraInput } from "@/components/obra/ObraInput";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { authCardClass } from "@/lib/uiClasses";

const footerLinkClass =
  "cursor-pointer border-0 bg-transparent p-0 font-body text-xs text-obra-neutral-400 hover:text-obra-neutral-600";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);

  if (!loading && session) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setBusy(false);
    if (signError) {
      const msg = signError.message.toLowerCase();
      if (msg.includes("email not confirmed") || msg.includes("not confirmed")) {
        void navigate("/verify-email", {
          replace: true,
          state: { email },
        });
        return;
      }
      setError(t("auth.error"));
      return;
    }
    void navigate("/app", { replace: true });
  }

  async function onGoogleClick() {
    setError(null);
    setOauthBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setOauthBusy(false);
    if (oauthError) {
      const om = oauthError.message.toLowerCase();
      if (om.includes("popup") || om.includes("blocked")) {
        setError(t("auth.oauthPopupBlocked"));
        return;
      }
      setError(t("auth.oauthStartError"));
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-obra-blue-50 p-6 font-body">
      <form onSubmit={(e) => void onSubmit(e)} className={authCardClass} noValidate>
        <div className="flex justify-center">
          <ObraLogoLink to="/" tone="solidBlue950" imgClassName="h-10 w-auto max-w-[200px] object-contain" />
        </div>

        <div className="text-center">
          <h1 className="font-display text-xl text-obra-blue-950">{t("nav.login")}</h1>
          <p className="mt-1 font-body text-sm text-obra-neutral-600">{t("auth.loginSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <ObraInput
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
          />
          <div className="flex flex-col gap-1">
            <ObraInput
              label={t("auth.password")}
              type="password"
              autoComplete="current-password"
              placeholder={t("auth.passwordPlaceholder")}
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
            />
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="font-body text-xs text-obra-blue-700 hover:underline"
              >
                {t("auth.forgotPassword")}
              </Link>
            </div>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="secondary" className="w-full" disabled={busy || oauthBusy}>
            {busy ? t("auth.working") : t("auth.submit")}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="w-full gap-2"
            disabled={busy || oauthBusy}
            onClick={() => void onGoogleClick()}
          >
            <GoogleIcon />
            {oauthBusy ? t("auth.working") : t("auth.continueWithGoogle")}
          </Button>
        </div>

        <p className="text-center text-sm text-obra-neutral-600">
          {t("auth.needAccountLead")}{" "}
          <Link
            to="/register"
            className="font-medium text-obra-blue-700 underline-offset-4 hover:underline"
          >
            {t("auth.signUpLink")}
          </Link>
        </p>

        <div className="flex justify-center gap-5 border-t border-obra-blue-100 pt-4">
          <button type="button" className={footerLinkClass}>
            {t("auth.terms")}
          </button>
          <button type="button" className={footerLinkClass}>
            {t("auth.privacy")}
          </button>
        </div>
      </form>
    </main>
  );
}
