import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalSubtitle, ModalTitle } from "@/components/ui/Modal";
import { ObraToast } from "@/components/obra/ObraToast";
import {
  ContentIndexMilestone,
  type ContentNavItem,
} from "@/components/wizard/content/ContentIndexMilestone";
import { ContentChapterMilestone } from "@/components/wizard/content/ContentChapterMilestone";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import {
  buildContentPackageNavTargets,
  contentNavTargetToKey,
  parseContentNavKey,
} from "@/lib/wizard/contentNav";
import {
  approveChapterBody,
  clearChapterBody,
  confirmMainIndex,
  confirmOrderBumpIndex,
  ensureContentWorkspace,
  fetchPackageEbookIdMap,
  invokeGenerateChapterContent,
  invokeGenerateIndex,
  loadEbookChapters,
  loadEbookChaptersDraft,
  reopenMainIndex,
  replaceEbookDraftChapters,
  trySyncMainEbookTocBeforeFreeze,
  updateChapterDraftContent,
  upsertEbookDraftChaptersFromRows,
  validateMainTocForConfirm,
  type ChapterDraftRow,
} from "@/lib/wizard/contentIndexApi";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";
import { chapterHtmlEquals, isChapterHtmlEffectivelyEmpty } from "@/lib/sanitizeChapterHtml";

const BANNER_STORAGE_PREFIX = "obra.content.banner.dismissed.";

function findFirstTitleChangeWithBody(
  prev: TocChapterRow[],
  next: TocChapterRow[],
  presence: Record<string, boolean>,
): { mergedRows: TocChapterRow[] } | null {
  const prevById = new Map(prev.map((r) => [r.id, r.title]));
  for (const row of next) {
    const prevTitle = prevById.get(row.id);
    if (prevTitle === undefined) continue;
    if (prevTitle === row.title) continue;
    if (presence[row.id]) {
      return { mergedRows: next };
    }
  }
  return null;
}

function chapterIdsWithRenamedBody(
  base: TocChapterRow[],
  pending: TocChapterRow[],
  presence: Record<string, boolean>,
): string[] {
  const baseById = new Map(base.map((r) => [r.id, r.title]));
  const ids: string[] = [];
  for (const row of pending) {
    const prevTitle = baseById.get(row.id);
    if (prevTitle === undefined) continue;
    if (prevTitle !== row.title && presence[row.id]) ids.push(row.id);
  }
  return ids;
}

