import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { supabase } from "@/lib/supabaseClient";
import { contentCardClass } from "@/lib/uiClasses";

type ProfileRow = {
  id: string;
  display_name: string | null;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: qError } = await supabase
        .from("creator_profiles")
        .select("id, display_name")
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setProfile(null);
        return;
      }
      setProfile(data as ProfileRow | null);
      setError(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <div className="flex min-h-screen bg-obra-blue-50">
      <aside className="flex w-sidebar flex-col bg-obra-blue-900 px-4 py-6 text-white">
        <span className="font-display text-lg font-semibold">
          {t("app.name")}
        </span>
        <nav className="mt-8 flex flex-col gap-2 text-sm">
          <span className="rounded-full bg-white/10 px-3 py-2">{t("dashboard.title")}</span>
          <Link to="/" className="rounded-full px-3 py-2 hover:bg-white/10">
            {t("nav.home")}
          </Link>
        </nav>
        <div className="mt-auto pt-8">
          <Button type="button" variant="ghostDark" className="w-full" onClick={() => void signOut()}>
            {t("nav.logout")}
          </Button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col gap-6 p-10">
        <h1 className="font-display text-2xl font-bold text-obra-blue-950">
          {t("dashboard.title")}
        </h1>
        <p className="text-obra-neutral-600">{t("dashboard.welcome")}</p>
        <div className="flex-1 flex flex-col items-center justify-center gap-8 px-10 py-10">
          <div className="relative w-full max-w-2xl aspect-video overflow-hidden rounded-card border border-obra-blue-100 bg-obra-blue-50 flex items-center justify-center">
            <button
              type="button"
              className="size-14 rounded-full bg-obra-blue-900/80 flex items-center justify-center transition-colors hover:bg-obra-blue-900"
              aria-label={t("dashboard.demo.play")}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-6 ml-0.5 text-white"
                aria-hidden
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
            <span className="absolute bottom-3 left-4 text-xs text-obra-neutral-600 font-body">
              {t("dashboard.demo.duration")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-5 text-center">
            <h2 className="font-display text-2xl text-obra-blue-950">{t("dashboard.demo.heroTitle")}</h2>
            <p className="max-w-md text-sm leading-relaxed text-obra-neutral-600 font-body">
              {t("dashboard.demo.heroBody")}
            </p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="primary">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="M12 5v14" />
                </svg>
                {t("dashboard.demo.cta")}
              </Button>
              <Button type="button" variant="tertiary">
                {t("dashboard.demo.guided")}
              </Button>
            </div>
          </div>
        </div>
        {profile === undefined ? (
          <p className="text-obra-neutral-600">{t("dashboard.profileLoading")}</p>
        ) : error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : profile ? (
          <div className={contentCardClass}>
            <p className="text-sm text-obra-neutral-600">{t("dashboard.field.id")}</p>
            <p className="font-mono text-sm text-obra-neutral-900">{profile.id}</p>
            <p className="mt-4 text-sm text-obra-neutral-600">
              {t("dashboard.field.displayName")}
            </p>
            <p className="text-obra-neutral-900">{profile.display_name ?? "—"}</p>
          </div>
        ) : (
          <p className="text-obra-neutral-600">{t("dashboard.profileEmpty")}</p>
        )}
      </main>
    </div>
  );
}
