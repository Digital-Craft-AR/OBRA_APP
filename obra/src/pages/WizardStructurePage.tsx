import { useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { i18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type ProjectRow = {
  id: string;
  name: string;
  content_locale: string;
  content_source: "ai" | "upload";
  topic: string | null;
  structure_completed_at: string | null;
};

const INNER_STEPS = [
  "wizard.structure.inner.topic",
  "wizard.structure.inner.avatarProblem",
  "wizard.structure.inner.package",
  "wizard.structure.inner.design",
] as const;

export function WizardStructurePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ projectId: string }>();
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [innerStepIndex, setInnerStepIndex] = useState(0);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicImproving, setTopicImproving] = useState(false);
  const [topicMessage, setTopicMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      if (!params.projectId) return;
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("projects")
        .select("id, name, content_locale, content_source, topic, structure_completed_at")
        .eq("id", params.projectId)
        .single();
      if (cancelled) return;
      if (queryError || !data) {
        setError(t("wizard.structure.loadError"));
        setProject(null);
      } else {
        const row = data as ProjectRow;
        setProject(row);
        setTopicDraft(row.topic ?? "");
      }
      setLoading(false);
    }
    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [params.projectId, t]);

  const progressPercent = Math.round(((innerStepIndex + 1) / INNER_STEPS.length) * 100);
  const globalSteps = useMemo(
    () => [
      { id: 1, label: t("wizard.stepper.structure"), status: "active" as const },
      { id: 2, label: t("wizard.stepper.content"), status: "upcoming" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "upcoming" as const },
    ],
    [t],
  );

  async function handleSaveTopic() {
    if (!project?.id || topicSaving) return;
    setTopicSaving(true);
    setTopicMessage(null);
    const { error: updateError } = await supabase
      .from("projects")
      .update({ topic: topicDraft })
      .eq("id", project.id);
    setTopicSaving(false);
    if (updateError) {
      setTopicMessage(t("wizard.structure.topic.saveError"));
      return;
    }
    setProject((current) => (current ? { ...current, topic: topicDraft } : current));
    setTopicMessage(t("wizard.structure.topic.saved"));
  }

  async function handleImproveTopic() {
    if (!topicDraft.trim() || topicImproving) return;
    setTopicImproving(true);
    setTopicMessage(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{
      ok?: boolean;
      optimized?: string;
      stub?: boolean;
      error?: string;
    }>("ai-optimize", {
      method: "POST",
      body: {
        field: "topic",
        raw_text: topicDraft,
        language: i18n.language,
      },
    });
    setTopicImproving(false);

    if (invokeError || data?.error) {
      setTopicMessage(t("wizard.structure.topic.improveError"));
      return;
    }

    if (data?.optimized && typeof data.optimized === "string") {
      setTopicDraft(data.optimized);
      setTopicMessage(t("wizard.structure.topic.improved"));
      return;
    }

    // Current edge function is a billing/proxy stub and does not return edited copy yet.
    setTopicMessage(t("wizard.structure.topic.improvePending"));
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
          {t("wizard.structure.back")}
        </button>
      </div>

      <div className="border-b border-obra-blue-100 px-8 py-5">
        <WizardGlobalStepper steps={globalSteps} />
      </div>

      <div className="border-b border-obra-blue-100 px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-obra-neutral-600">
            {t("wizard.structure.stepCounter", {
              current: innerStepIndex + 1,
              total: INNER_STEPS.length,
              step: t(INNER_STEPS[innerStepIndex]),
            })}
          </span>
          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-obra-blue-100">
            <div
              className="h-full rounded-full bg-obra-blue-700 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-8 py-10">
        {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
        {error ? (
          <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {project && !loading ? (
          <div className="space-y-5">
            <header className="space-y-2">
              <h1 className="font-display text-2xl text-obra-blue-950">{t("wizard.structure.title")}</h1>
              <p className="text-sm text-obra-neutral-600">{t("wizard.structure.subtitle")}</p>
            </header>

            <div className="rounded-card border border-obra-blue-100 bg-obra-blue-50 p-5">
              <dl className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-obra-neutral-600">
                    {t("wizard.structure.projectName")}
                  </dt>
                  <dd className="mt-1 text-obra-blue-950">{project.name}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-obra-neutral-600">
                    {t("wizard.structure.contentLocale")}
                  </dt>
                  <dd className="mt-1 text-obra-blue-950">{project.content_locale}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-obra-neutral-600">
                    {t("wizard.structure.contentSource")}
                  </dt>
                  <dd className="mt-1 text-obra-blue-950">
                    {project.content_source === "upload"
                      ? t("wizard.create.source.upload.label")
                      : t("wizard.create.source.ai.label")}
                  </dd>
                </div>
              </dl>
            </div>

            <p className="text-sm text-obra-neutral-600">{t("wizard.structure.waveAStub")}</p>
            {innerStepIndex === 0 ? (
              <section className="space-y-3 rounded-card border border-obra-blue-100 bg-white p-5">
                <label htmlFor="wizard-topic" className="block text-sm font-semibold text-obra-blue-950">
                  {t("wizard.structure.topic.label")}
                </label>
                <textarea
                  id="wizard-topic"
                  value={topicDraft}
                  onChange={(event) => setTopicDraft(event.target.value)}
                  placeholder={t("wizard.structure.topic.placeholder")}
                  className="min-h-36 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 py-2 text-sm text-obra-neutral-900 outline-none focus:border-obra-blue-700 focus:ring-2 focus:ring-obra-blue-700"
                />
                <p className="text-xs text-obra-neutral-600">{t("wizard.structure.topic.hint")}</p>
                <div className="flex items-center gap-3">
                  <Button
                    variant="tertiary"
                    onClick={() => void handleImproveTopic()}
                    disabled={topicImproving || topicSaving || !topicDraft.trim()}
                  >
                    {topicImproving
                      ? t("wizard.structure.topic.improving")
                      : t("wizard.structure.topic.improve")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => void handleSaveTopic()}
                    disabled={topicSaving || topicImproving}
                  >
                    {topicSaving ? t("wizard.structure.topic.saving") : t("wizard.structure.topic.save")}
                  </Button>
                </div>
                <div aria-live="polite" className="text-xs text-obra-neutral-600">
                  {topicMessage}
                </div>
              </section>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="border-t border-obra-blue-100 px-8 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Button
            variant="tertiary"
            disabled={innerStepIndex === 0}
            onClick={() => setInnerStepIndex((current) => Math.max(0, current - 1))}
          >
            {t("wizard.structure.previous")}
          </Button>
          <Button
            variant="primary"
            disabled={innerStepIndex === INNER_STEPS.length - 1}
            onClick={() =>
              setInnerStepIndex((current) => Math.min(INNER_STEPS.length - 1, current + 1))
            }
          >
            {t("wizard.structure.next")}
          </Button>
        </div>
      </div>
    </div>
  );
}
