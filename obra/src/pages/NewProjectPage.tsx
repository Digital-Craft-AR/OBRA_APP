import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { ObraAlert } from "@/components/obra/ObraAlert";
import { useAuth } from "@/auth/authContext";
import { supabase } from "@/lib/supabaseClient";
import type { ContentSource } from "@/lib/projects";
import { DEFAULT_DESIGN_CONFIG } from "@/lib/wizard/structureTypes";
import { ContentSourceCards } from "@/components/wizard/content/ContentSourceCards";

export function NewProjectPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [contentSource, setContentSource] = useState<ContentSource>("ai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleCreateProject() {
    if (!session?.user?.id || isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    const projectName = t("wizard.create.defaultProjectName");
    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_id: session.user.id,
        name: projectName,
        content_locale: "es",
        content_source: contentSource,
        design_config: DEFAULT_DESIGN_CONFIG,
        lifecycle_status: "active",
      })
      .select("id")
      .single();

    setIsSubmitting(false);

    if (error || !data?.id) {
      if (import.meta.env.DEV && error) {
        console.error("[createProject]", error);
      }
      setErrorMessage(t("wizard.create.error"));
      return;
    }

    navigate(`/app/projects/${data.id}/wizard`);
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="px-6 py-3 bg-obra-blue-950">
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {t("wizard.create.back")}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-10">
        <header className="space-y-2">
          <h1 className="font-display text-2xl text-obra-blue-950">{t("wizard.create.title")}</h1>
          <p className="text-sm text-obra-neutral-600">{t("wizard.create.subtitle")}</p>
        </header>

        <section className="space-y-4">
          <header className="space-y-2">
            <h2 className="font-display text-2xl text-obra-blue-950">{t("wizard.create.sourceChoice.title")}</h2>
            <p className="text-sm text-obra-neutral-600">{t("wizard.create.sourceChoice.subtitle")}</p>
          </header>
          <ContentSourceCards
            t={t}
            value={contentSource}
            variant="select"
            onSelect={(source) => setContentSource(source)}
          />
        </section>

        {errorMessage ? <ObraAlert variant="error" title={errorMessage} /> : null}

        <div className="flex items-center justify-between border-t border-obra-blue-100 pt-5">
          <Button variant="tertiary" onClick={() => navigate("/app/dashboard")} disabled={isSubmitting}>
            {t("wizard.create.cancel")}
          </Button>
          <Button variant="primary" data-testid="new-project-create-btn" onClick={() => void handleCreateProject()} disabled={isSubmitting}>
            {isSubmitting ? t("wizard.create.creating") : t("wizard.create.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
