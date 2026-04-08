import { useEffect, useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { TFunction } from "i18next";
import {
  improveWizardText,
  suggestSingleWizardTitle,
  suggestWizardTitles,
} from "@/lib/wizard/aiOptimize";
import {
  DEFAULT_DESIGN_CONFIG,
  INNER_STEPS,
  type ProjectRow,
  type WizardDesignConfig,
  type WizardTitleItem,
} from "@/lib/wizard/structureTypes";
import {
  saveWizardAvatarProblem,
  saveWizardBonusBumpItems,
  saveWizardDesignConfig,
  saveWizardMainTitle,
  saveWizardPackageCounts,
  saveWizardTopic,
} from "@/lib/wizard/structurePersistence";

export type WizardStructureNextResult =
  | { ok: true; finishedStructure?: boolean }
  | { ok: false };

type FlowArgs = {
  project: ProjectRow | null;
  setProject: Dispatch<SetStateAction<ProjectRow | null>>;
  t: TFunction;
  language: string;
};

function normalizeItems(items: WizardTitleItem[] | null | undefined, count: number, kind: "bonus" | "bump") {
  const base = Array.isArray(items) ? items : [];
  const normalized = Array.from({ length: count }).map((_, index) => {
    const current = base[index];
    if (current && typeof current.title === "string") {
      return { title: current.title, locked: Boolean(current.locked) };
    }
    return {
      title: `${kind === "bonus" ? "Bonus" : "Order bump"} ${index + 1}`,
      locked: false,
    };
  });
  return normalized;
}

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

  const [bonusItems, setBonusItems] = useState<WizardTitleItem[]>([]);
  const [bumpItems, setBumpItems] = useState<WizardTitleItem[]>([]);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [itemsMessage, setItemsMessage] = useState<string | null>(null);
  const [itemRegeneratingKey, setItemRegeneratingKey] = useState<string | null>(null);

  const [designConfig, setDesignConfig] = useState<WizardDesignConfig>(DEFAULT_DESIGN_CONFIG);
  const [designSaving, setDesignSaving] = useState(false);
  const [designMessage, setDesignMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!project) return;
    setTopicDraft(project.topic ?? "");
    setAvatarDraft(project.target_avatar ?? "");
    setProblemDraft(project.problem ?? "");
    setBonusCount(project.bonus_count ?? 0);
    setBumpCount(project.bump_count ?? 0);
    setAuthorDraft(project.author ?? "");
    setBonusItems(normalizeItems(project.bonus_items, project.bonus_count ?? 0, "bonus"));
    setBumpItems(normalizeItems(project.bump_items, project.bump_count ?? 0, "bump"));
    setDesignConfig(project.design_config ?? DEFAULT_DESIGN_CONFIG);

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
    setBonusItems((current) => normalizeItems(current, bonusCount, "bonus"));
  }, [bonusCount]);

  useEffect(() => {
    setBumpItems((current) => normalizeItems(current, bumpCount, "bump"));
  }, [bumpCount]);

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
    if (innerStepIndex === 4) return t("wizard.structure.step5.title");
    if (innerStepIndex === 5) return t("wizard.structure.step6.title");
    if (innerStepIndex === 6) return t("wizard.structure.step7.title");
    return t("wizard.structure.title");
  }, [innerStepIndex, t]);

  const stepSubtitle = useMemo(() => {
    if (innerStepIndex === 0) return t("wizard.structure.step1.subtitle");
    if (innerStepIndex === 1) return t("wizard.structure.step2.subtitle");
    if (innerStepIndex === 2) return t("wizard.structure.step3.subtitle");
    if (innerStepIndex === 3) return t("wizard.structure.step4.subtitle");
    if (innerStepIndex === 4) return t("wizard.structure.step5.subtitle");
    if (innerStepIndex === 5) return t("wizard.structure.step6.subtitle");
    if (innerStepIndex === 6) return t("wizard.structure.step7.subtitle");
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

  async function persistBonusBumpItems(): Promise<boolean> {
    if (!project?.id || itemsSaving) return false;
    setItemsSaving(true);
    setItemsMessage(null);
    const result = await saveWizardBonusBumpItems(project.id, bonusItems, bumpItems);
    setItemsSaving(false);
    if (!result.ok) {
      setItemsMessage(t("wizard.structure.step5.saveError"));
      return false;
    }
    setProject((current) =>
      current
        ? {
            ...current,
            bonus_items: bonusItems,
            bump_items: bumpItems,
          }
        : current,
    );
    setItemsMessage(t("wizard.structure.step5.saved"));
    return true;
  }

  async function regenerateItem(kind: "bonus" | "bump", index: number) {
    const items = kind === "bonus" ? bonusItems : bumpItems;
    if (!items[index] || items[index].locked) return;
    const key = `${kind}-${index}`;
    setItemRegeneratingKey(key);
    setItemsMessage(null);
    const result = await suggestSingleWizardTitle({
      field: kind === "bonus" ? "bonus_title" : "bump_title",
      topic: topicDraft,
      problem: problemDraft,
      avatar: avatarDraft,
      language,
    });
    setItemRegeneratingKey(null);
    if (!result.ok || !result.suggestion) {
      setItemsMessage(t("wizard.structure.step5.regenerateError"));
      return;
    }
    if (kind === "bonus") {
      setBonusItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, title: result.suggestion ?? item.title } : item,
        ),
      );
    } else {
      setBumpItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, title: result.suggestion ?? item.title } : item,
        ),
      );
    }
  }

  async function regenerateAllItems(kind: "bonus" | "bump") {
    const sourceItems = kind === "bonus" ? bonusItems : bumpItems;
    const unlockedIndexes = sourceItems
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.locked)
      .map(({ index }) => index);

    if (unlockedIndexes.length === 0) return;

    setItemRegeneratingKey(`${kind}-all`);
    setItemsMessage(null);

    let hadError = false;
    const updates: Record<number, string> = {};
    for (const index of unlockedIndexes) {
      const result = await suggestSingleWizardTitle({
        field: kind === "bonus" ? "bonus_title" : "bump_title",
        topic: topicDraft,
        problem: problemDraft,
        avatar: avatarDraft,
        language,
      });
      if (!result.ok || !result.suggestion) {
        hadError = true;
        continue;
      }
      updates[index] = result.suggestion;
    }

    if (kind === "bonus") {
      setBonusItems((current) =>
        current.map((item, index) => (updates[index] ? { ...item, title: updates[index] } : item)),
      );
    } else {
      setBumpItems((current) =>
        current.map((item, index) => (updates[index] ? { ...item, title: updates[index] } : item)),
      );
    }

    setItemRegeneratingKey(null);
    if (hadError) {
      setItemsMessage(t("wizard.structure.step5.regenerateError"));
    }
  }

  async function persistDesignConfig(): Promise<boolean> {
    if (!project?.id || designSaving) return false;
    setDesignSaving(true);
    setDesignMessage(null);
    const result = await saveWizardDesignConfig(project.id, designConfig);
    setDesignSaving(false);
    if (!result.ok) {
      setDesignMessage(t("wizard.structure.step7.saveError"));
      return false;
    }
    setProject((current) =>
      current
        ? {
            ...current,
            design_config: designConfig,
          }
        : current,
    );
    setDesignMessage(t("wizard.structure.step7.saved"));
    return true;
  }

  async function handleNextStep(): Promise<WizardStructureNextResult> {
    if (innerStepIndex === 0) {
      if (!topicDraft.trim()) {
        setTopicError(t("wizard.structure.topic.required"));
        return { ok: false };
      }
      setTopicError(null);
      if (!(await persistTopic())) return { ok: false };
    }

    if (innerStepIndex === 1) {
      if (!avatarDraft.trim()) {
        setAvatarError(t("wizard.structure.step2.avatarRequired"));
        setProblemError(null);
        return { ok: false };
      }
      if (!problemDraft.trim()) {
        setAvatarError(null);
        setProblemError(t("wizard.structure.step2.problemRequired"));
        return { ok: false };
      }
      setAvatarError(null);
      setProblemError(null);
      if (!(await persistAvatarProblem())) return { ok: false };
    }

    if (innerStepIndex === 2) {
      if (!(await persistPackageCounts())) return { ok: false };
    }

    if (innerStepIndex === 3) {
      if (!(await persistMainTitleAndAuthor())) return { ok: false };
    }

    if (innerStepIndex === 4 || innerStepIndex === 5) {
      if (!(await persistBonusBumpItems())) return { ok: false };
    }

    if (innerStepIndex === 6) {
      const saved = await persistDesignConfig();
      return saved ? { ok: true, finishedStructure: true } : { ok: false };
    }

    setInnerStepIndex((current) => Math.min(INNER_STEPS.length - 1, current + 1));
    return { ok: true };
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
    bonusItems,
    bumpItems,
    itemsSaving,
    itemsMessage,
    itemRegeneratingKey,
    setBonusItems,
    setBumpItems,
    regenerateItem,
    regenerateAllItems,
    designConfig,
    setDesignConfig,
    designSaving,
    designMessage,
    handleNextStep,
  };
}
