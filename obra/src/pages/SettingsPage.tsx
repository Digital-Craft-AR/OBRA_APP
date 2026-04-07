import { useEffect, useState } from "react";
import { FolderOpen, Home, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { ObraSidebar } from "@/components/obra/ObraSidebar";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { i18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import type { UiLocale } from "@/lib/uiLocale";
import { normalizeUiLocale } from "@/lib/uiLocale";
import { contentCardClass, inputFieldClass } from "@/lib/uiClasses";

export function SettingsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const { session } = useAuth();
  const { refetchProfile } = useEntitlement();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<UiLocale>("es");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error: qError } = await supabase
        .from("creator_profiles")
        .select("display_name, ui_locale")
        .maybeSingle();
      if (cancelled) return;
      if (qError) {
        setError(qError.message);
        setLoading(false);
        return;
      }
      const row = data as { display_name?: string | null; ui_locale?: string | null } | null;
      setDisplayName(row?.display_name ?? "");
      setLocale(normalizeUiLocale(row?.ui_locale));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function onSave() {
    if (!session?.user?.id) return;
    setMessage(null);
    setError(null);
    setSaving(true);
    const nextLocale = normalizeUiLocale(locale);
    const { error: uError } = await supabase
      .from("creator_profiles")
      .update({
        display_name: displayName.trim() || null,
        ui_locale: nextLocale,
        updated_at: new Date().toISOString(),
      })
      .eq("id", session.user.id);
    setSaving(false);
    if (uError) {
      setError(uError.message);
      return;
    }
    await i18n.changeLanguage(nextLocale);
    await refetchProfile();
    setMessage(t("settings.saved"));
  }

  return (
    <div className="flex min-h-screen bg-obra-blue-50">
      <ObraSidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((prev) => !prev)}
        navItems={[
          {
            id: "dashboard",
            label: t("dashboard.title"),
            to: "/app/dashboard",
            active: location.pathname === "/app/dashboard",
            icon: <FolderOpen className="size-4" aria-hidden />,
          },
          {
            id: "settings",
            label: t("nav.settings"),
            to: "/app/settings",
            active: location.pathname === "/app/settings",
            icon: <Settings className="size-4" aria-hidden />,
          },
          {
            id: "home",
            label: t("nav.home"),
            to: "/",
            icon: <Home className="size-4" aria-hidden />,
          },
        ]}
        userName={displayName.trim() || session?.user?.email || t("sidebar.userFallback")}
        credits={1240}
        onLogout={() => void signOut()}
        logoutLabel={t("nav.logout")}
      />

      <main className="flex flex-1 flex-col gap-6 p-10">
        <h1 className="font-display text-2xl font-bold text-obra-blue-950">{t("settings.title")}</h1>
        {loading ? (
          <p className="text-obra-neutral-600">{t("common.loading")}</p>
        ) : (
          <div className={`${contentCardClass} max-w-lg space-y-6`}>
            <div>
              <h2 className="text-lg font-semibold text-obra-blue-950">{t("settings.section.profile")}</h2>
              <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.section.profileHint")}</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-display-name" className="text-sm font-semibold text-obra-neutral-900">
                {t("settings.displayNameLabel")}
              </label>
              <input
                id="settings-display-name"
                type="text"
                className={inputFieldClass}
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={t("settings.displayNamePlaceholder")}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="settings-ui-locale" className="text-sm font-semibold text-obra-neutral-900">
                {t("settings.localeLabel")}
              </label>
              <p className="text-xs text-obra-neutral-600">{t("settings.localeHint")}</p>
              <select
                id="settings-ui-locale"
                className={inputFieldClass}
                value={locale}
                onChange={(e) => setLocale(normalizeUiLocale(e.target.value))}
              >
                <option value="es">{t("settings.locale.es")}</option>
                <option value="pt-BR">{t("settings.locale.ptBR")}</option>
              </select>
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

            <Button type="button" variant="primary" disabled={saving} onClick={() => void onSave()}>
              {saving ? t("common.loading") : t("settings.save")}
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
