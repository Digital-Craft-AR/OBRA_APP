import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/auth/authContext";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { StructureStepAvatarProblem } from "@/components/wizard/structure/StructureStepAvatarProblem";
import { StructureStepBonusBumpTitles } from "@/components/wizard/structure/StructureStepBonusBumpTitles";
import { StructureStepDesign } from "@/components/wizard/structure/StructureStepDesign";
import { StructureStepDesignConfig } from "@/components/wizard/structure/StructureStepDesignConfig";
import {
  StructureStepInnerProgress,
  StructureStepTitleBlock,
} from "@/components/wizard/structure/StructureStepHeader";
import { StructureStepPackage } from "@/components/wizard/structure/StructureStepPackage";
import { StructureStepTopic } from "@/components/wizard/structure/StructureStepTopic";
import { WizardGuidedTour } from "@/components/wizard/WizardGuidedTour";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { ObraSpinner } from "@/components/obra/ObraSpinner";
import { ObraAlert } from "@/components/obra/ObraAlert";
import { useWizardStructureFlow } from "@/hooks/wizard/useWizardStructureFlow";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import { useWizardTourState } from "@/hooks/wizard/useWizardTourState";
import { toastApiFailure } from "@/lib/apiToast";
import { markStructureCompleted } from "@/lib/wizard/structurePersistence";
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

  const [structureGateError, setStructureGateError] = useState<string | null>(null);
  const [avatarResetModalOpen, setAvatarResetModalOpen] = useState(false);
  const [avatarResetModalStep, setAvatarResetModalStep] = useState<1 | 2>(1);
  const flow = useWizardStructureFlow({
    project,
    setProject,
    t,
    language: i18n.language,
  });

  const { tourOpen, tourStep, setTourStep, dismissTour } = useWizardTourState(session?.user?.id);

  // Redirect if the project is archived or in trash — read-only, editing not allowed.
  useEffect(() => {
    if (!loading && project && project.lifecycle_status !== "active") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [loading, project, navigate]);

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
      <div className="flex items-center justify-between bg-obra-blue-900 px-6 pt-4 pb-2">
        <WizardGlobalStepper steps={globalSteps} dark />
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          aria-label={t("wizard.structure.back")}
          className="rounded-md p-1.5 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <StructureStepInnerProgress
        stepName={t(INNER_STEPS[flow.innerStepIndex] ?? "")}
        currentStep={flow.innerStepIndex}
        totalSteps={INNER_STEPS.length}
      />

      <main className="flex flex-1 min-h-0 flex-col overflow-y-auto">
        <StructureStepTitleBlock title={flow.stepTitle} subtitle={flow.stepSubtitle} />
        <div className="mx-auto w-full max-w-3xl px-8 pb-10">
          {loading ? <ObraSpinner size="lg" className="py-16" /> : null}
          {error ? <ObraAlert variant="error" title={error} className="mb-4" /> : null}
          {structureGateError ? <ObraAlert variant="error" title={structureGateError} className="mb-4" /> : null}

          {project && !loading ? (
            <div className="space-y-5" data-testid={`wizard-structure-step-${flow.innerStepIndex}`}>
              {flow.innerStepIndex === 0 ? (
                <StructureStepTopic
                  label={t("wizard.structure.topic.label")}
                  placeholder={t("wizard.structure.topic.placeholder")}
                  assistLabel={t("wizard.structure.topic.improve")}
                  hint={
                    [t("wizard.structure.topic.hint"), flow.topicAssistHint].filter(Boolean).join("\n\n") || undefined
                  }
                  value={flow.topicDraft}
                  error={flow.topicError ?? flow.topicAssistError ?? undefined}
                  disabled={flow.topicSaving}
                  improving={flow.topicImproving}
                  saving={flow.topicSaving}
                  savingLabel={t("wizard.structure.topic.saving")}
                  onChange={(value) => {
                    flow.clearTopicAssistFeedback();
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
                  avatarHint={flow.avatarAssistHint ?? undefined}
                  avatarValue={flow.avatarDraft}
                  avatarError={flow.avatarError ?? flow.avatarAssistError ?? undefined}
                  avatarImproving={flow.avatarImproving}
                  problemLabel={t("wizard.structure.step2.problemLabel")}
                  problemPlaceholder={t("wizard.structure.step2.problemPlaceholder")}
                  problemHint={flow.problemAssistHint ?? undefined}
                  problemValue={flow.problemDraft}
                  problemError={flow.problemError ?? flow.problemAssistError ?? undefined}
                  problemImproving={flow.problemImproving}
                  assistLabel={t("wizard.structure.topic.improve")}
                  disabled={flow.avatarProblemSaving}
                  saving={flow.avatarProblemSaving}
                  savingLabel={t("wizard.structure.avatarProblem.saving")}
                  footerMessage={flow.avatarProblemFooterMessage}
                  onAvatarChange={(value) => {
                    flow.clearAvatarAssistFeedback();
                    flow.setAvatarDraft(value);
                    if (value.trim()) flow.setAvatarError(null);
                  }}
                  onProblemChange={(value) => {
                    flow.clearProblemAssistFeedback();
                    flow.setProblemDraft(value);
                    if (value.trim()) flow.setProblemError(null);
                  }}
                  onImproveAvatar={() => void flow.improveAvatarText()}
                  onImproveProblem={() => void flow.improveProblemText()}
                  contentTone={flow.designConfig.contentTone}
                  onContentToneChange={(tone) =>
                    flow.setDesignConfig({ ...flow.designConfig, contentTone: tone })
                  }
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
                  onSelectSuggestion={flow.selectMainTitleFromSuggestion}
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
                  confirmBonusAriaLabel={t("wizard.structure.step5.confirmBonusAriaLabel")}
                  confirmBumpAriaLabel={t("wizard.structure.step5.confirmBumpAriaLabel")}
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
                  onBlurBonusTitle={(index) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index && item.title.trim() ? { ...item, locked: true } : item,
                      ),
                    )
                  }
                  onBlurBumpTitle={(index) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index && item.title.trim() ? { ...item, locked: true } : item,
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
                  confirmBonusAriaLabel={t("wizard.structure.step5.confirmBonusAriaLabel")}
                  confirmBumpAriaLabel={t("wizard.structure.step5.confirmBumpAriaLabel")}
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
                  onBlurBonusTitle={(index) =>
                    flow.setBonusItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index && item.title.trim() ? { ...item, locked: true } : item,
                      ),
                    )
                  }
                  onBlurBumpTitle={(index) =>
                    flow.setBumpItems((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index && item.title.trim() ? { ...item, locked: true } : item,
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
                  onChange={flow.setDesignConfig}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </main>

      <div className="border-t border-obra-blue-100 bg-white px-4 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="mx-auto flex w-full items-center justify-between">
          <Button
            variant="tertiary"
            disabled={flow.innerStepIndex === 0}
            onClick={() => flow.setInnerStepIndex((current) => Math.max(0, current - 1))}
            data-testid="wizard-structure-prev"
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("wizard.structure.previous")}
          </Button>
          <Button
            variant="primary"
            data-testid="wizard-structure-next"
            disabled={
              flow.innerStepIndex === INNER_STEPS.length - 1 ? flow.designSaving : flow.mainTitleSaving
            }
            onClick={() =>
              void (async () => {
                setStructureGateError(null);
                if (
                  flow.innerStepIndex === 1 &&
                  project?.structure_completed_at &&
                  flow.avatarProblemChanged
                ) {
                  setAvatarResetModalStep(1);
                  setAvatarResetModalOpen(true);
                  return;
                }
                const result = await flow.handleNextStep();
                if (!result.ok) return;
                if (result.finishedStructure && params.projectId) {
                  const marked = await markStructureCompleted(params.projectId);
                  if (!marked.ok) {
                    const key = "wizard.structure.step7.structureMarkError";
                    setStructureGateError(t(key));
                    toastApiFailure(t, key);
                    return;
                  }
                  setProject((current) =>
                    current
                      ? { ...current, structure_completed_at: new Date().toISOString() }
                      : current,
                  );
                  navigate(`/app/projects/${params.projectId}/content`);
                }
              })()
            }
          >
            {flow.innerStepIndex === INNER_STEPS.length - 1
              ? t("wizard.structure.step7.continueToContent")
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

      <Modal
        open={avatarResetModalOpen}
        onClose={() => setAvatarResetModalOpen(false)}
        closeLabel={t("wizard.structure.avatarReset.modal.closeAria")}
      >
        <ModalHead>
          <ModalTitle>
            {avatarResetModalStep === 1
              ? t("wizard.structure.avatarReset.modal.step1Title")
              : t("wizard.structure.avatarReset.modal.step2Title")}
          </ModalTitle>
        </ModalHead>
        <ModalContent>
          {avatarResetModalStep === 1
            ? t("wizard.structure.avatarReset.modal.step1Body")
            : t("wizard.structure.avatarReset.modal.step2Body")}
        </ModalContent>
        <ModalFooter className="justify-end">
          {avatarResetModalStep === 1 ? (
            <>
              <Button
                type="button"
                variant="tertiary"
                size="medium"
                onClick={() => setAvatarResetModalOpen(false)}
              >
                {t("wizard.structure.avatarReset.modal.cancel")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={() => {
                  setAvatarResetModalOpen(false);
                  void (async () => {
                    const result = await flow.handleNextStep({ forceResetAvatarProblem: false });
                    if (!result.ok) return;
                    if (result.finishedStructure && params.projectId) {
                      const marked = await markStructureCompleted(params.projectId);
                      if (!marked.ok) {
                        const key = "wizard.structure.step7.structureMarkError";
                        setStructureGateError(t(key));
                        toastApiFailure(t, key);
                        return;
                      }
                      setProject((current) =>
                        current ? { ...current, structure_completed_at: new Date().toISOString() } : current,
                      );
                      navigate(`/app/projects/${params.projectId}/content`);
                    }
                  })();
                }}
              >
                {t("wizard.structure.avatarReset.modal.keepContent")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={() => setAvatarResetModalStep(2)}
              >
                {t("wizard.structure.avatarReset.modal.startFresh")}
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="tertiary"
                size="medium"
                onClick={() => setAvatarResetModalStep(1)}
              >
                {t("wizard.structure.avatarReset.modal.back")}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={() => {
                  setAvatarResetModalOpen(false);
                  void (async () => {
                    const result = await flow.handleNextStep({ forceResetAvatarProblem: true });
                    if (!result.ok) return;
                    if (result.finishedStructure && params.projectId) {
                      const marked = await markStructureCompleted(params.projectId);
                      if (!marked.ok) {
                        const key = "wizard.structure.step7.structureMarkError";
                        setStructureGateError(t(key));
                        toastApiFailure(t, key);
                        return;
                      }
                      setProject((current) =>
                        current ? { ...current, structure_completed_at: new Date().toISOString() } : current,
                      );
                      navigate(`/app/projects/${params.projectId}/content`);
                    }
                  })();
                }}
              >
                {t("wizard.structure.avatarReset.modal.confirmFresh")}
              </Button>
            </>
          )}
        </ModalFooter>
      </Modal>

    </div>
  );
}
