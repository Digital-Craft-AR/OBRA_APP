import { useMemo, useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/auth/authContext";
import { supabase } from "@/lib/supabaseClient";
import type { ContentLocale, ContentSource } from "@/lib/projects";
import { CONTENT_LOCALE_OPTIONS } from "@/lib/projects";
import { DEFAULT_DESIGN_CONFIG } from "@/lib/wizard/structureTypes";
import { ContentSourceCards } from "@/components/wizard/content/ContentSourceCards";

export function NewProjectPage() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const [contentLocale, setContentLocale] = useState<ContentLocale>("es");
  const [contentSource, setContentSource] = useState<ContentSource>("ai");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const localeLabels = useMemo(
    () => ({
      es: t("wizard.create.locale.es"),
      "pt-BR": t("wizard.create.locale.ptBR"),
      "en-US": t("wizard.create.locale.enUS"),
      "en-GB": t("wizard.create.locale.enGB"),
    }),
    [t],
  );

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
        content_locale: contentLocale,
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

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-obra-blue-950">{t("wizard.create.localeTitle")}</h2>
          <div className="grid grid-cols-2 gap-3">
            {CONTENT_LOCALE_OPTIONS.map((locale) => {
              const selected = contentLocale === locale;
              return (
                <button
                  key={locale}
                  type="button"
                  onClick={() => setContentLocale(locale)}
                  className={`flex items-center justify-between rounded-card border px-4 py-3 text-left text-sm transition-all ${
                    selected
                      ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
                      : "border-obra-blue-100 bg-white text-obra-neutral-600 hover:border-obra-blue-700/50"
                  }`}
                >
                  <span>{localeLabels[locale]}</span>
                  {selected ? <Check className="size-4 text-obra-blue-700" aria-hidden /> : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-obra-blue-950">{t("wizard.create.sourceTitle")}</h2>
          <ContentSourceCards
            t={t}
            value={contentSource}
            variant="select"
            onSelect={(source) => setContentSource(source)}
          />
        </section>

        {errorMessage ? (
          <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-obra-blue-100 pt-5">
          <Button variant="tertiary" onClick={() => navigate("/app/dashboard")} disabled={isSubmitting}>
            {t("wizard.create.cancel")}
          </Button>
          <Button variant="primary" onClick={() => void handleCreateProject()} disabled={isSubmitting}>
            {isSubmitting ? t("wizard.create.creating") : t("wizard.create.continue")}
          </Button>
        </div>
      </div>
    </div>
  );
}
