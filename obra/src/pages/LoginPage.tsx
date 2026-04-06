import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";

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
      setError(t("auth.oauthStartError"));
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-obra-blue-100 px-6 py-4">
        <Link
          to="/"
          className="font-[family-name:var(--font-display)] text-lg font-semibold text-obra-blue-900"
        >
          {t("app.name")}
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="w-full max-w-sm space-y-4 rounded-2xl border border-obra-blue-100 bg-white p-8 shadow-sm"
        >
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-obra-blue-900">
            {t("nav.login")}
          </h1>
          <Button
            type="button"
            variant="primary"
            className="w-full"
            disabled={busy || oauthBusy}
            onClick={() => void onGoogleClick()}
          >
            {oauthBusy ? t("auth.working") : t("auth.continueWithGoogle")}
          </Button>
          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <span className="w-full border-t border-obra-neutral-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-2 text-xs text-obra-neutral-600">{t("auth.orDivider")}</span>
            </div>
          </div>
          <label className="block space-y-1">
            <span className="text-sm text-obra-neutral-600">{t("auth.email")}</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
              className="w-full rounded-full border border-obra-neutral-200 bg-obra-neutral-100 px-4 py-2.5 text-sm outline-none ring-obra-blue-700 focus:ring-2"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm text-obra-neutral-600">{t("auth.password")}</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              className="w-full rounded-full border border-obra-neutral-200 bg-obra-neutral-100 px-4 py-2.5 text-sm outline-none ring-obra-blue-700 focus:ring-2"
            />
          </label>
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="cta" className="w-full" disabled={busy || oauthBusy}>
            {busy ? t("auth.working") : t("auth.submit")}
          </Button>
        </form>
      </main>
    </div>
  );
}
