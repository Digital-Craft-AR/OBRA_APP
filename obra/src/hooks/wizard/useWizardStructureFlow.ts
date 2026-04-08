import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import { improveWizardText, suggestWizardTitles } from "@/lib/wizard/aiOptimize";
import {
  INNER_STEPS,
  type ProjectRow,
} from "@/lib/wizard/structureTypes";
import {
  saveWizardAvatarProblem,
  saveWizardMainTitle,
  saveWizardPackageCounts,
  saveWizardTopic,
} from "@/lib/wizard/structurePersistence";

type FlowArgs = {
  project: ProjectRow | null;
  setProject: Dispatch<SetStateAction<ProjectRow | null>>;
  t: TFunction;
  language: string;
};

export function useWizardStructureFlow({ project, setProject, t, language }: FlowArgs) {
  const [innerStepIndex, setInnerStepIndex] = useState(0);
  const [topicDraft, setTopicDraft] = useState("");
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicImproving, setTopicImproving] = useState(false);
  const [topicMessage, setTopicMessage] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [avatarDraft, setAvatarDraft] = useState("");
  const [problemDraft, setProblemDraft] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [avatarProblemSaving, setAvatarProblemSaving] = useState(false);
  const [avatarImproving, setAvatarImproving] = useState(false);
  const [problemImproving, setProblemImproving] = useState(false);
  const [avatarProblemMessage, setAvatarProblemMessage] = useState<string | null>(null);

  const [bonusCount, setBonusCount] = useState(0);
  const [bumpCount, setBumpCount] = useState(0);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);

  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [customMainTitle, setCustomMainTitle] = useState("");
  const [authorDraft, setAuthorDraft] = useState("");
  const [mainTitleError, setMainTitleError] = useState<string | null>(null);
  const [titleSuggestionsLoading, setTitleSuggestionsLoading] = useState(false);
  const [mainTitleSaving, setMainTitleSaving] = useState(false);
  const [mainTitleMessage, setMainTitleMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setTopicDraft(project.topic ?? "");
    setAvatarDraft(project.target_avatar ?? "");
    setProblemDraft(project.problem ?? "");
    setBonusCount(project.bonus_count ?? 0);
    setBumpCount(project.bump_count ?? 0);
    setAuthorDraft(project.author ?? "");
    if (project.main_title) {
      const matchingIndex = titleSuggestions.findIndex((title) => title === project.main_title);
      if (matchingIndex >= 0) {
        setSelectedTitleIndex(matchingIndex);
        setCustomMainTitle("");
      } else {
        setSelectedTitleIndex(null);
        setCustomMainTitle(project.main_title);
      }
    }
  }, [project, titleSuggestions]);

  useEffect(() => {
    if (innerStepIndex !== 3) return;
    if (titleSuggestionsLoading) return;
    void generateMainTitleSuggestions();
  }, [innerStepIndex]);

  const stepTitle = useMemo(() => {
    if (innerStepIndex === 0) return t("wizard.structure.step1.title");
    if (innerStepIndex === 1) return t("wizard.structure.step2.title");
    if (innerStepIndex === 2) return t("wizard.structure.step3.title");
    if (innerStepIndex === 3) return t("wizard.structure.step4.title");
    return t("wizard.structure.title");
  }, [innerStepIndex, t]);

  const stepSubtitle = useMemo(() => {
    if (innerStepIndex === 0) return t("wizard.structure.step1.subtitle");
    if (innerStepIndex === 1) return t("wizard.structure.step2.subtitle");
    if (innerStepIndex === 2) return t("wizard.structure.step3.subtitle");
    if (innerStepIndex === 3) return t("wizard.structure.step4.subtitle");
    return t("wizard.structure.subtitle");
  }, [innerStepIndex, t]);

  async function persistTopic(): Promise<boolean> {
    if (!project?.id || topicSaving) return false;
    setTopicSaving(true);
    setTopicMessage(null);
    const result = await saveWizardTopic(project.id, topicDraft);
    setTopicSaving(false);
    if (!result.ok) {
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
    const result = await improveWizardText({
      field: "topic",
      rawText: topicDraft,
      language,
    });
    setTopicImproving(false);
    if (!result.ok) {
      setTopicMessage(t("wizard.structure.topic.improveError"));
      return;
    }
    if (result.optimized) {
      setTopicDraft(result.optimized);
      setTopicMessage(t("wizard.structure.topic.improved"));
      return;
    }
    setTopicMessage(t("wizard.structure.topic.improvePending"));
  }

  async function persistAvatarProblem(): Promise<boolean> {
    if (!project?.id || avatarProblemSaving) return false;
    setAvatarProblemSaving(true);
    setAvatarProblemMessage(null);
    const result = await saveWizardAvatarProblem(project.id, avatarDraft, problemDraft);
    setAvatarProblemSaving(false);
    if (!result.ok) {
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
    const result = await improveWizardText({
      field: "target_avatar",
      rawText: avatarDraft,
      language,
    });
    setAvatarImproving(false);
    if (!result.ok) {
      setAvatarProblemMessage(t("wizard.structure.avatarProblem.improveError"));
      return;
    }
    if (result.optimized) {
      setAvatarDraft(result.optimized);
      return;
    }
    setAvatarProblemMessage(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function improveProblemText() {
    if (!problemDraft.trim() || problemImproving) return;
    setProblemImproving(true);
    setAvatarProblemMessage(null);
    const result = await improveWizardText({
      field: "problem",
      rawText: problemDraft,
      language,
    });
    setProblemImproving(false);
    if (!result.ok) {
      setAvatarProblemMessage(t("wizard.structure.avatarProblem.improveError"));
      return;
    }
    if (result.optimized) {
      setProblemDraft(result.optimized);
      return;
    }
    setAvatarProblemMessage(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function persistPackageCounts(): Promise<boolean> {
    if (!project?.id || packageSaving) return false;
    setPackageSaving(true);
    setPackageMessage(null);
    const result = await saveWizardPackageCounts(project.id, bonusCount, bumpCount);
    setPackageSaving(false);
    if (!result.ok) {
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

  async function generateMainTitleSuggestions() {
    setTitleSuggestionsLoading(true);
    setMainTitleMessage(null);
    const result = await suggestWizardTitles({
      topic: topicDraft,
      problem: problemDraft,
      avatar: avatarDraft,
      contentLocale: project?.content_locale ?? null,
      language,
      count: 5,
    });
    setTitleSuggestionsLoading(false);
    if (!result.ok) {
      setTitleSuggestions([]);
      setSelectedTitleIndex(null);
      setMainTitleMessage(t("wizard.structure.step4.suggestionsError"));
      return;
    }
    if (result.suggestions.length > 0) {
      setTitleSuggestions(result.suggestions);
      setSelectedTitleIndex(null);
      setMainTitleMessage(null);
      return;
    }
    setTitleSuggestions([]);
    setSelectedTitleIndex(null);
    setMainTitleMessage(t("wizard.structure.step4.suggestionsError"));
  }

  async function persistMainTitleAndAuthor(): Promise<boolean> {
    if (!project?.id || mainTitleSaving) return false;
    const selectedTitle = selectedTitleIndex !== null ? titleSuggestions[selectedTitleIndex] : null;
    const finalTitle = (customMainTitle.trim() || selectedTitle || "").trim();
    if (!finalTitle) {
      setMainTitleError(t("wizard.structure.step4.titleRequired"));
      return false;
    }
    setMainTitleError(null);
    setMainTitleSaving(true);
    setMainTitleMessage(null);
    const result = await saveWizardMainTitle(project.id, finalTitle, authorDraft);
    setMainTitleSaving(false);
    if (!result.ok) {
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

  async function handleNextStep() {
    if (innerStepIndex === 0) {
      if (!topicDraft.trim()) {
        setTopicError(t("wizard.structure.topic.required"));
        return;
      }
      setTopicError(null);
      const saved = await persistTopic();
      if (!saved) return;
    }

    if (innerStepIndex === 1) {
      if (!avatarDraft.trim()) {
        setAvatarError(t("wizard.structure.step2.avatarRequired"));
        setProblemError(null);
        return;
      }
      if (!problemDraft.trim()) {
        setAvatarError(null);
        setProblemError(t("wizard.structure.step2.problemRequired"));
        return;
      }
      setAvatarError(null);
      setProblemError(null);
      const saved = await persistAvatarProblem();
      if (!saved) return;
    }

    if (innerStepIndex === 2) {
      const saved = await persistPackageCounts();
      if (!saved) return;
    }

    if (innerStepIndex === 3) {
      await persistMainTitleAndAuthor();
      return;
    }

    setInnerStepIndex((current) => Math.min(INNER_STEPS.length - 1, current + 1));
  }

  return {
    innerStepIndex,
    setInnerStepIndex,
    stepTitle,
    stepSubtitle,
    topicDraft,
    topicSaving,
    topicImproving,
    topicMessage,
    topicError,
    setTopicDraft,
    setTopicError,
    handleImproveTopic,
    avatarDraft,
    problemDraft,
    avatarError,
    problemError,
    avatarProblemSaving,
    avatarImproving,
    problemImproving,
    avatarProblemMessage,
    setAvatarDraft,
    setProblemDraft,
    setAvatarError,
    setProblemError,
    improveAvatarText,
    improveProblemText,
    bonusCount,
    bumpCount,
    packageSaving,
    packageMessage,
    setBonusCount,
    setBumpCount,
    titleSuggestions,
    selectedTitleIndex,
    customMainTitle,
    authorDraft,
    mainTitleError,
    titleSuggestionsLoading,
    mainTitleSaving,
    mainTitleMessage,
    setSelectedTitleIndex,
    setCustomMainTitle,
    setAuthorDraft,
    setMainTitleError,
    generateMainTitleSuggestions,
    handleNextStep,
  };
}
