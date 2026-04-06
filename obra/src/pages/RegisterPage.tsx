import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { mapSignUpErrorToKey } from "@/auth/registerErrors";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { authCardClass, inputFieldClass } from "@/lib/uiClasses";

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [checkEmailOnly, setCheckEmailOnly] = useState(false);

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
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (signError) {
      const key = mapSignUpErrorToKey(signError.message);
      setError(t(`auth.${key}`));
      return;
    }
    if (data.session) {
      void navigate("/app", { replace: true });
      return;
    }
    setCheckEmailOnly(true);
  }

  if (checkEmailOnly) {
    return (
      <div className="flex min-h-screen flex-col bg-obra-blue-50">
        <header className="border-b border-obra-blue-100 px-6 py-4">
          <Link to="/" className="font-display text-lg font-semibold text-obra-blue-900">
            {t("app.name")}
          </Link>
        </header>
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
          <p className="max-w-md text-center text-sm text-obra-neutral-600">{t("auth.registerCheckEmail")}</p>
          <Link
            to="/login"
            className="text-sm font-medium text-obra-blue-700 underline-offset-4 hover:underline"
          >
            {t("auth.backToLogin")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-obra-blue-50">
      <header className="border-b border-obra-blue-100 px-6 py-4">
        <Link to="/" className="font-display text-lg font-semibold text-obra-blue-900">
          {t("app.name")}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <form onSubmit={(e) => void onSubmit(e)} className={authCardClass}>
          <h1 className="font-display text-2xl font-bold text-obra-blue-950">
            {t("auth.registerTitle")}
          </h1>
          <label className="block space-y-1">
            <span className="text-label text-obra-neutral-600">{t("auth.email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className={inputFieldClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-label text-obra-neutral-600">{t("auth.password")}</span>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={8}
              className={inputFieldClass}
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="cta" className="w-full" disabled={busy}>
            {busy ? t("auth.working") : t("auth.registerSubmit")}
          </Button>
          <p className="text-center text-sm text-obra-neutral-600">
            <Link to="/login" className="font-medium text-obra-blue-700 underline-offset-4 hover:underline">
              {t("auth.haveAccount")}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
