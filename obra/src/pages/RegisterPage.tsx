import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { mapSignUpErrorToKey } from "@/auth/registerErrors";
import { GoogleIcon } from "@/components/obra/GoogleIcon";
import { ObraInput } from "@/components/obra/ObraInput";
import { ObraLogoLink } from "@/components/obra/ObraLogoLink";
import { Button } from "@/components/ui/Button";
import { emitAuthInstrumentation } from "@/lib/authInstrumentation";
import { supabase } from "@/lib/supabaseClient";
import { authCardClass } from "@/lib/uiClasses";

const footerLinkClass =
  "cursor-pointer border-0 bg-transparent p-0 font-body text-xs text-obra-neutral-400 hover:text-obra-neutral-600";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [oauthBusy, setOauthBusy] = useState(false);
  const [checkEmailOnly, setCheckEmailOnly] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  if (!loading && session) {
    return <Navigate to="/app" replace />;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { data, error: signError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo,
        data: {
          display_name: fullName.trim(),
        },
      },
    });
    setBusy(false);
    if (signError) {
      const key = mapSignUpErrorToKey(signError.message);
      emitAuthInstrumentation({ flow: "signup", outcome: "error", errorKey: key });
      setError(t(`auth.${key}`));
      return;
    }
    if (data.session) {
      emitAuthInstrumentation({ flow: "signup", outcome: "session_created" });
      void navigate("/app", { replace: true });
      return;
    }
    emitAuthInstrumentation({ flow: "signup", outcome: "email_pending" });
    setCheckEmailOnly(true);
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

  async function onResendConfirmation() {
    if (!email) return;
    setResendMessage(null);
    setResendBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setResendBusy(false);
    if (resendError) {
      const msg = resendError.message.toLowerCase();
      if (msg.includes("rate") || msg.includes("429") || msg.includes("too many")) {
        setResendMessage(t("auth.resendRateLimited"));
        return;
      }
      setResendMessage(t("auth.resendError"));
      return;
    }
    setResendMessage(t("auth.resendSent"));
  }

  if (checkEmailOnly) {
    return (
      <main className="flex min-h-screen w-full flex-col items-center justify-center bg-obra-blue-50 p-6 font-body">
        <div className={authCardClass}>
          <div className="flex justify-center">
            <ObraLogoLink
              to="/"
              tone="solidBlue950"
              imgClassName="h-10 w-auto max-w-[200px] object-contain"
            />
          </div>
          <div className="text-center">
            <h1 className="font-display text-xl text-obra-blue-950" data-testid="check-email-heading">{t("auth.checkEmailTitle")}</h1>
          </div>
          <p className="text-center text-sm text-obra-neutral-600">{t("auth.registerCheckEmail")}</p>
          {resendMessage ? (
            <p className="text-center text-sm text-obra-neutral-700" role="status">
              {resendMessage}
            </p>
          ) : null}
          <div className="flex justify-center">
            <Button
              type="button"
              variant="tertiary"
              className="w-auto"
              disabled={resendBusy || !email}
              onClick={() => void onResendConfirmation()}
            >
              {resendBusy ? t("auth.working") : t("shell.verify.resend")}
            </Button>
          </div>
          <p className="text-center">
            <Link
              to="/login"
              className="text-sm font-medium text-obra-blue-700 underline-offset-4 hover:underline"
            >
              {t("auth.backToLogin")}
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center bg-obra-blue-50 p-6 font-body">
      <form onSubmit={(e) => void onSubmit(e)} className={authCardClass} noValidate>
        <div className="flex justify-center">
          <ObraLogoLink
            to="/"
            tone="solidBlue950"
            imgClassName="h-10 w-auto max-w-[200px] object-contain"
          />
        </div>

        <div className="text-center">
          <h1 className="font-display text-xl text-obra-blue-950">{t("auth.registerTitle")}</h1>
          <p className="mt-1 font-body text-sm text-obra-neutral-600">{t("auth.registerSubtitle")}</p>
        </div>

        <div className="flex flex-col gap-4">
          <ObraInput
            label={t("auth.fullName")}
            type="text"
            autoComplete="name"
            placeholder={t("auth.fullNamePlaceholder")}
            value={fullName}
            onChange={(ev) => setFullName(ev.target.value)}
            required
            data-testid="register-name"
          />
          <ObraInput
            label={t("auth.email")}
            type="email"
            autoComplete="email"
            placeholder={t("auth.emailPlaceholder")}
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            required
            data-testid="register-email"
          />
          <ObraInput
            label={t("auth.password")}
            type="password"
            autoComplete="new-password"
            placeholder={t("auth.passwordPlaceholder")}
            value={password}
            onChange={(ev) => setPassword(ev.target.value)}
            required
            minLength={8}
            data-testid="register-password"
          />
        </div>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="cta" className="w-full" disabled={busy || oauthBusy} data-testid="register-submit">
            {busy ? t("auth.working") : t("auth.registerSubmit")}
          </Button>
          <Button
            type="button"
            variant="tertiary"
            className="w-full gap-2"
            disabled={busy || oauthBusy}
            onClick={() => void onGoogleClick()}
          >
            <GoogleIcon />
            {oauthBusy ? t("auth.working") : t("auth.continueWithGoogle")}
          </Button>
        </div>

        <p className="text-center text-sm text-obra-neutral-600">
          {t("auth.haveAccountLead")}{" "}
          <Link to="/login" className="font-medium text-obra-blue-700 underline-offset-4 hover:underline">
            {t("auth.loginLink")}
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