function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 11)}`;
}

function defaultMainRows(): TocChapterRow[] {
  return [
    { id: newRowId(), title: "" },
    { id: newRowId(), title: "" },
  ];
}

function defaultSingleRows(): TocChapterRow[] {
  return [{ id: newRowId(), title: "" }];
}

async function loadOrSeedPackageToc(
  ebookId: string,
  defaultFactory: () => TocChapterRow[],
): Promise<TocChapterRow[]> {
  const loaded = await loadEbookChapters(ebookId);
  if (!loaded.ok) return defaultFactory();
  if (loaded.rows.length > 0) return loaded.rows;
  const seed = defaultFactory();
  const persisted = await upsertEbookDraftChaptersFromRows(ebookId, seed);
  if (!persisted.ok) return seed;
  return persisted.rows;
}

export function WizardContentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ projectId: string }>();

  const { project, loading, error } = useWizardStructureProject(
    params.projectId,
    t("wizard.structure.loadError"),
  );

  const [selectedKey, setSelectedKey] = useState("main");
  const [bonusBumpToc, setBonusBumpToc] = useState<Record<string, TocChapterRow[]>>({});
  const [mainTocRows, setMainTocRows] = useState<TocChapterRow[]>([]);
  const [mainEbookId, setMainEbookId] = useState<string | null>(null);
  const [packageEbookIds, setPackageEbookIds] = useState<Record<string, string>>({});
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [mainIndexFrozenAt, setMainIndexFrozenAt] = useState<string | null>(null);
  /** Per `bump:n` nav key: `ebooks.index_frozen_at` for that order bump. */
  const [bumpIndexFrozenAt, setBumpIndexFrozenAt] = useState<Record<string, string | null>>({});
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [actionAnnouncement, setActionAnnouncement] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);
  /** False until DB had chapters or user chose manual / succeeded at generate. */
  const [tocEntryResolved, setTocEntryResolved] = useState(false);
  /** Per `bump:n` key: false until DB had chapters or user chose manual / succeeded at generate. */
  const [bumpTocEntryResolved, setBumpTocEntryResolved] = useState<Record<string, boolean>>({});
  const [insufficientCreditsToastOpen, setInsufficientCreditsToastOpen] = useState(false);
  const [insufficientCreditsSource, setInsufficientCreditsSource] = useState<"index" | "chapter">("index");
  const [mainChapterRows, setMainChapterRows] = useState<ChapterDraftRow[]>([]);
  const [mainChapterIdx, setMainChapterIdx] = useState(0);
  const [mainChapterBodyDraft, setMainChapterBodyDraft] = useState("");
  const [chapterSaveLoading, setChapterSaveLoading] = useState(false);
  const [chapterGenerateLoading, setChapterGenerateLoading] = useState(false);
  const [chapterApproveLoading, setChapterApproveLoading] = useState(false);
  const [mainChapterRichTextKey, setMainChapterRichTextKey] = useState(0);
  const [chapterBodyPresence, setChapterBodyPresence] = useState<Record<string, boolean>>({});
  const [titleChangeModal, setTitleChangeModal] = useState<{
    pendingRows: TocChapterRow[];
    baseRows: TocChapterRow[];
  } | null>(null);
  const [reopenIndexLoading, setReopenIndexLoading] = useState(false);

  const bonusBumpTocRef = useRef(bonusBumpToc);
  bonusBumpTocRef.current = bonusBumpToc;
  const packageEbookIdsRef = useRef(packageEbookIds);
  packageEbookIdsRef.current = packageEbookIds;
  const persistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const prevSelectedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.projectId) return;
    try {
      setBannerDismissed(localStorage.getItem(`${BANNER_STORAGE_PREFIX}${params.projectId}`) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    if (!params.projectId || loading) return;
    if (!project) return;
    if (project.structure_completed_at) return;
    navigate(`/app/projects/${params.projectId}/wizard`, { replace: true });
  }, [loading, project, params.projectId, navigate]);

  useEffect(() => {
    if (!project?.id || loading) return;
    if (!project.structure_completed_at) return;
    let cancelled = false;
    setWorkspaceError(null);
    setWorkspaceReady(false);
    setTocEntryResolved(false);
    setBumpTocEntryResolved({});
    setBumpIndexFrozenAt({});
    setPackageEbookIds({});
    setBonusBumpToc({});

    void (async () => {
      const ensured = await ensureContentWorkspace(project.id);
      if (cancelled) return;
      if (!ensured.ok) {
        const key =
          ensured.code === "structure_not_complete"
            ? "wizard.content.workspace.ensureErrorStructure"
            : ensured.code === "forbidden"
              ? "wizard.content.workspace.ensureErrorForbidden"
              : ensured.code === "db_error"
                ? "wizard.content.workspace.ensureErrorDb"
                : "wizard.content.workspace.ensureError";
        setWorkspaceError(t(key));
        return;
      }
      setMainEbookId(ensured.data.main_ebook_id);
      setCurrentPhase(ensured.data.current_phase);
      setMainIndexFrozenAt(ensured.data.main_index_frozen_at);

      const chapters = await loadEbookChapters(ensured.data.main_ebook_id);
      if (cancelled) return;
      if (chapters.ok && chapters.rows.length > 0) {
        setMainTocRows(chapters.rows);
        setTocEntryResolved(true);
      } else {
        setMainTocRows([]);
        setTocEntryResolved(false);
      }

      const pkgMap = await fetchPackageEbookIdMap(project.id);
      if (cancelled) return;
      if (!pkgMap.ok) {
        setWorkspaceError(t("wizard.content.workspace.ensureErrorDb"));
        return;
      }
      setPackageEbookIds(pkgMap.map);
      setBumpIndexFrozenAt(pkgMap.bumpIndexFrozenAt);

      const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
      const tocUpdates: Record<string, TocChapterRow[]> = {};
      const bumpResolved: Record<string, boolean> = {};
      for (const target of targets) {
        if (target.kind === "main") continue;
        const key = contentNavTargetToKey(target);
        const ebookId = pkgMap.map[key];
        if (!ebookId) continue;
        if (target.kind === "bump") {
          const bumpFrozen = Boolean(pkgMap.bumpIndexFrozenAt[key]);
          const loaded = await loadEbookChapters(ebookId);
          if (cancelled) return;
          if (!loaded.ok) {
            tocUpdates[key] = [];
            bumpResolved[key] = bumpFrozen;
          } else if (loaded.rows.length > 0 || bumpFrozen) {
            tocUpdates[key] = loaded.rows;
            bumpResolved[key] = true;
          } else {
            tocUpdates[key] = [];
            bumpResolved[key] = false;
          }
        } else {
          tocUpdates[key] = await loadOrSeedPackageToc(ebookId, defaultSingleRows);
          if (cancelled) return;
        }
      }
      setBumpTocEntryResolved(bumpResolved);
      setBonusBumpToc(tocUpdates);

      setWorkspaceReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [
    project?.id,
    loading,
    project?.structure_completed_at,
    project?.bonus_count,
    project?.bump_count,
    t,
  ]);

  useEffect(() => {
    if (!mainEbookId || currentPhase !== "main_chapter") return;
    let cancelled = false;
    void loadEbookChaptersDraft(mainEbookId).then((r) => {
      if (cancelled || !r.ok) return;
      setMainChapterRows(r.rows);
      setMainChapterIdx(0);
      setMainChapterBodyDraft(r.rows[0]?.content ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [mainEbookId, currentPhase]);

  const refreshChapterBodyPresence = useCallback(async () => {
    if (!mainEbookId) return;
    const r = await loadEbookChaptersDraft(mainEbookId);
    if (!r.ok) return;
    const next: Record<string, boolean> = {};
    for (const ch of r.rows) {
      next[ch.id] = !isChapterHtmlEffectivelyEmpty(ch.content ?? "");
    }
    setChapterBodyPresence(next);
  }, [mainEbookId]);

  useEffect(() => {
    if (!mainEbookId) return;
    void refreshChapterBodyPresence();
  }, [mainEbookId, refreshChapterBodyPresence]);

  useEffect(() => {
    const prev = prevSelectedKeyRef.current;
    prevSelectedKeyRef.current = selectedKey;
    if (prev === null) return;
    if (prev === selectedKey) return;
    if (prev === "main") return;

    const tid = persistTimersRef.current[prev];
    if (tid) {
      clearTimeout(tid);
      delete persistTimersRef.current[prev];
    }
    const ebookId = packageEbookIdsRef.current[prev];
    const rows = bonusBumpTocRef.current[prev];
    if (ebookId && rows) {
      void upsertEbookDraftChaptersFromRows(ebookId, rows);
    }
  }, [selectedKey]);

  useEffect(() => {
    return () => {
      for (const tid of Object.values(persistTimersRef.current)) {
        clearTimeout(tid);
      }
      persistTimersRef.current = {};
      const toc = bonusBumpTocRef.current;
      const ids = packageEbookIdsRef.current;
      for (const [key, rows] of Object.entries(toc)) {
        const ebookId = ids[key];
        if (ebookId && rows?.length) {
          void upsertEbookDraftChaptersFromRows(ebookId, rows);
        }
      }
    };
  }, []);

  const needsUploadAlignment =
    project?.content_source === "upload" && currentPhase === "upload_alignment";

  const indexFrozen = Boolean(mainIndexFrozenAt);

  const navItems: ContentNavItem[] = useMemo(() => {
    if (!project) return [];
    const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
    return targets.map((target) => {
      const key = contentNavTargetToKey(target);
      let navTitle: string;
      if (target.kind === "main") {
        navTitle = project.main_title?.trim() || t("wizard.content.index.mainTitleFallback");
      } else if (target.kind === "bonus") {
        navTitle =
          project.bonus_items[target.index]?.title?.trim() ||
          t("wizard.content.nav.bonusFallback", { n: target.index + 1 });
      } else {
        navTitle =
          project.bump_items[target.index]?.title?.trim() ||
          t("wizard.content.nav.bumpFallback", { n: target.index + 1 });
      }
      const tocConfirmed =
        (target.kind === "main" && indexFrozen) ||
        (target.kind === "bump" && Boolean(bumpIndexFrozenAt[key]));
      return { key, navTitle, target, tocConfirmed };
    });
  }, [project, t, indexFrozen, bumpIndexFrozenAt]);

  const selectedTarget = parseContentNavKey(selectedKey) ?? { kind: "main" as const };

  const showMainChapterLoop =
    Boolean(project) &&
    !loading &&
    workspaceReady &&
    !needsUploadAlignment &&
    selectedTarget.kind === "main" &&
    currentPhase === "main_chapter" &&
    project?.content_source === "ai";

  const handleSelectPackageKey = useCallback(
    async (key: string) => {
      if (key === selectedKey) return;
      const leavingMainChapterEditor =
        selectedTarget.kind === "main" &&
        currentPhase === "main_chapter" &&
        project?.content_source === "ai" &&
        !needsUploadAlignment;

      if (leavingMainChapterEditor) {
        const prev = mainChapterRows[mainChapterIdx];
        if (prev && !chapterHtmlEquals(mainChapterBodyDraft, prev.content ?? "")) {
          setChapterSaveLoading(true);
          const res = await updateChapterDraftContent(prev.id, mainChapterBodyDraft);
          setChapterSaveLoading(false);
          if (!res.ok) {
            setActionAnnouncement(t("wizard.content.chapters.errorSave"));
            return;
          }
          setMainChapterRows((rows) =>
            rows.map((r) => (r.id === prev.id ? { ...r, content: mainChapterBodyDraft, approved_at: null } : r)),
          );
        }
      }
      setSelectedKey(key);
    },
    [
      selectedKey,
      selectedTarget.kind,
      currentPhase,
      project?.content_source,
      needsUploadAlignment,
      mainChapterRows,
      mainChapterIdx,
      mainChapterBodyDraft,
      t,
    ],
  );

  const panelCopy = useMemo(() => {
    if (!project) {
      return { title: "", subtitle: "" };
    }
    if (needsUploadAlignment) {
      return {
        title: t("wizard.content.uploadGate.title"),
        subtitle: t("wizard.content.uploadGate.subtitle"),
      };
    }
    if (selectedTarget.kind === "main") {
      const mainTitle = project.main_title?.trim() || t("wizard.content.index.mainTitleFallback");
      return {
        title: t("wizard.content.index.panelTitleMain", { title: mainTitle }),
        subtitle: indexFrozen
          ? t("wizard.content.index.panelSubtitleMainFrozen")
          : t("wizard.content.index.panelSubtitleMain"),
      };
    }
    if (selectedTarget.kind === "bonus") {
      const title =
        project.bonus_items[selectedTarget.index]?.title?.trim() ||
        t("wizard.content.nav.bonusFallback", { n: selectedTarget.index + 1 });
      return {
        title: t("wizard.content.index.panelTitleBonus", { title }),
        subtitle: t("wizard.content.index.panelSubtitleBonus"),
      };
    }
    const title =
      project.bump_items[selectedTarget.index]?.title?.trim() ||
      t("wizard.content.nav.bumpFallback", { n: selectedTarget.index + 1 });
    const bumpFrozen = Boolean(bumpIndexFrozenAt[selectedKey]);
    return {
      title: t("wizard.content.index.panelTitleMain", { title }),
      subtitle: bumpFrozen
        ? t("wizard.content.index.panelSubtitleBumpChaptersFrozen")
        : t("wizard.content.index.panelSubtitleBumpChapters"),
    };
  }, [project, selectedTarget, selectedKey, t, needsUploadAlignment, indexFrozen, bumpIndexFrozenAt]);

  const chapterPanelCopy = useMemo(() => {
    if (!project) {
      return { title: "", subtitle: "" };
    }
    const mainTitle = project.main_title?.trim() || t("wizard.content.index.mainTitleFallback");
    return {
      title: t("wizard.content.chapters.panelTitle", { title: mainTitle }),
      subtitle: t("wizard.content.chapters.panelSubtitle"),
    };
  }, [project, t]);

  const currentTocRows: TocChapterRow[] =
    selectedTarget.kind === "main"
      ? mainTocRows
      : bonusBumpToc[selectedKey] ??
          (selectedTarget.kind === "bump" ? defaultMainRows() : defaultSingleRows());

  const setCurrentToc = useCallback(
    (rows: TocChapterRow[]) => {
      if (selectedTarget.kind === "main") {
        const blocked = findFirstTitleChangeWithBody(mainTocRows, rows, chapterBodyPresence);
        if (blocked) {
          setTitleChangeModal({ pendingRows: blocked.mergedRows, baseRows: mainTocRows });
          return;
        }
        setMainTocRows(rows);
        return;
      }
      if (selectedTarget.kind === "bump" && bumpIndexFrozenAt[selectedKey]) {
        return;
      }
      const ebookId = packageEbookIds[selectedKey];
      setBonusBumpToc((prev) => ({ ...prev, [selectedKey]: rows }));
      if (!ebookId) return;

      const key = selectedKey;
      const existingTimer = persistTimersRef.current[key];
      if (existingTimer) clearTimeout(existingTimer);
      persistTimersRef.current[key] = setTimeout(() => {
        void upsertEbookDraftChaptersFromRows(ebookId, rows).then((res) => {
          if (res.ok) {
            setBonusBumpToc((p) => ({ ...p, [key]: res.rows }));
          }
        });
        delete persistTimersRef.current[key];
      }, 550);
    },
    [selectedKey, selectedTarget.kind, packageEbookIds, bumpIndexFrozenAt, mainTocRows, chapterBodyPresence],
  );

  const navItemDisabled = useCallback(
    (key: string) => needsUploadAlignment && key !== "main",
    [needsUploadAlignment],
  );

  const handleRegenerateMainOutline = useCallback(async () => {
    if (selectedTarget.kind !== "main" || !project?.id || !mainEbookId) return;
    if (needsUploadAlignment || indexFrozen) return;
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("index");
    const clientRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId);
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
      } else if (code === "wrong_content_source") {
        setActionAnnouncement(t("wizard.content.index.errorWrongSource"));
      } else {
        setActionAnnouncement(t("wizard.content.index.errorGenerateGeneric"));
      }
      return;
    }
    const saved = await replaceEbookDraftChapters(mainEbookId, result.titles);
    if (!saved.ok) {
      setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
      return;
    }
    const loaded = await loadEbookChapters(mainEbookId);
    if (loaded.ok) setMainTocRows(loaded.rows);
    setTocEntryResolved(true);
    setActionAnnouncement(t("wizard.content.index.regenerateSuccess"));
  }, [selectedTarget.kind, project?.id, mainEbookId, needsUploadAlignment, indexFrozen, t]);

  const handleRegenerateBumpOutline = useCallback(async () => {
    if (selectedTarget.kind !== "bump" || !project?.id) return;
    const ebookId = packageEbookIds[selectedKey];
    if (!ebookId) return;
    if (needsUploadAlignment || bumpIndexFrozenAt[selectedKey]) return;
    const pending = persistTimersRef.current[selectedKey];
    if (pending) {
      clearTimeout(pending);
      delete persistTimersRef.current[selectedKey];
    }
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("index");
    const clientRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId, { targetEbookId: ebookId });
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
      } else if (code === "wrong_content_source") {
        setActionAnnouncement(t("wizard.content.index.errorWrongSource"));
      } else {
        setActionAnnouncement(t("wizard.content.index.errorGenerateGeneric"));
      }
      return;
    }
    const saved = await replaceEbookDraftChapters(ebookId, result.titles);
    if (!saved.ok) {
      setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
      return;
    }
    const loaded = await loadEbookChapters(ebookId);
    if (loaded.ok) {
      setBonusBumpToc((p) => ({ ...p, [selectedKey]: loaded.rows }));
      setBumpTocEntryResolved((p) => ({ ...p, [selectedKey]: true }));
    }
    setActionAnnouncement(t("wizard.content.index.regenerateSuccess"));
  }, [
    selectedTarget.kind,
    project?.id,
    packageEbookIds,
    selectedKey,
    needsUploadAlignment,
    bumpIndexFrozenAt,
    t,
  ]);

  const handleRegenerateBonusBumpPlaceholder = useCallback(async () => {
    if (selectedTarget.kind === "main" || selectedTarget.kind === "bump") return;
    if (selectedTarget.kind !== "bonus") return;
    const ebookId = packageEbookIds[selectedKey];
    const pending = persistTimersRef.current[selectedKey];
    if (pending) {
      clearTimeout(pending);
      delete persistTimersRef.current[selectedKey];
    }
    const title =
      project?.bonus_items[selectedTarget.index]?.title?.trim() ||
      t("wizard.content.nav.bonusFallback", { n: selectedTarget.index + 1 });
    const rows = [{ id: newRowId(), title: t("wizard.content.index.singleSectionTitle", { title }) }];
    setBonusBumpToc((prev) => ({ ...prev, [selectedKey]: rows }));
    if (!ebookId) return;
    const persisted = await upsertEbookDraftChaptersFromRows(ebookId, rows);
    if (persisted.ok) {
      setBonusBumpToc((p) => ({ ...p, [selectedKey]: persisted.rows }));
    }
  }, [selectedTarget, project, packageEbookIds, selectedKey, t]);

  const handleConfirmPackageIndex = useCallback(async () => {
    if (!project?.id) return;

    if (selectedTarget.kind === "main") {
      if (!mainEbookId) return;
      const validation = validateMainTocForConfirm(mainTocRows);
      if (validation !== "ok") {
        if (validation === "empty_title") setActionAnnouncement(t("wizard.content.index.errorEmptyTitle"));
        else if (validation === "too_many") setActionAnnouncement(t("wizard.content.index.errorTooManyChapters"));
        else setActionAnnouncement(t("wizard.content.index.errorTooFewChapters"));
        return;
      }
      setConfirmLoading(true);
      const sync = await trySyncMainEbookTocBeforeFreeze(mainEbookId, mainTocRows);
      if (!sync.ok) {
        setConfirmLoading(false);
        setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
        return;
      }
      if (sync.mode === "full_replace") {
        const persist = await upsertEbookDraftChaptersFromRows(mainEbookId, mainTocRows);
        if (!persist.ok) {
          setConfirmLoading(false);
          setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
          return;
        }
        setMainTocRows(persist.rows);
      } else {
        const reloaded = await loadEbookChapters(mainEbookId);
        if (reloaded.ok) setMainTocRows(reloaded.rows);
      }
      const confirmed = await confirmMainIndex(project.id);
      setConfirmLoading(false);
      if (!confirmed.ok) {
        setActionAnnouncement(t("wizard.content.index.errorConfirmPhase"));
        return;
      }
      setMainIndexFrozenAt(new Date().toISOString());
      setCurrentPhase("main_chapter");
      void refreshChapterBodyPresence();
      setActionAnnouncement(t("wizard.content.index.confirmSuccess"));
      return;
    }

    if (selectedTarget.kind === "bump") {
      const ebookId = packageEbookIds[selectedKey];
      if (!ebookId) return;
      const rows = bonusBumpToc[selectedKey] ?? [];
      const validation = validateMainTocForConfirm(rows);
      if (validation !== "ok") {
        if (validation === "empty_title") setActionAnnouncement(t("wizard.content.index.errorEmptyTitle"));
        else if (validation === "too_many") setActionAnnouncement(t("wizard.content.index.errorTooManyChapters"));
        else setActionAnnouncement(t("wizard.content.index.errorTooFewChapters"));
        return;
      }
      setConfirmLoading(true);
      const persist = await upsertEbookDraftChaptersFromRows(ebookId, rows);
      if (!persist.ok) {
        setConfirmLoading(false);
        setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
        return;
      }
      setBonusBumpToc((p) => ({ ...p, [selectedKey]: persist.rows }));
      const confirmed = await confirmOrderBumpIndex(ebookId);
      setConfirmLoading(false);
      if (!confirmed.ok) {
        setActionAnnouncement(t("wizard.content.index.errorConfirmPhase"));
        return;
      }
      setBumpIndexFrozenAt((p) => ({ ...p, [selectedKey]: confirmed.frozen_at }));
      setActionAnnouncement(t("wizard.content.index.confirmSuccess"));
    }
  }, [
    project?.id,
    selectedTarget.kind,
    mainEbookId,
    mainTocRows,
    bonusBumpToc,
    selectedKey,
    packageEbookIds,
    t,
    refreshChapterBodyPresence,
  ]);

  const handleReopenMainIndex = useCallback(async () => {
    if (!project?.id || !mainEbookId) return;
    setActionAnnouncement(null);
    setReopenIndexLoading(true);
    const opened = await reopenMainIndex(project.id);
    if (!opened.ok) {
      setReopenIndexLoading(false);
      setActionAnnouncement(t("wizard.content.index.errorReopenIndex"));
      return;
    }
    const loaded = await loadEbookChapters(mainEbookId);
    if (loaded.ok) setMainTocRows(loaded.rows);
    setMainIndexFrozenAt(null);
    setCurrentPhase("main_index");
    setMainChapterIdx(0);
    setMainChapterBodyDraft("");
    setMainChapterRichTextKey((k) => k + 1);
    await refreshChapterBodyPresence();
    setReopenIndexLoading(false);
    setActionAnnouncement(t("wizard.content.index.reopenIndexSuccess"));
  }, [project?.id, mainEbookId, t, refreshChapterBodyPresence]);

  const handleConfirmTitleChangeResetBody = useCallback(async () => {
    if (!titleChangeModal) return;
    const { pendingRows, baseRows } = titleChangeModal;
    const toClear = chapterIdsWithRenamedBody(baseRows, pendingRows, chapterBodyPresence);
    setTitleChangeModal(null);
    for (const id of toClear) {
      const cleared = await clearChapterBody(id);
      if (!cleared.ok) {
        setActionAnnouncement(t("wizard.content.chapters.errorClearBody"));
        return;
      }
    }
    setMainTocRows(pendingRows);
    void refreshChapterBodyPresence();
  }, [titleChangeModal, chapterBodyPresence, refreshChapterBodyPresence, t]);

  const handleCancelTitleChangeModal = useCallback(() => {
    setTitleChangeModal(null);
  }, []);

  const handleSelectMainChapterIndex = useCallback(
    async (nextIdx: number) => {
      if (nextIdx === mainChapterIdx || !mainEbookId) return;
      const prev = mainChapterRows[mainChapterIdx];
      let rows = mainChapterRows;

      if (prev && !chapterHtmlEquals(mainChapterBodyDraft, prev.content ?? "")) {
        setChapterSaveLoading(true);
        const res = await updateChapterDraftContent(prev.id, mainChapterBodyDraft);
        setChapterSaveLoading(false);
        if (!res.ok) {
          setActionAnnouncement(t("wizard.content.chapters.errorSave"));
          return;
        }
        rows = rows.map((r) =>
          r.id === prev.id ? { ...r, content: mainChapterBodyDraft, approved_at: null } : r,
        );
        setMainChapterRows(rows);
      }

      setMainChapterIdx(nextIdx);
      setMainChapterBodyDraft(rows[nextIdx]?.content ?? "");
    },
    [mainChapterIdx, mainChapterRows, mainChapterBodyDraft, mainEbookId, t],
  );

  const handleSaveMainChapterBody = useCallback(async () => {
    const current = mainChapterRows[mainChapterIdx];
    if (!current) return;
    setActionAnnouncement(null);
    setChapterSaveLoading(true);
    const res = await updateChapterDraftContent(current.id, mainChapterBodyDraft);
    setChapterSaveLoading(false);
    if (!res.ok) {
      setActionAnnouncement(t("wizard.content.chapters.errorSave"));
      return;
    }
    setMainChapterRows((rows) =>
      rows.map((r) => (r.id === current.id ? { ...r, content: mainChapterBodyDraft, approved_at: null } : r)),
    );
    void refreshChapterBodyPresence();
    setActionAnnouncement(t("wizard.content.chapters.saveSuccess"));
  }, [mainChapterRows, mainChapterIdx, mainChapterBodyDraft, t, refreshChapterBodyPresence]);

  const handleGenerateMainChapter = useCallback(async () => {
    const current = mainChapterRows[mainChapterIdx];
    if (!current || !project?.id) return;
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("chapter");
    const clientRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    setChapterGenerateLoading(true);
    const result = await invokeGenerateChapterContent(project.id, current.id, clientRequestId);
    setChapterGenerateLoading(false);
    if (!result.ok) {
      if (result.code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
      } else if (result.code === "wrong_content_source") {
        setActionAnnouncement(t("wizard.content.index.errorWrongSource"));
      } else {
        setActionAnnouncement(t("wizard.content.chapters.errorGenerateGeneric"));
      }
      return;
    }
    const saved = await updateChapterDraftContent(current.id, result.content);
    if (!saved.ok) {
      setActionAnnouncement(t("wizard.content.chapters.errorSave"));
      return;
    }
    setMainChapterBodyDraft(result.content);
    setMainChapterRows((rows) =>
      rows.map((r) => (r.id === current.id ? { ...r, content: result.content, approved_at: null } : r)),
    );
    setMainChapterRichTextKey((k) => k + 1);
    void refreshChapterBodyPresence();
    setActionAnnouncement(t("wizard.content.chapters.generateSuccess"));
  }, [mainChapterRows, mainChapterIdx, project?.id, t, refreshChapterBodyPresence]);

  const handleApproveMainChapter = useCallback(async () => {
    const current = mainChapterRows[mainChapterIdx];
    if (!current || isChapterHtmlEffectivelyEmpty(mainChapterBodyDraft)) return;
    const draftMatchesSaved = chapterHtmlEquals(mainChapterBodyDraft, current.content ?? "");
    if (current.approved_at && draftMatchesSaved) return;

    setActionAnnouncement(null);
    setChapterApproveLoading(true);

    if (!draftMatchesSaved) {
      const saveRes = await updateChapterDraftContent(current.id, mainChapterBodyDraft);
      if (!saveRes.ok) {
        setChapterApproveLoading(false);
        setActionAnnouncement(t("wizard.content.chapters.errorSave"));
        return;
      }
      setMainChapterRows((rows) =>
        rows.map((r) =>
          r.id === current.id ? { ...r, content: mainChapterBodyDraft, approved_at: null } : r,
        ),
      );
    }

    const res = await approveChapterBody(current.id);
    setChapterApproveLoading(false);
    if (!res.ok) {
      setActionAnnouncement(t("wizard.content.chapters.errorApprove"));
      return;
    }
    const now = new Date().toISOString();
    setMainChapterRows((rows) =>
      rows.map((r) => (r.id === current.id ? { ...r, approved_at: now } : r)),
    );
    void refreshChapterBodyPresence();
    setActionAnnouncement(t("wizard.content.chapters.approveSuccess"));
  }, [mainChapterRows, mainChapterIdx, mainChapterBodyDraft, t, refreshChapterBodyPresence]);

  function dismissBanner() {
    if (!params.projectId) return;
    try {
      localStorage.setItem(`${BANNER_STORAGE_PREFIX}${params.projectId}`, "1");
    } catch {
      /* ignore */
    }
    setBannerDismissed(true);
  }

  const globalSteps = useMemo(
    () => [
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const },
      { id: 2, label: t("wizard.stepper.content"), status: "active" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "upcoming" as const },
    ],
    [t],
  );

  const mainTocValidation = validateMainTocForConfirm(mainTocRows);
  const bumpRowsForConfirm = bonusBumpToc[selectedKey] ?? [];
  const bumpTocValidation = validateMainTocForConfirm(bumpRowsForConfirm);
  const confirmDisabled =
    selectedTarget.kind === "main"
      ? mainTocValidation !== "ok"
      : selectedTarget.kind === "bump"
        ? bumpTocValidation !== "ok"
        : true;

  const confirmVisible =
    (selectedTarget.kind === "main" &&
      !needsUploadAlignment &&
      !indexFrozen &&
      currentPhase === "main_index" &&
      project?.content_source === "ai" &&
      tocEntryResolved) ||
    (selectedTarget.kind === "bump" &&
      !needsUploadAlignment &&
      !Boolean(bumpIndexFrozenAt[selectedKey]) &&
      project?.content_source === "ai" &&
      bumpTocEntryResolved[selectedKey] === true);

  const tocReadOnly =
    (selectedTarget.kind === "main" && (needsUploadAlignment || indexFrozen || !workspaceReady)) ||
    (selectedTarget.kind === "bump" &&
      (needsUploadAlignment || Boolean(bumpIndexFrozenAt[selectedKey]) || !workspaceReady));

  const showMainTocEmptyChoice =
    (selectedTarget.kind === "main" &&
      !needsUploadAlignment &&
      !indexFrozen &&
      currentPhase === "main_index" &&
      workspaceReady &&
      !tocReadOnly &&
      !tocEntryResolved) ||
    (selectedTarget.kind === "bump" &&
      !needsUploadAlignment &&
      workspaceReady &&
      !Boolean(bumpIndexFrozenAt[selectedKey]) &&
      bumpTocEntryResolved[selectedKey] === false);

  const regenerateDisabledMain =
    needsUploadAlignment ||
    indexFrozen ||
    !workspaceReady ||
    generateLoading ||
    project?.content_source !== "ai";

  const regenerateDisabledBump =
    needsUploadAlignment ||
    Boolean(bumpIndexFrozenAt[selectedKey]) ||
    !workspaceReady ||
    generateLoading ||
    project?.content_source !== "ai";

  const handleEmptyTocChooseManual = useCallback(() => {
    if (selectedTarget.kind === "main") {
      setMainTocRows(defaultMainRows());
      setTocEntryResolved(true);
      return;
    }
    if (selectedTarget.kind !== "bump") return;
    const ebookId = packageEbookIds[selectedKey];
    const pending = persistTimersRef.current[selectedKey];
    if (pending) {
      clearTimeout(pending);
      delete persistTimersRef.current[selectedKey];
    }
    const rows = defaultMainRows();
    setBonusBumpToc((prev) => ({ ...prev, [selectedKey]: rows }));
    setBumpTocEntryResolved((prev) => ({ ...prev, [selectedKey]: true }));
    if (ebookId) {
      void upsertEbookDraftChaptersFromRows(ebookId, rows).then((res) => {
        if (res.ok) {
          setBonusBumpToc((p) => ({ ...p, [selectedKey]: res.rows }));
        }
      });
    }
  }, [selectedTarget.kind, selectedKey, packageEbookIds]);

  const selectedNavIndex = useMemo(() => {
    const i = navItems.findIndex((item) => item.key === selectedKey);
    return i >= 0 ? i : 0;
  }, [navItems, selectedKey]);

  const isFirstContentPackage = selectedNavIndex === 0;
  const isLastContentPackage = navItems.length > 0 && selectedNavIndex >= navItems.length - 1;

  const handleFooterBack = useCallback(async () => {
    if (!params.projectId) return;
    if (isFirstContentPackage) {
      if (showMainChapterLoop) {
        const row = mainChapterRows[mainChapterIdx];
        if (row && !chapterHtmlEquals(mainChapterBodyDraft, row.content ?? "")) {
          setChapterSaveLoading(true);
          const res = await updateChapterDraftContent(row.id, mainChapterBodyDraft);
          setChapterSaveLoading(false);
          if (!res.ok) {
            setActionAnnouncement(t("wizard.content.chapters.errorSave"));
            return;
          }
          setMainChapterRows((rows) =>
            rows.map((r) =>
              r.id === row.id ? { ...r, content: mainChapterBodyDraft, approved_at: null } : r,
            ),
          );
        }
      }
      navigate(`/app/projects/${params.projectId}/wizard`);
      return;
    }
    const prevNav = navItems[selectedNavIndex - 1];
    if (prevNav) void handleSelectPackageKey(prevNav.key);
  }, [
    isFirstContentPackage,
    showMainChapterLoop,
    mainChapterRows,
    mainChapterIdx,
    mainChapterBodyDraft,
    handleSelectPackageKey,
    navigate,
    navItems,
    params.projectId,
    selectedNavIndex,
    t,
  ]);

  const handleFooterNext = useCallback(() => {
    if (isLastContentPackage) return;
    const next = navItems[selectedNavIndex + 1];
    if (next) void handleSelectPackageKey(next.key);
  }, [isLastContentPackage, handleSelectPackageKey, navItems, selectedNavIndex]);

  if (!params.projectId) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <div className="bg-obra-blue-950 px-6 py-3">
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
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">
          {showMainChapterLoop ? t("wizard.content.milestone.chapters") : t("wizard.content.milestone.index")}
        </p>
      </div>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-obra-blue-50">
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          {!bannerDismissed ? (
            <div
              role="region"
              aria-label={t("wizard.content.banner.regionAria")}
              className="mb-6 rounded-card border border-obra-blue-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-body text-sm text-obra-blue-950">{t("wizard.content.banner.body")}</p>
                <Button type="button" variant="tertiary" size="small" onClick={dismissBanner}>
                  {t("wizard.content.banner.dismiss")}
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
          {error ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {workspaceError ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workspaceError}
            </p>
          ) : null}

          {needsUploadAlignment && project ? (
            <div className="rounded-card border border-obra-blue-100 bg-white px-4 py-6 shadow-sm">
              <p className="font-body text-sm text-obra-blue-950">{t("wizard.content.uploadGate.body")}</p>
            </div>
          ) : null}

          {project && !loading && workspaceReady && !needsUploadAlignment && !showMainChapterLoop ? (
            <ContentIndexMilestone
              t={t}
              navItems={navItems}
              selectedKey={selectedKey}
              onSelectKey={handleSelectPackageKey}
              navItemDisabled={navItemDisabled}
              panelTitle={panelCopy.title}
              panelSubtitle={panelCopy.subtitle}
              tocRows={currentTocRows}
              onChangeToc={setCurrentToc}
              onRegenerateOutline={() => {
                if (selectedTarget.kind === "main") void handleRegenerateMainOutline();
                else if (selectedTarget.kind === "bump") void handleRegenerateBumpOutline();
                else void handleRegenerateBonusBumpPlaceholder();
              }}
              regenerateDisabled={
                selectedTarget.kind === "main"
                  ? regenerateDisabledMain
                  : selectedTarget.kind === "bump"
                    ? regenerateDisabledBump
                    : false
              }
              regenerateLoading={generateLoading}
              tocReadOnly={tocReadOnly}
              confirmVisible={confirmVisible}
              onConfirmIndex={() => void handleConfirmPackageIndex()}
              confirmDisabled={confirmDisabled}
              confirmLoading={confirmLoading}
              actionAnnouncement={actionAnnouncement}
              showMainTocEmptyChoice={showMainTocEmptyChoice}
              mainTocEmptyShowGenerate={project?.content_source === "ai"}
              onMainTocChooseManual={handleEmptyTocChooseManual}
              onMainTocChooseGenerate={() => {
                if (selectedTarget.kind === "main") void handleRegenerateMainOutline();
                else if (selectedTarget.kind === "bump") void handleRegenerateBumpOutline();
                else void handleRegenerateBonusBumpPlaceholder();
              }}
            />
          ) : null}

          {showMainChapterLoop ? (
            <ContentChapterMilestone
              t={t}
              navItems={navItems}
              selectedKey={selectedKey}
              onSelectKey={handleSelectPackageKey}
              navItemDisabled={navItemDisabled}
              panelTitle={chapterPanelCopy.title}
              panelSubtitle={chapterPanelCopy.subtitle}
              chapters={mainChapterRows}
              selectedIndex={mainChapterIdx}
              onSelectChapterIndex={(i) => void handleSelectMainChapterIndex(i)}
              bodyValue={mainChapterBodyDraft}
              onBodyChange={setMainChapterBodyDraft}
              onSave={() => void handleSaveMainChapterBody()}
              onGenerate={() => void handleGenerateMainChapter()}
              onApprove={() => void handleApproveMainChapter()}
              saveLoading={chapterSaveLoading}
              generateLoading={chapterGenerateLoading}
              approveLoading={chapterApproveLoading}
              actionAnnouncement={actionAnnouncement}
              richTextResetKey={mainChapterRichTextKey}
              onEditIndex={() => void handleReopenMainIndex()}
              editIndexLoading={reopenIndexLoading}
            />
          ) : null}

        </div>
      </main>

      <div className="w-full shrink-0 border-t border-obra-blue-100 bg-white px-8 py-5">
        <div className="flex w-full min-w-0 items-center justify-between">
          <Button type="button" variant="tertiary" onClick={() => void handleFooterBack()}>
            <ChevronLeft className="size-4" aria-hidden />
            {isFirstContentPackage
              ? t("wizard.content.footer.backToStructure")
              : t("wizard.content.footer.back")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={navItems.length === 0 || isLastContentPackage}
            onClick={handleFooterNext}
          >
            {t("wizard.structure.next")}
            <ChevronRight className="size-4" aria-hidden />
          </Button>
        </div>
      </div>

      <Modal
        open={Boolean(titleChangeModal)}
        onClose={handleCancelTitleChangeModal}
        closeLabel={t("wizard.content.chapters.titleChangeModalCloseAria")}
      >
        <ModalHead>
          <ModalTitle>{t("wizard.content.chapters.titleChangeModalTitle")}</ModalTitle>
          <ModalSubtitle>{t("wizard.content.chapters.titleChangeModalSubtitle")}</ModalSubtitle>
        </ModalHead>
        <ModalContent>{t("wizard.content.chapters.titleChangeModalBody")}</ModalContent>
        <ModalFooter className="justify-end">
          <Button type="button" variant="tertiary" size="medium" onClick={handleCancelTitleChangeModal}>
            {t("wizard.content.chapters.titleChangeModalCancel")}
          </Button>
          <Button type="button" variant="primary" size="medium" onClick={() => void handleConfirmTitleChangeResetBody()}>
            {t("wizard.content.chapters.titleChangeModalConfirm")}
          </Button>
        </ModalFooter>
      </Modal>

      {insufficientCreditsToastOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4 sm:bottom-8">
          <div className="pointer-events-auto w-full max-w-toast">
            <ObraToast
              variant="error"
              title={t("wizard.content.index.toastInsufficientCreditsTitle")}
              description={
                insufficientCreditsSource === "chapter"
                  ? t("wizard.content.chapters.errorInsufficientCredits")
                  : t("wizard.content.index.errorInsufficientCredits")
              }
              onTimeout={() => setInsufficientCreditsToastOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
