import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  classifyOAuthCallbackError,
  formatOAuthCallbackUserMessage,
} from "@/auth/oauthCallbackErrors";
import { supabase } from "@/lib/supabaseClient";

/**
 * OAuth / magic-link return path. Exchanges ?code= (PKCE) for a session, then routes to /app.
 */
export function AuthCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      const params = searchParams;
      const providerError = params.get("error");
      const providerDescription = params.get("error_description");

      if (providerError) {
        const kind = classifyOAuthCallbackError(providerError);
        if (!cancelled) {
          setMessage(formatOAuthCallbackUserMessage((key) => t(key), kind, providerDescription));
        }
        return;
      }

      const code = params.get("code");

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (exchangeError) {
          const { data: retry } = await supabase.auth.getSession();
          if (retry.session) {
            window.history.replaceState({}, document.title, "/auth/callback");
            navigate("/app", { replace: true });
            return;
          }
          setMessage(t("auth.callbackError"));
          return;
        }
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (cancelled) return;
      if (sessionError || !data.session) {
        setMessage(t("auth.callbackError"));
        return;
      }

      window.history.replaceState({}, document.title, "/auth/callback");
      navigate("/app", { replace: true });
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [navigate, searchParams, t]);

  if (message) {
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
        <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12">
          <p className="max-w-md text-center text-sm text-red-600" role="alert">
            {message}
          </p>
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p>
    </div>
  );
}
