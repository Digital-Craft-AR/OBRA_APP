import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { StructureStepAvatarProblem } from "@/components/wizard/structure/StructureStepAvatarProblem";
import { StructureStepBonusBumpTitles } from "@/components/wizard/structure/StructureStepBonusBumpTitles";
import { StructureStepDesign } from "@/components/wizard/structure/StructureStepDesign";
import { StructureStepDesignConfig } from "@/components/wizard/structure/StructureStepDesignConfig";
import { StructureStepHeader } from "@/components/wizard/structure/StructureStepHeader";
import { StructureStepPackage } from "@/components/wizard/structure/StructureStepPackage";
import { StructureStepTopic } from "@/components/wizard/structure/StructureStepTopic";
import { WizardGuidedTour } from "@/components/wizard/WizardGuidedTour";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { useWizardStructureFlow } from "@/hooks/wizard/useWizardStructureFlow";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import { useWizardTourState } from "@/hooks/wizard/useWizardTourState";
import { INNER_STEPS } from "@/lib/wizard/structureTypes";

export function WizardStructurePage() {
  const { t, i18n } = useTranslation();
  const { session } = useAuth();
  const navigate = useNavigate();
  const params = useParams<{ projectId: string }>();

  const { project, setProject, loading, error } = useWizardStructureProject(
    params.projectId,
    t("wizard.structure.loadError"),
  );

  const flow = useWizardStructureFlow({
    project,
    setProject,
    t,
    language: i18n.language,
  });

  const { tourOpen, tourStep, setTourStep, dismissTour } = useWizardTourState(session?.user?.id);

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
      { title: t("wizard.tour.step1.title"), body: t("wizard.tour.step1.body") },
      { title: t("wizard.tour.step2.title"), body: t("wizard.tour.step2.body") },
      { title: t("wizard.tour.step3.title"), body: t("wizard.tour.step3.body") },
    ],
    [t],
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
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

      <StructureStepHeader
        stepCounterLabel={t("wizard.structure.stepCounter", {
          current: flow.innerStepIndex + 1,
          total: INNER_STEPS.length,
          step: t(INNER_STEPS[flow.innerStepIndex]),
        })}
        currentStep={flow.innerStepIndex}
        totalSteps={INNER_STEPS.length}
        title={flow.stepTitle}
        subtitle={flow.stepSubtitle}
      />

      <main className="flex flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-8 py-10">
          {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
          {error ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {project && !loading ? (
            <div className="space-y-5">
              {flow.innerStepIndex === 0 ? (
                <StructureStepTopic
                  label={t("wizard.structure.topic.label")}
                  placeholder={t("wizard.structure.topic.placeholder")}
                  assistLabel={t("wizard.structure.topic.improve")}
                  value={flow.topicDraft}
                  error={flow.topicError ?? undefined}
                  disabled={flow.topicSaving}
                  improving={flow.topicImproving}
                  saving={flow.topicSaving}
                  savingLabel={t("wizard.structure.topic.saving")}
                  message={flow.topicMessage}
                  onChange={(value) => {
                    flow.setTopicDraft(value);
                    if (value.trim()) flow.setTopicError(null);
                  }}
                  onAssist={() => void flow.handleImproveTopic()}
                />
              ) : null}

              {flow.innerStepIndex === 1 ? (
                <StructureStepAvatarProblem
                  avatarLabel={t("wizard.structure.step2.avatarLabel")}
                  avatarPlaceholder={t("wizard.structure.step2.avatarPlaceholder")}
                  avatarValue={flow.avatarDraft}
                  avatarError={flow.avatarError ?? undefined}
                  avatarImproving={flow.avatarImproving}
                  problemLabel={t("wizard.structure.step2.problemLabel")}
                  problemPlaceholder={t("wizard.structure.step2.problemPlaceholder")}
                  problemValue={flow.problemDraft}
                  problemError={flow.problemError ?? undefined}
                  problemImproving={flow.problemImproving}
                  assistLabel={t("wizard.structure.topic.improve")}
                  disabled={flow.avatarProblemSaving}
                  saving={flow.avatarProblemSaving}
                  savingLabel={t("wizard.structure.avatarProblem.saving")}
                  message={flow.avatarProblemMessage}
                  onAvatarChange={(value) => {
                    flow.setAvatarDraft(value);
                    if (value.trim()) flow.setAvatarError(null);
                  }}
                  onProblemChange={(value) => {
                    flow.setProblemDraft(value);
                    if (value.trim()) flow.setProblemError(null);
                  }}
                  onImproveAvatar={() => void flow.improveAvatarText()}
                  onImproveProblem={() => void flow.improveProblemText()}
                />
              ) : null}

              {flow.innerStepIndex === 2 ? (
                <StructureStepPackage
                  bonusLabel={t("wizard.structure.step3.bonusLabel")}
                  bonusHint={t("wizard.structure.step3.bonusHint")}
                  bonusCount={flow.bonusCount}
                  bumpLabel={t("wizard.structure.step3.bumpLabel")}
                  bumpHint={t("wizard.structure.step3.bumpHint")}
                  bumpCount={flow.bumpCount}
                  saving={flow.packageSaving}
                  savingLabel={t("wizard.structure.package.saving")}
                  message={flow.packageMessage}
                  onBonusChange={flow.setBonusCount}
                  onBumpChange={flow.setBumpCount}
                />
              ) : null}

              {flow.innerStepIndex === 3 ? (
                <StructureStepDesign
                  titleSuggestions={flow.titleSuggestions}
                  selectedTitleIndex={flow.selectedTitleIndex}
                  customMainTitle={flow.customMainTitle}
                  authorDraft={flow.authorDraft}
                  mainTitleError={flow.mainTitleError ?? undefined}
                  suggestionsLoading={flow.titleSuggestionsLoading}
                  saving={flow.mainTitleSaving}
                  message={flow.mainTitleMessage}
                  regenerateLabel={t("wizard.structure.step4.regenerate")}
                  regenerateHint={t("wizard.structure.step4.regenerateHint")}
                  customTitleLabel={t("wizard.structure.step4.customTitleLabel")}
                  customTitlePlaceholder={t("wizard.structure.step4.customTitlePlaceholder")}
                  authorLabel={t("wizard.structure.step4.authorLabel")}
                  authorPlaceholder={t("wizard.structure.step4.authorPlaceholder")}
                  suggestionsLoadingLabel={t("wizard.structure.step4.suggestionsLoading")}
                  savingLabel={t("wizard.structure.step4.saving")}
                  onSelectSuggestion={(index) => {
                    flow.setSelectedTitleIndex(index);
                    flow.setCustomMainTitle("");
                    flow.setMainTitleError(null);
                  }}
                  onRegenerate={() => void flow.generateMainTitleSuggestions()}
                  onCustomTitleChange={(value) => {
                    flow.setCustomMainTitle(value);
                    flow.setSelectedTitleIndex(null);
                    if (value.trim()) flow.setMainTitleError(null);
                  }}
                  onAuthorChange={flow.setAuthorDraft}
                />
              ) : null}

              {flow.innerStepIndex === 4 ? (
                <StructureStepBonusBumpTitles
                  bonusItems={flow.bonusItems}
                  bumpItems={flow.bumpItems}
                  showBonus
                  showBump={false}
                  loadingKey={flow.itemRegeneratingKey}
                  message={flow.itemsMessage}
                  bonusSectionLabel={t("wizard.structure.step5.bonusSection")}
                  bumpSectionLabel={t("wizard.structure.step5.bumpSection")}
                  regenerateAllLabel={t("wizard.structure.step5.regenerateAll")}
                  onChangeBonusTitle={(index, title) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    )
                  }
                  onChangeBumpTitle={(index, title) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    )
                  }
                  onToggleBonusLock={(index) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, locked: !item.locked } : item,
                      ),
                    )
                  }
                  onToggleBumpLock={(index) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, locked: !item.locked } : item,
                      ),
                    )
                  }
                  onRegenerateBonus={(index) => void flow.regenerateItem("bonus", index)}
                  onRegenerateBump={(index) => void flow.regenerateItem("bump", index)}
                  onRegenerateAllBonus={() => void flow.regenerateAllItems("bonus")}
                  onRegenerateAllBump={() => void flow.regenerateAllItems("bump")}
                />
              ) : null}

              {flow.innerStepIndex === 5 ? (
                <StructureStepBonusBumpTitles
                  bonusItems={flow.bonusItems}
                  bumpItems={flow.bumpItems}
                  showBonus={false}
                  showBump
                  loadingKey={flow.itemRegeneratingKey}
                  message={flow.itemsMessage}
                  bonusSectionLabel={t("wizard.structure.step5.bonusSection")}
                  bumpSectionLabel={t("wizard.structure.step6.bumpSection")}
                  regenerateAllLabel={t("wizard.structure.step5.regenerateAll")}
                  onChangeBonusTitle={(index, title) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    )
                  }
                  onChangeBumpTitle={(index, title) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, title } : item,
                      ),
                    )
                  }
                  onToggleBonusLock={(index) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, locked: !item.locked } : item,
                      ),
                    )
                  }
                  onToggleBumpLock={(index) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, locked: !item.locked } : item,
                      ),
                    )
                  }
                  onRegenerateBonus={(index) => void flow.regenerateItem("bonus", index)}
                  onRegenerateBump={(index) => void flow.regenerateItem("bump", index)}
                  onRegenerateAllBonus={() => void flow.regenerateAllItems("bonus")}
                  onRegenerateAllBump={() => void flow.regenerateAllItems("bump")}
                />
              ) : null}

              {flow.innerStepIndex === 6 ? (
                <StructureStepDesignConfig
                  config={flow.designConfig}
                  message={flow.designMessage}
                  onChange={flow.setDesignConfig}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <div className="border-t border-obra-blue-100 px-8 py-5">
        <div className="mx-auto flex w-full items-center justify-between">
          <Button
            variant="tertiary"
            disabled={flow.innerStepIndex === 0}
            onClick={() => flow.setInnerStepIndex((current) => Math.max(0, current - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("wizard.structure.previous")}
          </Button>
          <Button
            variant="primary"
            disabled={flow.mainTitleSaving}
            onClick={() => void flow.handleNextStep()}
          >
            {flow.innerStepIndex === INNER_STEPS.length - 1
              ? t("wizard.structure.finish")
              : t("wizard.structure.next")}
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
