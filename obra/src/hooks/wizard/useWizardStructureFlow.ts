import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  normalizeDesignConfig,
  type ProjectRow,
  type WizardDesignConfig,
  type WizardTitleItem,
} from "@/lib/wizard/structureTypes";
import {
  computeInitialLayoutAssignments,
  normalizeBookTemplateId,
} from "@obra/layout-catalog";
import {
  INVOKE_ERROR_INSUFFICIENT_CREDITS,
  toastApiFailure,
  toastInsufficientCredits,
} from "@/lib/apiToast";
import {
  resetWizardAvatarProblemAndContent,
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

type HandleNextStepOptions = {
  forceResetAvatarProblem?: boolean;
};

const STRUCTURE_INSUFFICIENT_CREDITS_KEY = "wizard.structure.shared.insufficientCredits";

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
  const [topicAssistHint, setTopicAssistHint] = useState<string | null>(null);
  const [topicAssistError, setTopicAssistError] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [avatarDraft, setAvatarDraft] = useState("");
  const [problemDraft, setProblemDraft] = useState("");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [problemError, setProblemError] = useState<string | null>(null);
  const [avatarProblemSaving, setAvatarProblemSaving] = useState(false);
  const [avatarImproving, setAvatarImproving] = useState(false);
  const [problemImproving, setProblemImproving] = useState(false);
  const [avatarAssistHint, setAvatarAssistHint] = useState<string | null>(null);
  const [problemAssistHint, setProblemAssistHint] = useState<string | null>(null);
  const [avatarAssistError, setAvatarAssistError] = useState<string | null>(null);
  const [problemAssistError, setProblemAssistError] = useState<string | null>(null);
  const [avatarProblemFooterMessage, setAvatarProblemFooterMessage] = useState<string | null>(null);

  const [bonusCount, setBonusCount] = useState(0);
  const [bumpCount, setBumpCount] = useState(0);
  const [packageSaving, setPackageSaving] = useState(false);
  const [packageMessage, setPackageMessage] = useState<string | null>(null);

  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [customMainTitle, setCustomMainTitle] = useState("");
  /** Prevents repeat auto-fetch when revisiting step 4 in the same session without a title. */
  const titleSuggestionsAutoAttemptedRef = useRef(false);
  /** Prevents repeat auto-generation when revisiting step 5 (bonus titles) in the same session. */
  const bonusTitlesAutoAttemptedRef = useRef(false);
  /** Prevents repeat auto-generation when revisiting step 6 (bump titles) in the same session. */
  const bumpTitlesAutoAttemptedRef = useRef(false);
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
  const [bookTemplateId, setBookTemplateId] = useState<string>(() => normalizeBookTemplateId(null));
  const [designSaving, setDesignSaving] = useState(false);
  const [designMessage, setDesignMessage] = useState<string | null>(null);

  const avatarProblemChanged = useMemo(() => {
    if (!project) return false;
    const savedDesign = normalizeDesignConfig(project.design_config);
    return (
      (avatarDraft.trim() || "") !== (project.target_avatar?.trim() || "") ||
      (problemDraft.trim() || "") !== (project.problem?.trim() || "") ||
      designConfig.contentTone !== savedDesign.contentTone
    );
  }, [project, avatarDraft, problemDraft, designConfig.contentTone]);

  /** Main ebook title for AI suggest calls (step 5 bonus/bump). */
  const ebookTitleForAi = useMemo(() => {
    const selected = selectedTitleIndex !== null ? (titleSuggestions[selectedTitleIndex] ?? "") : "";
    return (customMainTitle.trim() || selected.trim() || project?.main_title || "").trim();
  }, [customMainTitle, selectedTitleIndex, titleSuggestions, project?.main_title]);

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
    setBookTemplateId(normalizeBookTemplateId(project.book_template_id));

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
    if (innerStepIndex !== 3) {
      titleSuggestionsAutoAttemptedRef.current = false;
      return;
    }
    if (titleSuggestionsLoading) return;
    const saved = (project?.main_title ?? "").trim();
    const custom = customMainTitle.trim();
    if (saved.length > 0 || custom.length > 0) return;
    if (titleSuggestionsAutoAttemptedRef.current) return;
    titleSuggestionsAutoAttemptedRef.current = true;
    void generateMainTitleSuggestions();
  }, [innerStepIndex, customMainTitle, project?.main_title, titleSuggestionsLoading]);

  useEffect(() => {
    if (innerStepIndex < 4) {
      bonusTitlesAutoAttemptedRef.current = false;
      bumpTitlesAutoAttemptedRef.current = false;
      return;
    }

    if (innerStepIndex === 4) {
      if (bonusTitlesAutoAttemptedRef.current || bonusItems.length === 0) return;
      const allUnfilled = bonusItems.every(
        (item, index) => !item.title.trim() || item.title.trim() === `Bonus ${index + 1}`,
      );
      if (!allUnfilled) return;
      bonusTitlesAutoAttemptedRef.current = true;
      void regenerateAllItems("bonus");
    }

    if (innerStepIndex === 5) {
      if (bumpTitlesAutoAttemptedRef.current || bumpItems.length === 0) return;
      const allUnfilled = bumpItems.every(
        (item, index) => !item.title.trim() || item.title.trim() === `Order bump ${index + 1}`,
      );
      if (!allUnfilled) return;
      bumpTitlesAutoAttemptedRef.current = true;
      void regenerateAllItems("bump");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setTopicAssistError(null);
    const result = await saveWizardTopic(project.id, topicDraft);
    setTopicSaving(false);
    if (!result.ok) {
      const key = "wizard.structure.topic.saveError";
      setTopicAssistError(t(key));
      toastApiFailure(t, key);
      return false;
    }
    setProject((current) => (current ? { ...current, topic: topicDraft } : current));
    return true;
  }

  async function handleImproveTopic() {
    if (!topicDraft.trim() || topicImproving || !project?.id) return;
    setTopicImproving(true);
    setTopicAssistHint(null);
    setTopicAssistError(null);
    const result = await improveWizardText({
      projectId: project.id,
      field: "topic",
      rawText: topicDraft,
      language,
    });
    setTopicImproving(false);
    if (!result.ok) {
      const key = "wizard.structure.topic.improveError";
      if (result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
        setTopicAssistError(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setTopicAssistError(t(key));
        toastApiFailure(t, key);
      }
      return;
    }
    if (result.optimized) {
      setTopicDraft(result.optimized);
      setTopicAssistHint(t("wizard.structure.topic.improved"));
      return;
    }
    setTopicAssistError(t("wizard.structure.topic.improvePending"));
  }

  async function persistAvatarProblem(forceReset: boolean): Promise<boolean> {
    if (!project?.id || avatarProblemSaving) return false;
    setAvatarProblemSaving(true);
    setAvatarProblemFooterMessage(null);
    const result =
      forceReset && project.structure_completed_at
        ? await resetWizardAvatarProblemAndContent(project.id, avatarDraft, problemDraft)
        : await saveWizardAvatarProblem(project.id, avatarDraft, problemDraft, designConfig);
    setAvatarProblemSaving(false);
    if (!result.ok) {
      if (forceReset) {
        const key = "wizard.structure.avatarProblem.resetError";
        setAvatarProblemFooterMessage(t(key));
        toastApiFailure(t, key);
      } else {
        const key = "wizard.structure.avatarProblem.saveError";
        setAvatarProblemFooterMessage(t(key));
        toastApiFailure(t, key);
      }
      return false;
    }
    setProject((current) =>
      current
        ? {
            ...current,
            target_avatar: avatarDraft || null,
            problem: problemDraft || null,
            design_config: designConfig,
          }
        : current,
    );
    return true;
  }

  async function improveAvatarText() {
    if (!avatarDraft.trim() || avatarImproving || !project?.id) return;
    setAvatarImproving(true);
    setAvatarAssistHint(null);
    setAvatarAssistError(null);
    const result = await improveWizardText({
      projectId: project.id,
      field: "target_avatar",
      rawText: avatarDraft,
      language,
      topic: topicDraft,
    });
    setAvatarImproving(false);
    if (!result.ok) {
      const key = "wizard.structure.avatarProblem.improveError";
      if (result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
        setAvatarAssistError(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setAvatarAssistError(t(key));
        toastApiFailure(t, key);
      }
      return;
    }
    if (result.optimized) {
      setAvatarDraft(result.optimized);
      setAvatarAssistHint(t("wizard.structure.avatarProblem.improved"));
      return;
    }
    setAvatarAssistError(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function improveProblemText() {
    if (!problemDraft.trim() || problemImproving || !project?.id) return;
    setProblemImproving(true);
    setProblemAssistHint(null);
    setProblemAssistError(null);
    const result = await improveWizardText({
      projectId: project.id,
      field: "problem",
      rawText: problemDraft,
      language,
      topic: topicDraft,
      avatar: avatarDraft,
    });
    setProblemImproving(false);
    if (!result.ok) {
      const key = "wizard.structure.avatarProblem.improveError";
      if (result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
        setProblemAssistError(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setProblemAssistError(t(key));
        toastApiFailure(t, key);
      }
      return;
    }
    if (result.optimized) {
      setProblemDraft(result.optimized);
      setProblemAssistHint(t("wizard.structure.avatarProblem.improved"));
      return;
    }
    setProblemAssistError(t("wizard.structure.avatarProblem.improvePending"));
  }

  async function persistPackageCounts(): Promise<boolean> {
    if (!project?.id || packageSaving) return false;
    setPackageSaving(true);
    setPackageMessage(null);
    const result = await saveWizardPackageCounts(project.id, bonusCount, bumpCount);
    setPackageSaving(false);
    if (!result.ok) {
      const key = "wizard.structure.package.saveError";
      setPackageMessage(t(key));
      toastApiFailure(t, key);
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
    if (!project?.id) {
      setTitleSuggestionsLoading(false);
      return;
    }
    const result = await suggestWizardTitles({
      projectId: project.id,
      topic: topicDraft,
      problem: problemDraft,
      avatar: avatarDraft,
      contentLocale: project?.content_locale ?? null,
      language,
      count: 5,
    });
    setTitleSuggestionsLoading(false);
    if (!result.ok) {
      const key = "wizard.structure.step4.suggestionsError";
      setTitleSuggestions([]);
      setSelectedTitleIndex(null);
      if (result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
        setMainTitleMessage(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setMainTitleMessage(t(key));
        toastApiFailure(t, key);
      }
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
    const key = "wizard.structure.step4.suggestionsError";
    setMainTitleMessage(t(key));
    toastApiFailure(t, key);
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
      const key = "wizard.structure.step4.saveError";
      setMainTitleMessage(t(key));
      toastApiFailure(t, key);
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

  const selectMainTitleFromSuggestion = useCallback(
    (index: number) => {
      const title = titleSuggestions[index];
      if (typeof title !== "string" || !title.trim()) return;
      setSelectedTitleIndex(index);
      setCustomMainTitle(title.trim());
      setMainTitleError(null);
    },
    [titleSuggestions],
  );

  async function persistBonusBumpItems(): Promise<boolean> {
    if (!project?.id || itemsSaving) return false;
    setItemsSaving(true);
    setItemsMessage(null);
    const result = await saveWizardBonusBumpItems(project.id, bonusItems, bumpItems);
    setItemsSaving(false);
    if (!result.ok) {
      const key = "wizard.structure.step5.saveError";
      setItemsMessage(t(key));
      toastApiFailure(t, key);
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
    if (!items[index] || items[index].locked || !project?.id) return;
    const key = `${kind}-${index}`;
    setItemRegeneratingKey(key);
    setItemsMessage(null);
    // All other titles (locked or not) are passed as locked_titles so the model
    // strictly avoids them. previous_titles is not needed here since we want hard avoidance.
    const lockedTitles = items
      .filter((_, i) => i !== index)
      .map((x) => x.title.trim())
      .filter(Boolean);
    const result = await suggestSingleWizardTitle({
      projectId: project.id,
      field: kind === "bonus" ? "bonus_title" : "bump_title",
      topic: topicDraft,
      problem: problemDraft,
      avatar: avatarDraft,
      language,
      contentLocale: project.content_locale ?? null,
      ebookTitle: ebookTitleForAi,
      lockedTitles,
    });
    setItemRegeneratingKey(null);
    if (!result.ok || !result.suggestion) {
      const key = "wizard.structure.step5.regenerateError";
      if (result.ok === false && result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
        setItemsMessage(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setItemsMessage(t(key));
        toastApiFailure(t, key);
      }
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

    if (unlockedIndexes.length === 0 || !project?.id) return;

    setItemRegeneratingKey(`${kind}-all`);
    setItemsMessage(null);

    let hadError = false;
    let creditBlocked = false;
    const updates: Record<number, string> = {};
    // Titles already set (locked or not) that are not being regenerated in this batch.
    const baseTitles = sourceItems
      .filter((x) => x.locked)
      .map((x) => x.title.trim())
      .filter(Boolean);
    for (const index of unlockedIndexes) {
      // Pass locked source titles + titles already generated in this batch so the model
      // cannot repeat any of them.
      const lockedTitles = [...baseTitles, ...Object.values(updates)];
      const result = await suggestSingleWizardTitle({
        projectId: project.id,
        field: kind === "bonus" ? "bonus_title" : "bump_title",
        topic: topicDraft,
        problem: problemDraft,
        avatar: avatarDraft,
        language,
        contentLocale: project.content_locale ?? null,
        ebookTitle: ebookTitleForAi,
        lockedTitles,
      });
      if (!result.ok || !result.suggestion) {
        hadError = true;
        if (result.ok === false && result.code === INVOKE_ERROR_INSUFFICIENT_CREDITS) {
          creditBlocked = true;
        }
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
      const key = "wizard.structure.step5.regenerateError";
      if (creditBlocked) {
        setItemsMessage(t(STRUCTURE_INSUFFICIENT_CREDITS_KEY));
        toastInsufficientCredits(t, STRUCTURE_INSUFFICIENT_CREDITS_KEY);
      } else {
        setItemsMessage(t(key));
        toastApiFailure(t, key);
      }
    }
  }

  async function persistDesignConfig(): Promise<boolean> {
    if (!project?.id || designSaving) return false;
    setDesignSaving(true);
    setDesignMessage(null);
    const savedDesign = normalizeDesignConfig(project.design_config);
    const pageGeomChanged =
      savedDesign.page.size !== designConfig.page.size ||
      savedDesign.page.orientation !== designConfig.page.orientation;
    const savedTemplate = normalizeBookTemplateId(project.book_template_id);
    const nextTemplate = normalizeBookTemplateId(bookTemplateId);
    const templateChanged = savedTemplate !== nextTemplate;
    const existingAssignments = project.layout_page_assignments ?? {};
    const shouldRecomputeLayouts =
      pageGeomChanged || templateChanged || Object.keys(existingAssignments).length === 0;
    const layoutPageAssignments = shouldRecomputeLayouts
      ? computeInitialLayoutAssignments({
          projectId: project.id,
          bookTemplateId: nextTemplate,
          geometry: designConfig.page,
        })
      : existingAssignments;
    const result = await saveWizardDesignConfig(project.id, {
      designConfig,
      bookTemplateId: nextTemplate,
      layoutPageAssignments,
    });
    setDesignSaving(false);
    if (!result.ok) {
      const key = "wizard.structure.step7.saveError";
      setDesignMessage(t(key));
      toastApiFailure(t, key);
      return false;
    }
    setProject((current) => {
      if (!current) return current;
      if (result.persisted === "full") {
        return {
          ...current,
          design_config: designConfig,
          book_template_id: nextTemplate,
          layout_page_assignments: layoutPageAssignments,
        };
      }
      if (result.persisted === "design_and_template") {
        return {
          ...current,
          design_config: designConfig,
          book_template_id: nextTemplate,
        };
      }
      return {
        ...current,
        design_config: designConfig,
      };
    });
    setDesignMessage(
      result.persisted === "full" ? t("wizard.structure.step7.saved") : t("wizard.structure.step7.savedPartial"),
    );
    return true;
  }

  async function handleNextStep(options?: HandleNextStepOptions): Promise<WizardStructureNextResult> {
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
      if (!(await persistAvatarProblem(Boolean(options?.forceResetAvatarProblem)))) return { ok: false };
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

  const clearTopicAssistFeedback = useCallback(() => {
    setTopicAssistHint(null);
    setTopicAssistError(null);
  }, []);

  const clearAvatarAssistFeedback = useCallback(() => {
    setAvatarAssistHint(null);
    setAvatarAssistError(null);
  }, []);

  const clearProblemAssistFeedback = useCallback(() => {
    setProblemAssistHint(null);
    setProblemAssistError(null);
  }, []);

  return {
    innerStepIndex,
    setInnerStepIndex,
    stepTitle,
    stepSubtitle,
    topicDraft,
    topicSaving,
    topicImproving,
    topicAssistHint,
    topicAssistError,
    topicError,
    setTopicDraft,
    setTopicError,
    clearTopicAssistFeedback,
    handleImproveTopic,
    avatarDraft,
    problemDraft,
    avatarError,
    problemError,
    avatarProblemSaving,
    avatarImproving,
    problemImproving,
    avatarAssistHint,
    problemAssistHint,
    avatarAssistError,
    problemAssistError,
    avatarProblemFooterMessage,
    clearAvatarAssistFeedback,
    clearProblemAssistFeedback,
    avatarProblemChanged,
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
    selectMainTitleFromSuggestion,
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
    bookTemplateId,
    setBookTemplateId,
    designSaving,
    designMessage,
    handleNextStep,
  };
}
