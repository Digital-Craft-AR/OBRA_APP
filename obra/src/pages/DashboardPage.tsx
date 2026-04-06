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
    <div className="flex min-h-screen bg-white">
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
          <Button
            type="button"
            variant="ghost"
            className="w-full border border-white/20 text-white hover:bg-white/10"
            onClick={() => void signOut()}
          >
            {t("nav.logout")}
          </Button>
        </div>
      </aside>
      <main className="flex flex-1 flex-col gap-6 p-10">
        <h1 className="font-display text-2xl font-bold text-obra-blue-950">
          {t("dashboard.title")}
        </h1>
        <p className="text-obra-neutral-600">{t("dashboard.welcome")}</p>
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
