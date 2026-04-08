import { useEffect, useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Minus, Plus, RotateCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { ObraInput } from "@/components/obra/ObraInput";
import { ObraTextarea } from "@/components/obra/ObraTextarea";
import { Button } from "@/components/ui/Button";
import { WizardGuidedTour } from "@/components/wizard/WizardGuidedTour";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { i18n } from "@/i18n";
import { supabase } from "@/lib/supabaseClient";

type ProjectRow = {
  id: string;
  name: string;
  content_locale: string;
  content_source: "ai" | "upload";
  topic: string | null;
  problem: string | null;
  target_avatar: string | null;
  bonus_count: number;
  bump_count: number;
  main_title: string | null;
  author: string | null;
  structure_completed_at: string | null;
};

const INNER_STEPS = [
  "wizard.structure.inner.topic",
  "wizard.structure.inner.avatarProblem",
  "wizard.structure.inner.package",
  "wizard.structure.inner.design",
] as const;

const MAIN_TITLE_SETS = [
  [
    "La guía definitiva de velas aromáticas: de cero a negocio",
    "Velas artesanales que venden: sistema paso a paso",
    "De hobbysta a emprendedora: crea tu marca de velas",
    "El método de las velas: ingresos desde casa",
    "Velas con alma: la guía para emprendedoras creativas",
  ],
  [
    "Manual práctico de velas artesanales para vender online",
    "Emprende con velas: estrategia y ejecución para principiantes",
    "Velas rentables: diseño, costos y ventas en un solo sistema",
    "De idea a marca: construí tu negocio de velas en casa",
    "Guía de velas con propósito: crea, posiciona y vende",
  ],
] as const;

export function WizardStructurePage() {
  const { t } = useTranslation();
  const { session } = useAuth();
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
  const [avatarDraft, setAvatarDraft] = useState("");
  const [problemDraft, setProblemDraft] = useState("");
  const [avatarProblemSaving, setAvatarProblemSaving] = useState(false);
  const [avatarImproving, setAvatarImproving] = useState(false);
  const [problemImproving, setProblemImproving] = useState(false);
  const [avatarProblemMessage, setAvatarProblemMessage] = useState<string | null>(null);
  const [bonusCount, setBonusCount] = useState(0);
  const [bumpCount, setBumpCount] = useState(0);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);
  const [mainTitleSetIndex, setMainTitleSetIndex] = useState(0);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(0);
  const [customMainTitle, setCustomMainTitle] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [mainTitleSaving, setMainTitleSaving] = useState(false);
  const [mainTitleMessage, setMainTitleMessage] = useState<string | null>(null);
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadProject() {
      if (!params.projectId) return;
      setLoading(true);
      setError(null);
      const { data, error: queryError } = await supabase
        .from("projects")
        .select("id, name, content_locale, content_source, topic, problem, target_avatar, bonus_count, bump_count, main_title, author, structure_completed_at")
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
        setAvatarDraft(row.target_avatar ?? "");
        setProblemDraft(row.problem ?? "");
        setBonusCount(row.bonus_count ?? 0);
        setBumpCount(row.bump_count ?? 0);
        setAuthorDraft(row.author ?? "");
        if (row.main_title) {
          const matchingIndex = MAIN_TITLE_SETS[0].findIndex((title) => title === row.main_title);
          if (matchingIndex >= 0) {
            setSelectedTitleIndex(matchingIndex);
            setCustomMainTitle("");
          } else {
            setSelectedTitleIndex(null);
            setCustomMainTitle(row.main_title);
          }
        }
      }
      setLoading(false);
    }
    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [params.projectId, t]);

  useEffect(() => {
    let cancelled = false;
    async function loadTourState() {
      if (!session?.user?.id) return;
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("tour_dismissed_at")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled || error) return;
      const dismissedAt = (data as { tour_dismissed_at?: string | null } | null)?.tour_dismissed_at;
      setTourOpen(!dismissedAt);
    }
    void loadTourState();
    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  const globalSteps = useMemo(
    () => [
      { id: 1, label: t("wizard.stepper.structure"), status: "active" as const },
      { id: 2, label: t("wizard.stepper.content"), status: "upcoming" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "upcoming" as const },
    ],
    [t],
  );

  const tourSteps = useMemo(
    () => [
      {
        title: t("wizard.tour.step1.title"),
        body: t("wizard.tour.step1.body"),
      },
      {
        title: t("wizard.tour.step2.title"),
        body: t("wizard.tour.step2.body"),
      },
      {
        title: t("wizard.tour.step3.title"),
        body: t("wizard.tour.step3.body"),
      },
    ],
    [t],
  );

  async function dismissTour() {
    setTourOpen(false);
    if (!session?.user?.id) return;
    await supabase
      .from("creator_profiles")
      .update({ tour_dismissed_at: new Date().toISOString() })
      .eq("id", session.user.id);
  }

  async function persistTopic(): Promise<boolean> {
    if (!project?.id || topicSaving) return false;
    setTopicSaving(true);
    setTopicMessage(null);
    const { error: updateError } = await supabase
      .from("projects")
      .update({ topic: topicDraft })
      .eq("id", project.id);
    setTopicSaving(false);
    if (updateError) {
      setTopicMessage(t("wizard.structure.topic.saveError"));
      return false;
    }
    setProject((current) => (current ? { ...current, topic: topicDraft } : current));
    return true;
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

  async function persistAvatarProblem(): Promise<boolean> {
    if (!project?.id || avatarProblemSaving) return false;
    setAvatarProblemSaving(true);
    setAvatarProblemMessage(null);
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        target_avatar: avatarDraft || null,
        problem: problemDraft || null,
      })
      .eq("id", project.id);
    setAvatarProblemSaving(false);
    if (updateError) {
      setAvatarProblemMessage(t("wizard.structure.avatarProblem.saveError"));
      return false;
    }
    setProject((current) =>
      current
        ? {
            ...current,
            target_avatar: avatarDraft || null,
            problem: problemDraft || null,
          }
        : current,
    );
    return true;
  }

  async function improveAvatarText() {
    if (!avatarDraft.trim() || avatarImproving) return;
    setAvatarImproving(true);
    setAvatarProblemMessage(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{
      ok?: boolean;
      optimized?: string;
      error?: string;
    }>("ai-optimize", {
      method: "POST",
      body: {
        field: "avatar",
        raw_text: avatarDraft,
        language: i18n.language,
      },
    });
    setAvatarImproving(false);

    if (invokeError || data?.error) {
      setAvatarProblemMessage(t("wizard.structure.avatarProblem.improveError"));
      return;
    }

    if (data?.optimized && typeof data.optimized === "string") {
      setAvatarDraft(data.optimized);
      return;
    }

    setAvatarProblemMessage(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function improveProblemText() {
    if (!problemDraft.trim() || problemImproving) return;
    setProblemImproving(true);
    setAvatarProblemMessage(null);
    const { data, error: invokeError } = await supabase.functions.invoke<{
      ok?: boolean;
      optimized?: string;
      error?: string;
    }>("ai-optimize", {
      method: "POST",
      body: {
        field: "problem",
        raw_text: problemDraft,
        language: i18n.language,
      },
    });
    setProblemImproving(false);

    if (invokeError || data?.error) {
      setAvatarProblemMessage(t("wizard.structure.avatarProblem.improveError"));
      return;
    }

    if (data?.optimized && typeof data.optimized === "string") {
      setProblemDraft(data.optimized);
      return;
    }

    setAvatarProblemMessage(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function handleNextStep() {
    if (innerStepIndex === 0) {
      const saved = await persistTopic();
      if (!saved) return;
    }
    if (innerStepIndex === 1) {
      const saved = await persistAvatarProblem();
      if (!saved) return;
    }
    if (innerStepIndex === 2) {
      const saved = await persistPackageCounts();
      if (!saved) return;
    }
    if (innerStepIndex === 3) {
      const saved = await persistMainTitleAndAuthor();
      if (!saved) return;
      return;
    }
    setInnerStepIndex((current) => Math.min(INNER_STEPS.length - 1, current + 1));
  }

  async function persistMainTitleAndAuthor(): Promise<boolean> {
    if (!project?.id || mainTitleSaving) return false;
    const selectedTitle =
      selectedTitleIndex !== null ? MAIN_TITLE_SETS[mainTitleSetIndex][selectedTitleIndex] : null;
    const finalTitle = (customMainTitle.trim() || selectedTitle || "").trim();
    if (!finalTitle) {
      setMainTitleMessage(t("wizard.structure.step4.titleRequired"));
      return false;
    }

    setMainTitleSaving(true);
    setMainTitleMessage(null);
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        main_title: finalTitle,
        author: authorDraft || null,
      })
      .eq("id", project.id);
    setMainTitleSaving(false);

    if (updateError) {
      setMainTitleMessage(t("wizard.structure.step4.saveError"));
      return false;
    }

    setProject((current) =>
      current
        ? {
            ...current,
            main_title: finalTitle,
            author: authorDraft || null,
          }
        : current,
    );
    setMainTitleMessage(t("wizard.structure.step4.saved"));
    return true;
  }

  async function persistPackageCounts(): Promise<boolean> {
    if (!project?.id || packageSaving) return false;
    setPackageSaving(true);
    setPackageMessage(null);
    const { error: updateError } = await supabase
      .from("projects")
      .update({
        bonus_count: bonusCount,
        bump_count: bumpCount,
      })
      .eq("id", project.id);
    setPackageSaving(false);
    if (updateError) {
      setPackageMessage(t("wizard.structure.package.saveError"));
      return false;
    }
    setProject((current) =>
      current
        ? {
            ...current,
            bonus_count: bonusCount,
            bump_count: bumpCount,
          }
        : current,
    );
    return true;
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
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
          <div className="flex items-center gap-1">
            {INNER_STEPS.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-9 rounded-full transition-all ${
                  index <= innerStepIndex ? "bg-obra-blue-700" : "bg-obra-blue-100"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="flex flex-1">
        <div className="mx-auto w-full max-w-3xl px-8 py-10">
          {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
          {error ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {project && !loading ? (
            <div className="space-y-5">
            <header className="space-y-2">
              <h1 className="font-display text-2xl text-obra-blue-950">
                {innerStepIndex === 0
                  ? t("wizard.structure.step1.title")
                  : innerStepIndex === 1
                    ? t("wizard.structure.step2.title")
                    : innerStepIndex === 2
                      ? t("wizard.structure.step3.title")
                      : innerStepIndex === 3
                        ? t("wizard.structure.step4.title")
                    : t("wizard.structure.title")}
              </h1>
              <p className="text-sm text-obra-neutral-600">
                {innerStepIndex === 0
                  ? t("wizard.structure.step1.subtitle")
                  : innerStepIndex === 1
                    ? t("wizard.structure.step2.subtitle")
                    : innerStepIndex === 2
                      ? t("wizard.structure.step3.subtitle")
                      : innerStepIndex === 3
                        ? t("wizard.structure.step4.subtitle")
                  : t("wizard.structure.subtitle")}
              </p>
            </header>

            {innerStepIndex === 0 ? (
              <section className="space-y-3">
                <ObraTextarea
                  id="wizard-topic"
                  label={t("wizard.structure.topic.label")}
                  value={topicDraft}
                  onChange={(event) => setTopicDraft(event.target.value)}
                  placeholder={t("wizard.structure.topic.placeholder")}
                  assisted
                  onAssist={() => void handleImproveTopic()}
                  assistLabel={t("wizard.structure.topic.improve")}
                  aiStatus={topicImproving ? "loading" : "idle"}
                  disabled={topicSaving}
                />
                <div className="flex items-center gap-3">
                  {topicSaving ? <span className="text-xs text-obra-neutral-600">{t("wizard.structure.topic.saving")}</span> : null}
                </div>
                <div aria-live="polite" className="text-xs text-obra-neutral-600">
                  {topicMessage}
                </div>
              </section>
            ) : innerStepIndex === 1 ? (
              <section className="space-y-4">
                <ObraTextarea
                  id="wizard-avatar"
                  label={t("wizard.structure.step2.avatarLabel")}
                  value={avatarDraft}
                  onChange={(event) => setAvatarDraft(event.target.value)}
                  placeholder={t("wizard.structure.step2.avatarPlaceholder")}
                  assisted
                  onAssist={() => void improveAvatarText()}
                  assistLabel={t("wizard.structure.topic.improve")}
                  aiStatus={avatarImproving ? "loading" : "idle"}
                  disabled={avatarProblemSaving}
                />
                <ObraTextarea
                  id="wizard-problem"
                  label={t("wizard.structure.step2.problemLabel")}
                  value={problemDraft}
                  onChange={(event) => setProblemDraft(event.target.value)}
                  placeholder={t("wizard.structure.step2.problemPlaceholder")}
                  assisted
                  onAssist={() => void improveProblemText()}
                  assistLabel={t("wizard.structure.topic.improve")}
                  aiStatus={problemImproving ? "loading" : "idle"}
                  disabled={avatarProblemSaving}
                />
                {avatarProblemSaving ? (
                  <span className="text-xs text-obra-neutral-600">{t("wizard.structure.avatarProblem.saving")}</span>
                ) : null}
                <div aria-live="polite" className="text-xs text-obra-neutral-600">
                  {avatarProblemMessage}
                </div>
              </section>
            ) : innerStepIndex === 2 ? (
              <section className="space-y-5">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-obra-blue-950">{t("wizard.structure.step3.bonusLabel")}</p>
                    <div className="flex items-center gap-3">
                      <Button
                        size="small"
                        variant="tertiary"
                        onClick={() => setBonusCount((current) => Math.max(0, current - 1))}
                        disabled={packageSaving || bonusCount === 0}
                        className="size-8 rounded-full p-0 flex items-center justify-center"
                      >
                        <Minus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
                      </Button>
                      <span className="w-8 text-center text-xl font-semibold text-obra-blue-950">{bonusCount}</span>
                      <Button
                        size="small"
                        variant="tertiary"
                        onClick={() => setBonusCount((current) => Math.min(5, current + 1))}
                        disabled={packageSaving || bonusCount === 5}
                        className="size-8 rounded-full p-0 flex items-center justify-center"
                      >
                        <Plus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
                      </Button>
                    </div>
                    <p className="text-xs text-obra-neutral-600">{t("wizard.structure.step3.bonusHint")}</p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium text-obra-blue-950">{t("wizard.structure.step3.bumpLabel")}</p>
                    <div className="flex items-center gap-3">
                      <Button
                        size="small"
                        variant="tertiary"
                        onClick={() => setBumpCount((current) => Math.max(0, current - 1))}
                        disabled={packageSaving || bumpCount === 0}
                        className="size-8 rounded-full p-0 flex items-center justify-center"
                      >
                        <Minus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
                      </Button>
                      <span className="w-8 text-center text-xl font-semibold text-obra-blue-950">{bumpCount}</span>
                      <Button
                        size="small"
                        variant="tertiary"
                        onClick={() => setBumpCount((current) => Math.min(2, current + 1))}
                        disabled={packageSaving || bumpCount === 2}
                        className="size-8 rounded-full p-0 flex items-center justify-center"
                      >
                        <Plus className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
                      </Button>
                    </div>
                    <p className="text-xs text-obra-neutral-600">{t("wizard.structure.step3.bumpHint")}</p>
                  </div>
                </div>
                <div aria-live="polite" className="text-xs text-obra-neutral-600">
                  {packageSaving ? t("wizard.structure.package.saving") : packageMessage}
                </div>
              </section>
            ) : innerStepIndex === 3 ? (
              <section className="space-y-5">
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {MAIN_TITLE_SETS[mainTitleSetIndex].slice(0, 2).map((title, index) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => {
                          setSelectedTitleIndex(index);
                          setCustomMainTitle("");
                        }}
                        className={`rounded-card border p-4 text-left transition-all ${
                          selectedTitleIndex === index
                            ? "border-obra-blue-700 bg-obra-blue-50"
                            : "border-obra-blue-100 bg-white hover:border-obra-blue-700/50"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {selectedTitleIndex === index ? (
                            <Check className="mt-0.5 size-4 shrink-0 text-obra-blue-700" />
                          ) : null}
                          <span className="text-sm text-obra-blue-950">{title}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {MAIN_TITLE_SETS[mainTitleSetIndex].slice(2).map((title, index) => {
                      const realIndex = index + 2;
                      return (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            setSelectedTitleIndex(realIndex);
                            setCustomMainTitle("");
                          }}
                          className={`rounded-card border p-4 text-left transition-all ${
                            selectedTitleIndex === realIndex
                              ? "border-obra-blue-700 bg-obra-blue-50"
                              : "border-obra-blue-100 bg-white hover:border-obra-blue-700/50"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {selectedTitleIndex === realIndex ? (
                              <Check className="mt-0.5 size-4 shrink-0 text-obra-blue-700" />
                            ) : null}
                            <span className="text-sm text-obra-blue-950">{title}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  className="inline-flex items-center gap-2 text-sm font-medium text-obra-blue-700 hover:underline"
                  onClick={() => {
                    setMainTitleSetIndex((current) => (current + 1) % MAIN_TITLE_SETS.length);
                    setSelectedTitleIndex(null);
                  }}
                >
                  <RotateCw className="size-4" aria-hidden />
                  {t("wizard.structure.step4.regenerate")}
                </button>
                <p className="text-xs text-obra-neutral-600">{t("wizard.structure.step4.regenerateHint")}</p>

                <div className="space-y-4">
                  <ObraInput
                    id="wizard-main-title-custom"
                    label={t("wizard.structure.step4.customTitleLabel")}
                    value={customMainTitle}
                    onChange={(event) => {
                      setCustomMainTitle(event.target.value);
                      setSelectedTitleIndex(null);
                    }}
                    placeholder={t("wizard.structure.step4.customTitlePlaceholder")}
                  />

                  <ObraInput
                    id="wizard-author"
                    label={t("wizard.structure.step4.authorLabel")}
                    value={authorDraft}
                    onChange={(event) => setAuthorDraft(event.target.value)}
                    placeholder={t("wizard.structure.step4.authorPlaceholder")}
                  />
                </div>

                <div aria-live="polite" className="text-xs text-obra-neutral-600">
                  {mainTitleSaving ? t("wizard.structure.step4.saving") : mainTitleMessage}
                </div>
              </section>
            ) : (
              <p className="text-sm text-obra-neutral-600">{t("wizard.structure.waveAStub")}</p>
            )}
            </div>
          ) : null}
        </div>
      </main>

      <div className="border-t border-obra-blue-100 px-8 py-5">
        <div className="mx-auto flex w-full items-center justify-between">
          <Button
            variant="tertiary"
            disabled={innerStepIndex === 0}
            onClick={() => setInnerStepIndex((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("wizard.structure.previous")}
          </Button>
          <Button
            variant="primary"
            disabled={mainTitleSaving}
            onClick={() => void handleNextStep()}
          >
            {innerStepIndex === INNER_STEPS.length - 1 ? t("wizard.structure.finish") : t("wizard.structure.next")}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <WizardGuidedTour
        open={tourOpen}
        title={tourSteps[tourStep]?.title ?? ""}
        body={tourSteps[tourStep]?.body ?? ""}
        stepLabel={t("wizard.tour.stepLabel", { current: tourStep + 1, total: tourSteps.length })}
        skipLabel={t("wizard.tour.skip")}
        previousLabel={t("wizard.tour.previous")}
        nextLabel={t("wizard.tour.next")}
        finishLabel={t("wizard.tour.finish")}
        canGoBack={tourStep > 0}
        canGoNext={tourStep < tourSteps.length - 1}
        onBack={() => setTourStep((current) => Math.max(0, current - 1))}
        onNext={() => setTourStep((current) => Math.min(tourSteps.length - 1, current + 1))}
        onSkip={() => void dismissTour()}
        onFinish={() => void dismissTour()}
      />
    </div>
  );
}
