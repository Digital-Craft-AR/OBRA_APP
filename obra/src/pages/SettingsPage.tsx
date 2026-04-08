import { useEffect, useMemo, useState } from "react";
import { CreditCard, Coins, FolderOpen, Home, Lock, Settings, Shield, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { ObraSidebar } from "@/components/obra/ObraSidebar";
import { Button } from "@/components/ui/Button";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { parseSettingsRouteSection, type SettingsRouteSection } from "@/entitlement/resolveEntitlement";
import { i18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";
import type { UiLocale } from "@/lib/uiLocale";
import { normalizeUiLocale } from "@/lib/uiLocale";
import { inputFieldClass } from "@/lib/uiClasses";
import { SettingsBillingPanel } from "@/pages/settings/SettingsBillingPanel";
import { SettingsCreditsPanel } from "@/pages/settings/SettingsCreditsPanel";
import { SettingsPrivacyPanel } from "@/pages/settings/SettingsPrivacyPanel";
import { SettingsSecurityPanel } from "@/pages/settings/SettingsSecurityPanel";

async function loadProfileRow() {
  const full = await supabase.from("creator_profiles").select("display_name, ui_locale").maybeSingle();
  if (!full.error) {
    return { data: full.data, hasUiLocaleColumn: true as const };
  }
  const minimal = await supabase.from("creator_profiles").select("display_name").maybeSingle();
  return { data: minimal.data, error: minimal.error, hasUiLocaleColumn: false as const };
}

function initialsFromDisplay(label: string): string {
  const s = label.trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[parts.length - 1][0] ?? ""}`.toUpperCase();
  }
  if (parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] ?? "?").toUpperCase();
}

export function SettingsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { section: sectionParam } = useParams<{ section: string }>();
  const { session } = useAuth();
  const { refetchProfile, creditsBalance, subscriptionStatus, reconcileSubscription } = useEntitlement();

  const section = useMemo((): SettingsRouteSection => {
    return parseSettingsRouteSection(sectionParam) ?? "profile";
  }, [sectionParam]);

  useEffect(() => {
    if (sectionParam != null && parseSettingsRouteSection(sectionParam) === null) {
      navigate("/app/settings/profile", { replace: true });
    }
  }, [sectionParam, navigate]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [locale, setLocale] = useState<UiLocale>("es");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hasUiLocaleColumn, setHasUiLocaleColumn] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await loadProfileRow();
      if (cancelled) return;
      if ("error" in result && result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      const row = result.data as { display_name?: string | null; ui_locale?: string | null } | null;
      setDisplayName(row?.display_name ?? "");
      setLocale(normalizeUiLocale(row?.ui_locale));
      setHasUiLocaleColumn(result.hasUiLocaleColumn);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const userChipLabel = useMemo(
    () => displayName.trim() || session?.user?.email || t("sidebar.userFallback"),
    [displayName, session?.user?.email, t],
  );

  const avatarInitials = useMemo(() => initialsFromDisplay(userChipLabel), [userChipLabel]);

  const sectionNav = useMemo(
    () =>
      [
        { id: "profile" as const, labelKey: "settings.section.profile", icon: User },
        { id: "security" as const, labelKey: "settings.sectionNav.security", icon: Shield },
        { id: "billing" as const, labelKey: "settings.sectionNav.billing", icon: CreditCard },
        { id: "credits" as const, labelKey: "settings.sectionNav.credits", icon: Coins },
        { id: "privacy" as const, labelKey: "settings.sectionNav.privacy", icon: Lock },
      ] as const,
    [],
  );

  async function signOut() {
    await supabase.auth.signOut();
  }

  async function onSave() {
    if (!session?.user?.id) return;
    setMessage(null);
    setError(null);
    setSaving(true);
    const nextLocale = normalizeUiLocale(locale);
    const basePayload = {
      display_name: displayName.trim() || null,
      updated_at: new Date().toISOString(),
    };
    const fullPayload = { ...basePayload, ui_locale: nextLocale };

    let uError = null as { message: string } | null;
    let localePersistedInDb = hasUiLocaleColumn;

    if (hasUiLocaleColumn) {
      const first = await supabase.from("creator_profiles").update(fullPayload).eq("id", session.user.id);
      if (first.error) {
        const second = await supabase.from("creator_profiles").update(basePayload).eq("id", session.user.id);
        uError = second.error;
        if (!uError) {
          localePersistedInDb = false;
          setHasUiLocaleColumn(false);
        }
      }
    } else {
      const r = await supabase.from("creator_profiles").update(basePayload).eq("id", session.user.id);
      uError = r.error;
      localePersistedInDb = false;
    }

    setSaving(false);
    if (uError) {
      setError(uError.message);
      return;
    }
    await i18n.changeLanguage(nextLocale);
    await refetchProfile();
    setMessage(localePersistedInDb ? t("settings.saved") : t("settings.savedLocaleUntilMigration"));
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
            to: "/app/settings/profile",
            active: location.pathname.startsWith("/app/settings"),
            icon: <Settings className="size-4" aria-hidden />,
          },
          {
            id: "home",
            label: t("nav.home"),
            to: "/",
            icon: <Home className="size-4" aria-hidden />,
          },
        ]}
        userName={userChipLabel}
        credits={creditsBalance}
        onLogout={() => void signOut()}
        logoutLabel={t("nav.logout")}
      />

      <main className="flex min-h-screen flex-1 flex-col bg-white">
        <header className="flex h-18 shrink-0 items-center border-b border-obra-blue-100 px-10">
          <h1 className="font-display text-xl font-normal leading-none text-obra-blue-950">
            {t("settings.pageTitle")}
          </h1>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside
            className="flex w-52 shrink-0 flex-col border-r border-obra-blue-100 bg-white"
            aria-label={t("settings.sectionsNavAria")}
          >
            <nav className="flex flex-col gap-1 overflow-y-auto p-3 pt-4">
              {sectionNav.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => navigate(`/app/settings/${item.id}`)}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left font-body text-sm font-medium transition-all",
                      active
                        ? "bg-obra-blue-100 text-obra-blue-900"
                        : "text-obra-neutral-600 hover:bg-obra-blue-50 hover:text-obra-blue-900",
                    ].join(" ")}
                  >
                    <span className={active ? "text-obra-blue-700" : "text-obra-neutral-400"}>
                      <Icon className="size-4 shrink-0" aria-hidden />
                    </span>
                    {t(item.labelKey)}
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="max-w-2xl flex-1 overflow-y-auto p-10">
            {section === "profile" ? (
              loading ? (
                <p className="text-obra-neutral-600">{t("common.loading")}</p>
              ) : (
                <div className="flex max-w-lg flex-col gap-8">
                  <div>
                    <h2 className="font-display text-lg font-semibold text-obra-blue-950">{t("settings.section.profile")}</h2>
                    <p className="mt-1 text-sm text-obra-neutral-600">{t("settings.section.profileHint")}</p>
                  </div>

                  <div className="flex items-center gap-5">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-obra-blue-700">
                      <span className="font-body text-xl font-bold text-white">{avatarInitials}</span>
                    </div>
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
                    <span className="text-sm font-semibold text-obra-neutral-900">{t("settings.localeLabel")}</span>
                    <p className="text-xs text-obra-neutral-600">{t("settings.localeHint")}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["es", "pt-BR"] as const).map((l) => (
                        <button
                          key={l}
                          type="button"
                          onClick={() => setLocale(l)}
                          className={[
                            "rounded-full border px-4 py-2 font-body text-sm font-semibold transition-all",
                            locale === l
                              ? "border-obra-blue-700 bg-obra-blue-700 text-white"
                              : "border-obra-blue-100 text-obra-neutral-600 hover:border-obra-blue-700/50",
                          ].join(" ")}
                        >
                          {l === "es" ? t("settings.locale.es") : t("settings.locale.ptBR")}
                        </button>
                      ))}
                    </div>
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

                  <div>
                    <Button type="button" variant="secondary" disabled={saving} onClick={() => void onSave()}>
                      {saving ? t("common.loading") : t("settings.save")}
                    </Button>
                  </div>
                </div>
              )
            ) : null}
            {section === "security" ? <SettingsSecurityPanel userEmail={session?.user?.email} /> : null}
            {section === "billing" ? (
              <SettingsBillingPanel subscriptionStatus={subscriptionStatus} onRefreshStatus={reconcileSubscription} />
            ) : null}
            {section === "credits" ? (
              <SettingsCreditsPanel creditsBalance={creditsBalance} subscriptionStatus={subscriptionStatus} />
            ) : null}
            {section === "privacy" ? <SettingsPrivacyPanel /> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
