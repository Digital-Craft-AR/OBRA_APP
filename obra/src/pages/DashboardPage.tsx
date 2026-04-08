import { useEffect, useState } from "react";
import { Check, HelpCircle, FolderOpen, Home, Settings } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { ObraSidebar } from "@/components/obra/ObraSidebar";
import { ObraInput } from "@/components/obra/ObraInput";
import { useEntitlement } from "@/entitlement/EntitlementProvider";
import { Button } from "@/components/ui/Button";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHead,
  ModalSubtitle,
  ModalTitle,
} from "@/components/ui/Modal";
import type { ContentLocale } from "@/lib/projects";
import { supabase } from "@/lib/supabaseClient";
import { contentCardClass } from "@/lib/uiClasses";

type ProfileRow = {
  id: string;
  display_name: string | null;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { session } = useAuth();
  const { creditsBalance } = useEntitlement();
  const [profile, setProfile] = useState<ProfileRow | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectStep, setProjectStep] = useState<1 | 2>(1);
  const [projectName, setProjectName] = useState("");
  const [projectLocale, setProjectLocale] = useState<ContentLocale>("es");
  const [creatingProject, setCreatingProject] = useState(false);
  const [projectCreateError, setProjectCreateError] = useState<string | null>(null);

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

  function openNewProjectModal() {
    setProjectCreateError(null);
    setProjectName("");
    setProjectLocale("es");
    setProjectStep(1);
    setShowNewProjectModal(true);
  }

  async function createProjectFromModal() {
    if (!session?.user?.id || creatingProject) return;
    const trimmedName = projectName.trim();
    if (!trimmedName) {
      setProjectCreateError(t("wizard.modal.nameRequired"));
      return;
    }

    setProjectCreateError(null);
    setCreatingProject(true);
    const { data, error: insertError } = await supabase
      .from("projects")
      .insert({
        user_id: session.user.id,
        name: trimmedName,
        content_locale: projectLocale,
        content_source: "ai",
      })
      .select("id")
      .single();
    setCreatingProject(false);

    if (insertError || !data?.id) {
      setProjectCreateError(t("wizard.modal.createError"));
      return;
    }

    setShowNewProjectModal(false);
    navigate(`/app/projects/${data.id}/wizard`);
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
            id: "help",
            label: t("nav.help"),
            to: "/app/help",
            active: location.pathname === "/app/help",
            icon: <HelpCircle className="size-4" aria-hidden />,
          },
          {
            id: "home",
            label: t("nav.home"),
            to: "/",
            icon: <Home className="size-4" aria-hidden />,
          },
        ]}
        userName={profile?.display_name ?? session?.user?.email ?? t("sidebar.userFallback")}
        credits={creditsBalance}
        onLogout={() => void signOut()}
        logoutLabel={t("nav.logout")}
      />

      <main className="flex flex-1 flex-col gap-6 p-10">
        <h1 className="font-display text-2xl font-bold text-obra-blue-950">
          {t("dashboard.title")}
        </h1>
        <p className="text-obra-neutral-600">{t("dashboard.welcome")}</p>
        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-10 py-10">
          <div className="relative flex aspect-video w-full max-w-2xl items-center justify-center overflow-hidden rounded-card border border-obra-blue-100 bg-obra-blue-50">
            <button
              type="button"
              className="flex size-14 items-center justify-center rounded-full bg-obra-blue-900/80 transition-colors hover:bg-obra-blue-900"
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
                className="ml-0.5 size-6 text-white"
                aria-hidden
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </button>
            <span className="absolute bottom-3 left-4 font-body text-xs text-obra-neutral-600">
              {t("dashboard.demo.duration")}
            </span>
          </div>
          <div className="flex flex-col items-center gap-5 text-center">
            <h2 className="font-display text-2xl text-obra-blue-950">{t("dashboard.demo.heroTitle")}</h2>
            <p className="max-w-md font-body text-sm leading-relaxed text-obra-neutral-600">
              {t("dashboard.demo.heroBody")}
            </p>
            <div className="flex items-center gap-3">
              <Button type="button" variant="primary" onClick={openNewProjectModal}>
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
              <Button type="button" variant="tertiary" onClick={openNewProjectModal}>
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
            <p className="mt-4 text-sm text-obra-neutral-600">{t("dashboard.field.displayName")}</p>
            <p className="text-obra-neutral-900">{profile.display_name ?? "—"}</p>
          </div>
        ) : (
          <p className="text-obra-neutral-600">{t("dashboard.profileEmpty")}</p>
        )}
      </main>

      <Modal
        open={showNewProjectModal}
        onClose={() => setShowNewProjectModal(false)}
        closeLabel={t("wizard.modal.close")}
      >
        <ModalHead>
          <div>
            <ModalTitle>{t("wizard.modal.title")}</ModalTitle>
            <ModalSubtitle>
              {projectStep === 1 ? t("wizard.modal.stepName") : t("wizard.modal.stepLocale")}
            </ModalSubtitle>
          </div>
        </ModalHead>

        <ModalContent>
            {projectStep === 1 ? (
              <div className="flex flex-col gap-1">
                <ObraInput
                  id="project-name"
                  label={t("wizard.modal.nameLabel")}
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                  placeholder={t("wizard.modal.namePlaceholder")}
                  hint={t("wizard.modal.nameHint")}
                />
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-xs text-obra-neutral-600">{t("wizard.modal.localeHint")}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { id: "es", flag: "🇦🇷", label: t("wizard.create.locale.es"), subtitle: "Argentina / España" },
                      { id: "pt-BR", flag: "🇧🇷", label: t("wizard.create.locale.ptBR"), subtitle: "Brasil" },
                      { id: "en-US", flag: "🇺🇸", label: t("wizard.create.locale.enUS"), subtitle: "United States" },
                      { id: "en-GB", flag: "🇬🇧", label: t("wizard.create.locale.enGB"), subtitle: "United Kingdom" },
                    ] as const
                  ).map((localeOption) => {
                    const selected = projectLocale === localeOption.id;
                    return (
                      <button
                        key={localeOption.id}
                        type="button"
                        onClick={() => setProjectLocale(localeOption.id)}
                        className={`flex items-center justify-between rounded-card border p-4 text-left transition-all ${
                          selected
                            ? "border-obra-blue-700 bg-obra-blue-50"
                            : "border-obra-blue-100 bg-white hover:border-obra-blue-700/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span aria-hidden className="text-2xl">
                            {localeOption.flag}
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-obra-blue-950">{localeOption.label}</p>
                            <p className="text-xs text-obra-neutral-600">{localeOption.subtitle}</p>
                          </div>
                        </div>
                        <Check className={`size-3.5 ${selected ? "text-obra-blue-700" : "text-transparent"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {projectCreateError ? (
              <p role="alert" className="mt-4 text-sm text-red-600">
                {projectCreateError}
              </p>
            ) : null}
        </ModalContent>

        <ModalFooter className="justify-between">
              {projectStep === 1 ? (
                <Button type="button" variant="tertiary" onClick={() => setShowNewProjectModal(false)}>
                  {t("wizard.modal.cancel")}
                </Button>
              ) : (
                <Button type="button" variant="tertiary" onClick={() => setProjectStep(1)} disabled={creatingProject}>
                  {t("wizard.modal.back")}
                </Button>
              )}

              {projectStep === 1 ? (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setProjectStep(2)}
                  disabled={!projectName.trim()}
                >
                  {t("wizard.modal.next")}
                </Button>
              ) : (
                <Button type="button" variant="primary" onClick={() => void createProjectFromModal()} disabled={creatingProject}>
                  {creatingProject ? t("wizard.modal.creating") : t("wizard.modal.create")}
                </Button>
              )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
