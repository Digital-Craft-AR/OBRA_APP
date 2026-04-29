import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalSubtitle, ModalTitle } from "@/components/ui/Modal";
import { ObraToast } from "@/components/obra/ObraToast";
import { ContentIndexMilestone } from "@/components/wizard/content/ContentIndexMilestone";
import { ContentChapterMilestone, ContentChapterNav } from "@/components/wizard/content/ContentChapterMilestone";
import { ContentArtifactTabs } from "@/components/wizard/content/ContentArtifactTabs";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { ObraSpinner } from "@/components/obra/ObraSpinner";
import { ObraAlert } from "@/components/obra/ObraAlert";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import {
  buildContentPackageNavTargets,
  contentNavTargetToKey,
  parseContentNavKey,
  type ContentNavItem,
  type ContentPackageNavTarget,
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
  reopenGlobalIndex,
  replaceEbookDraftChapters,
  trySyncMainEbookTocBeforeFreeze,
  updateChapterDraftContent,
  upsertEbookDraftChaptersFromRows,
  validateMainTocForConfirm,
  type ChapterDraftRow,
} from "@/lib/wizard/contentIndexApi";
import {
  fetchActiveManuscript,
  type ProjectManuscriptRow,
} from "@/lib/wizard/manuscriptUploadApi";
import { buildPackageTocRowsForUploadHandoff } from "@/lib/wizard/uploadHandoff";
import { ManuscriptUploadPanel } from "@/components/wizard/content/ManuscriptUploadPanel";
import { ContentSourceIntroPanel } from "@/components/wizard/content/ContentSourceIntroPanel";
import { ContentUploadAlignmentPanel } from "@/components/wizard/content/ContentUploadAlignmentPanel";
import {
  invokeApproveAlignment,
  type SplitProposalChapter,
} from "@/lib/wizard/splitProposalApi";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";
import { toastApiFailure, toastInsufficientCredits, toastRateLimited, INVOKE_ERROR_RATE_LIMITED } from "@/lib/apiToast";
import { chapterHtmlEquals, isChapterHtmlEffectivelyEmpty } from "@/lib/sanitizeChapterHtml";
import { makeRetryRequestIdStore } from "@/lib/wizard/retryRequestId";
import { supabase } from "@/lib/supabaseClient";
import type { ContentSource } from "@/lib/projects";
import { toast } from "@/toast";

const BANNER_STORAGE_PREFIX = "obra.content.banner.dismissed.";

function contentSourceIntroStorageKey(projectId: string) {
  return `obra.content.sourceIntro.${projectId}`;
}

function readContentSourceIntroDone(projectId: string | undefined): boolean {
  try {
    if (typeof globalThis.sessionStorage === "undefined" || !projectId) return false;
    return globalThis.sessionStorage.getItem(contentSourceIntroStorageKey(projectId)) === "1";
  } catch {
    return false;
  }
}

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

  const { project, loading, error, setProject } = useWizardStructureProject(
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
  const [globalIndexFrozenAt, setGlobalIndexFrozenAt] = useState<string | null>(null);
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
  // Generating phase
  const [backWarningOpen, setBackWarningOpen] = useState(false);
  const [artifactApproveLoading, setArtifactApproveLoading] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);
  const autoGenerateAbortRef = useRef(false);
  const [chapterRows, setChapterRows] = useState<ChapterDraftRow[]>([]);
  const [chapterIdx, setChapterIdx] = useState(0);
  const [chapterBodyDraft, setChapterBodyDraft] = useState("");
  const [chapterSaveLoading, setChapterSaveLoading] = useState(false);
  const [chapterGenerateLoading, setChapterGenerateLoading] = useState(false);
  const [chapterApproveLoading, setChapterApproveLoading] = useState(false);
  const [chapterSuccessMessage, setChapterSuccessMessage] = useState<string | null>(null);
  const [chapterRichTextKey, setChapterRichTextKey] = useState(0);
  const [chapterBodyPresence, setChapterBodyPresence] = useState<Record<string, boolean>>({});
  const [artifactApprovedByKey, setArtifactApprovedByKey] = useState<Record<string, boolean>>({});
  const [titleChangeModal, setTitleChangeModal] = useState<{
    pendingRows: TocChapterRow[];
    baseRows: TocChapterRow[];
  } | null>(null);
  const [manuscriptRow, setManuscriptRow] = useState<ProjectManuscriptRow | null>(null);
  const [manuscriptCommitted, setManuscriptCommitted] = useState(false);
  // Sync manuscriptCommitted from DB-loaded manuscriptRow so refreshes don't lose the alignment panel.
  useEffect(() => {
    if ((manuscriptRow?.extracted_char_count ?? 0) > 0) {
      setManuscriptCommitted(true);
    }
  }, [manuscriptRow]);

  // Auto-clear chapter success message after 4 s
  useEffect(() => {
    if (!chapterSuccessMessage) return;
    const id = setTimeout(() => setChapterSuccessMessage(null), 4000);
    return () => clearTimeout(id);
  }, [chapterSuccessMessage]);
  const [contentSourceIntroDone, setContentSourceIntroDone] = useState(() =>
    readContentSourceIntroDone(params.projectId),
  );
  const [introSourceBusy, setIntroSourceBusy] = useState(false);
  const [uploadHandoffBusy, setUploadHandoffBusy] = useState(false);

  useEffect(() => {
    setContentSourceIntroDone(readContentSourceIntroDone(params.projectId));
  }, [params.projectId]);

  const bonusBumpTocRef = useRef(bonusBumpToc);
  bonusBumpTocRef.current = bonusBumpToc;
  const packageEbookIdsRef = useRef(packageEbookIds);
  packageEbookIdsRef.current = packageEbookIds;
  const persistTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const retryIds = useRef(makeRetryRequestIdStore());
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
    if (project.lifecycle_status !== "active") {
      navigate("/app/dashboard", { replace: true });
      return;
    }
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
    setGlobalIndexFrozenAt(null);
    setBumpTocEntryResolved({});
    setBumpIndexFrozenAt({});
    setArtifactApprovedByKey({});
    setPackageEbookIds({});
    setBonusBumpToc({});
    setManuscriptRow(null);

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
      setGlobalIndexFrozenAt(ensured.data.global_index_frozen_at);

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

      // Pre-load chapter drafts when already in main_chapter phase so that
      // ContentChapterMilestone is immediately populated when showChapterLoop
      // becomes true. Without this, there is a race between setWorkspaceReady(true)
      // and the separate chapter-loading effect, leaving chapterRows=[] and the
      // editor hidden until the user switches books.
      if (ensured.data.current_phase === "main_chapter") {
        const initDraft = await loadEbookChaptersDraft(ensured.data.main_ebook_id);
        if (cancelled) return;
        if (initDraft.ok && initDraft.rows.length > 0) {
          setChapterRows(initDraft.rows);
          setChapterIdx(0);
          setChapterBodyDraft(initDraft.rows[0]?.content ?? "");
        }
      }

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
    if (!project?.id || loading) return;
    if (!project.structure_completed_at) return;
    if (project.content_source !== "upload") {
      setManuscriptRow(null);
      return;
    }
    let cancelled = false;
    void fetchActiveManuscript(project.id).then((ms) => {
      if (cancelled) return;
      if (ms.ok) setManuscriptRow(ms.row);
      else setManuscriptRow(null);
    });
    return () => {
      cancelled = true;
    };
  }, [project?.id, project?.content_source, loading, project?.structure_completed_at]);

  const selectedEbookId = useMemo(() => {
    if (selectedKey === "main") return mainEbookId;
    return packageEbookIds[selectedKey] ?? null;
  }, [selectedKey, mainEbookId, packageEbookIds]);

  useEffect(() => {
    if (currentPhase !== "main_chapter") return;

    const targetEbookId = selectedKey === "main" ? mainEbookId : packageEbookIds[selectedKey] ?? null;

    // When switching bonus/bump before package ebook ids are ready, `selectedEbookId` was null and
    // this effect returned early without clearing — leaving main-ebook chapter IDs in state.
    // That caused ai-generate-content "chapter_not_found" / saves that targeted the wrong rows.
    if (!targetEbookId) {
      setChapterRows([]);
      setChapterIdx(0);
      setChapterBodyDraft("");
      return;
    }

    setChapterRows([]);
    setChapterIdx(0);
    setChapterBodyDraft("");
    let cancelled = false;
    void loadEbookChaptersDraft(targetEbookId).then((r) => {
      if (cancelled || !r.ok) return;
      setChapterRows(r.rows);
      setChapterIdx(0);
      setChapterBodyDraft(r.rows[0]?.content ?? "");
      setChapterRichTextKey((k) => k + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedKey, mainEbookId, packageEbookIds, currentPhase]);

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

  const refreshArtifactApprovalFor = useCallback(async (key: string, ebookId: string) => {
    const draft = await loadEbookChaptersDraft(ebookId);
    if (!draft.ok) return;
    const allApproved = draft.rows.length > 0 && draft.rows.every((row) => Boolean(row.approved_at));
    setArtifactApprovedByKey((prev) => ({ ...prev, [key]: allApproved }));
  }, []);

  const refreshAllArtifactApprovals = useCallback(async () => {
    const entries: Array<{ key: string; ebookId: string }> = [];
    if (mainEbookId) entries.push({ key: "main", ebookId: mainEbookId });
    for (const [key, ebookId] of Object.entries(packageEbookIds)) {
      entries.push({ key, ebookId });
    }
    await Promise.all(entries.map((entry) => refreshArtifactApprovalFor(entry.key, entry.ebookId)));
  }, [mainEbookId, packageEbookIds, refreshArtifactApprovalFor]);

  useEffect(() => {
    if (!mainEbookId) return;
    void refreshChapterBodyPresence();
  }, [mainEbookId, refreshChapterBodyPresence]);

  useEffect(() => {
    if (!workspaceReady || currentPhase !== "main_chapter") return;
    void refreshAllArtifactApprovals();
  }, [workspaceReady, currentPhase, refreshAllArtifactApprovals]);

  useEffect(() => {
    if (currentPhase === "main_chapter") return;
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
  }, [selectedKey, currentPhase]);

  useEffect(() => {
    return () => {
      if (currentPhase === "main_chapter") return;
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
  }, [currentPhase]);

  const needsUploadAlignment =
    project?.content_source === "upload" && currentPhase === "upload_alignment";

  const indexFrozen = Boolean(globalIndexFrozenAt);

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
      const tocConfirmed = Boolean(artifactApprovedByKey[key]);
      return { key, navTitle, target, tocConfirmed };
    });
  }, [project, t, artifactApprovedByKey]);

  const selectedTarget = parseContentNavKey(selectedKey) ?? { kind: "main" as const };

  const showChapterLoop =
    Boolean(project) &&
    !loading &&
    workspaceReady &&
    !needsUploadAlignment &&
    currentPhase === "main_chapter" &&
    (project?.content_source === "ai" || project?.content_source === "upload");

  /**
   * Intro is also "done" when server progress has clearly moved past the first-time choice,
   * so we do not flash it on dashboard → content navigations without sessionStorage (or after
   * clearing storage) when the user is already in upload alignment, chapter phase, or past index freeze.
   */
  const introSkippableByServerProgress = useMemo(
    () =>
      Boolean(
        workspaceReady &&
          (currentPhase !== null ||
            Boolean(globalIndexFrozenAt)),
      ),
    [workspaceReady, currentPhase, globalIndexFrozenAt],
  );

  const effectiveContentIntroDone = contentSourceIntroDone || introSkippableByServerProgress;

  useEffect(() => {
    if (!params.projectId || !introSkippableByServerProgress || contentSourceIntroDone) return;
    try {
      globalThis.sessionStorage.setItem(contentSourceIntroStorageKey(params.projectId), "1");
    } catch {
      /* ignore */
    }
    setContentSourceIntroDone(true);
  }, [params.projectId, introSkippableByServerProgress, contentSourceIntroDone]);

  const awaitingContentIntro = useMemo(
    () =>
      Boolean(
        project &&
          project.id === params.projectId &&
          !loading &&
          workspaceReady &&
          !effectiveContentIntroDone,
      ),
    [project, params.projectId, loading, workspaceReady, effectiveContentIntroDone],
  );

  const contentInnerStepTotal = project?.content_source === "upload" ? 4 : 3;

  const contentInnerStepCurrent = useMemo(() => {
    if (!project || !workspaceReady) return 1;
    if (!effectiveContentIntroDone) return 1;
    if (project.content_source === "upload") {
      if (needsUploadAlignment) return 2;
      if (showChapterLoop) return 4;
      return 3;
    }
    if (showChapterLoop) return 3;
    return 2;
  }, [project, workspaceReady, effectiveContentIntroDone, needsUploadAlignment, showChapterLoop]);

  const contentInnerStepLabel = useMemo(() => {
    if (!project || !workspaceReady) return t("wizard.content.inner.contentSource");
    if (!effectiveContentIntroDone) return t("wizard.content.inner.contentSource");
    if (project.content_source === "upload") {
      if (contentInnerStepCurrent === 2) return t("wizard.content.inner.manuscript");
      if (contentInnerStepCurrent === 3) return t("wizard.content.inner.packageIndex");
      return t("wizard.content.inner.chapterContent");
    }
    if (contentInnerStepCurrent === 2) return t("wizard.content.inner.toc");
    return t("wizard.content.inner.chapterContent");
  }, [project, workspaceReady, effectiveContentIntroDone, contentInnerStepCurrent, t]);

  const persistCurrentChapterDraftIfDirty = useCallback(async () => {
    if (!showChapterLoop) return true;
    const prev = chapterRows[chapterIdx];
    if (!prev || chapterHtmlEquals(chapterBodyDraft, prev.content ?? "")) return true;
    setChapterSaveLoading(true);
    const res = await updateChapterDraftContent(prev.id, chapterBodyDraft);
    setChapterSaveLoading(false);
    if (!res.ok) {
      const key = "wizard.content.chapters.errorSave";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return false;
    }
    setChapterRows((rows) =>
      rows.map((r) => (r.id === prev.id ? { ...r, content: chapterBodyDraft, approved_at: null } : r)),
    );
    return true;
  }, [showChapterLoop, chapterRows, chapterIdx, chapterBodyDraft, t]);

  const handleSelectPackageKey = useCallback(
    async (key: string) => {
      if (key === selectedKey) return;
      const ok = await persistCurrentChapterDraftIfDirty();
      if (!ok) return;
      setSelectedKey(key);
    },
    [selectedKey, persistCurrentChapterDraftIfDirty],
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
    const selectedNavTitle =
      navItems.find((item) => item.key === selectedKey)?.navTitle ||
      project.main_title?.trim() ||
      t("wizard.content.index.mainTitleFallback");
    return {
      title: t("wizard.content.chapters.panelTitle", { title: selectedNavTitle }),
      subtitle: t("wizard.content.chapters.panelSubtitle"),
    };
  }, [project, t, navItems, selectedKey]);

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
    (key: string) =>
      (needsUploadAlignment && key !== "main") || generateLoading || chapterGenerateLoading,
    [needsUploadAlignment, generateLoading, chapterGenerateLoading],
  );

  const handleRegenerateMainOutline = useCallback(async () => {
    if (selectedTarget.kind !== "main" || !project?.id || !mainEbookId) return;
    if (needsUploadAlignment || indexFrozen) return;
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("index");
    const opKey = "main-outline";
    const clientRequestId = retryIds.current.getOrCreate(opKey);
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId);
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        toastInsufficientCredits(t, "wizard.content.index.errorInsufficientCredits");
      } else if (code?.startsWith(INVOKE_ERROR_RATE_LIMITED)) {
        toastRateLimited(t);
      } else if (code === "wrong_content_source") {
        const message = t("wizard.content.index.errorWrongSource");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      } else {
        const message = t("wizard.content.index.errorGenerateGeneric");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      }
      return;
    }
    retryIds.current.clear(opKey);
    const saved = await replaceEbookDraftChapters(mainEbookId, result.titles);
    if (!saved.ok) {
      const message = t("wizard.content.index.errorSaveToc");
      toast.error({
        title: t("wizard.content.index.regenerateOutline"),
        description: message,
      });
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
    const opKey = `bump-outline:${ebookId}`;
    const clientRequestId = retryIds.current.getOrCreate(opKey);
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId, { targetEbookId: ebookId });
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
        toastInsufficientCredits(t, "wizard.content.index.errorInsufficientCredits");
      } else if (code?.startsWith(INVOKE_ERROR_RATE_LIMITED)) {
        toastRateLimited(t);
      } else if (code === "wrong_content_source") {
        const message = t("wizard.content.index.errorWrongSource");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      } else {
        const message = t("wizard.content.index.errorGenerateGeneric");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      }
      return;
    }
    retryIds.current.clear(opKey);
    const saved = await replaceEbookDraftChapters(ebookId, result.titles);
    if (!saved.ok) {
      const message = t("wizard.content.index.errorSaveToc");
      toast.error({
        title: t("wizard.content.index.regenerateOutline"),
        description: message,
      });
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

  const handleRegenerateBonusOutline = useCallback(async () => {
    if (selectedTarget.kind !== "bonus" || !project?.id) return;
    const ebookId = packageEbookIds[selectedKey];
    if (!ebookId) return;
    if (needsUploadAlignment || indexFrozen) return;
    const pending = persistTimersRef.current[selectedKey];
    if (pending) {
      clearTimeout(pending);
      delete persistTimersRef.current[selectedKey];
    }
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("index");
    const opKey = `bonus-outline:${ebookId}`;
    const clientRequestId = retryIds.current.getOrCreate(opKey);
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId, { targetEbookId: ebookId });
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
        toastInsufficientCredits(t, "wizard.content.index.errorInsufficientCredits");
      } else if (code?.startsWith(INVOKE_ERROR_RATE_LIMITED)) {
        toastRateLimited(t);
      } else if (code === "wrong_content_source") {
        const message = t("wizard.content.index.errorWrongSource");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      } else {
        const message = t("wizard.content.index.errorGenerateGeneric");
        toast.error({
          title: t("wizard.content.index.regenerateOutline"),
          description: message,
        });
      }
      return;
    }
    retryIds.current.clear(opKey);
    const saved = await replaceEbookDraftChapters(ebookId, result.titles);
    if (!saved.ok) {
      const message = t("wizard.content.index.errorSaveToc");
      toast.error({
        title: t("wizard.content.index.regenerateOutline"),
        description: message,
      });
      return;
    }
    const loaded = await loadEbookChapters(ebookId);
    if (loaded.ok) {
      setBonusBumpToc((p) => ({ ...p, [selectedKey]: loaded.rows }));
    }
    setActionAnnouncement(t("wizard.content.index.regenerateSuccess"));
  }, [
    selectedTarget.kind,
    project?.id,
    packageEbookIds,
    selectedKey,
    needsUploadAlignment,
    indexFrozen,
    t,
  ]);

  const handleConfirmGlobalIndex = useCallback(async () => {
    if (!project?.id || !mainEbookId) return;
    setConfirmLoading(true);

    const mainSync = await trySyncMainEbookTocBeforeFreeze(mainEbookId, mainTocRows);
    if (!mainSync.ok) {
      setConfirmLoading(false);
      const key = "wizard.content.index.errorSaveToc";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    if (mainSync.mode === "full_replace") {
      const persisted = await upsertEbookDraftChaptersFromRows(mainEbookId, mainTocRows);
      if (!persisted.ok) {
        setConfirmLoading(false);
        const key = "wizard.content.index.errorSaveToc";
        setActionAnnouncement(t(key));
        toastApiFailure(t, key);
        return;
      }
      setMainTocRows(persisted.rows);
    }

    for (const item of navItems) {
      if (item.target.kind === "main") continue;
      const ebookId = packageEbookIds[item.key];
      if (!ebookId) continue;
      const rows = bonusBumpToc[item.key] ?? [];
      const persisted = await upsertEbookDraftChaptersFromRows(ebookId, rows);
      if (!persisted.ok) {
        setConfirmLoading(false);
        const key = "wizard.content.index.errorSaveToc";
        setActionAnnouncement(t(key));
        toastApiFailure(t, key);
        return;
      }
      setBonusBumpToc((p) => ({ ...p, [item.key]: persisted.rows }));
      if (item.target.kind === "bump" && !bumpIndexFrozenAt[item.key]) {
        const confirmedBump = await confirmOrderBumpIndex(ebookId);
        if (!confirmedBump.ok) {
          setConfirmLoading(false);
          const key = "wizard.content.index.errorConfirmPhase";
          setActionAnnouncement(t(key));
          toastApiFailure(t, key);
          return;
        }
        setBumpIndexFrozenAt((p) => ({ ...p, [item.key]: confirmedBump.frozen_at }));
      }
    }

    const confirmed = await confirmMainIndex(project.id);
    setConfirmLoading(false);
    if (!confirmed.ok) {
      const key = "wizard.content.index.errorConfirmPhase";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    const now = new Date().toISOString();
    setGlobalIndexFrozenAt(now);
    setCurrentPhase("main_chapter");
    void refreshChapterBodyPresence();
    setActionAnnouncement(t("wizard.content.index.confirmSuccess"));
  }, [
    project?.id,
    mainEbookId,
    mainTocRows,
    navItems,
    packageEbookIds,
    bonusBumpToc,
    bumpIndexFrozenAt,
    t,
    refreshChapterBodyPresence,
  ]);

  const handleConfirmTitleChangeResetBody = useCallback(async () => {
    if (!titleChangeModal) return;
    const { pendingRows, baseRows } = titleChangeModal;
    const toClear = chapterIdsWithRenamedBody(baseRows, pendingRows, chapterBodyPresence);
    setTitleChangeModal(null);
    for (const id of toClear) {
      const cleared = await clearChapterBody(id);
      if (!cleared.ok) {
        const key = "wizard.content.chapters.errorClearBody";
        setActionAnnouncement(t(key));
        toastApiFailure(t, key);
        return;
      }
    }
    setMainTocRows(pendingRows);
    void refreshChapterBodyPresence();
  }, [titleChangeModal, chapterBodyPresence, refreshChapterBodyPresence, t]);

  const handleCancelTitleChangeModal = useCallback(() => {
    setTitleChangeModal(null);
  }, []);

  const handleSelectChapterIndex = useCallback(
    async (nextIdx: number) => {
      if (nextIdx === chapterIdx) return;
      const prev = chapterRows[chapterIdx];
      let rows = chapterRows;

      if (prev && !chapterHtmlEquals(chapterBodyDraft, prev.content ?? "")) {
        setChapterSaveLoading(true);
        const res = await updateChapterDraftContent(prev.id, chapterBodyDraft);
        setChapterSaveLoading(false);
        if (!res.ok) {
          const key = "wizard.content.chapters.errorSave";
          setActionAnnouncement(t(key));
          toastApiFailure(t, key);
          return;
        }
        rows = rows.map((r) =>
          r.id === prev.id ? { ...r, content: chapterBodyDraft, approved_at: null } : r,
        );
        setChapterRows(rows);
      }

      setChapterIdx(nextIdx);
      setChapterBodyDraft(rows[nextIdx]?.content ?? "");
    },
    [chapterIdx, chapterRows, chapterBodyDraft, t],
  );

  const handleSaveChapterBody = useCallback(async () => {
    const current = chapterRows[chapterIdx];
    if (!current) return;
    setActionAnnouncement(null);
    setChapterSaveLoading(true);
    const res = await updateChapterDraftContent(current.id, chapterBodyDraft);
    setChapterSaveLoading(false);
    if (!res.ok) {
      const key = "wizard.content.chapters.errorSave";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    setChapterRows((rows) =>
      rows.map((r) => (r.id === current.id ? { ...r, content: chapterBodyDraft, approved_at: null } : r)),
    );
    setArtifactApprovedByKey((prev) => ({ ...prev, [selectedKey]: false }));
    void refreshChapterBodyPresence();
    // Mark project as modified if it was already published (content changed after export).
    // Conditional update: only applies when publish_status = 'published', no-op otherwise.
    if (project?.id) {
      void supabase
        .from("projects")
        .update({ publish_status: "modified" })
        .eq("id", project.id)
        .eq("publish_status", "published");
    }
  }, [chapterRows, chapterIdx, chapterBodyDraft, t, refreshChapterBodyPresence, selectedKey, project?.id]);

  const handleGenerateChapter = useCallback(async () => {
    const current = chapterRows[chapterIdx];
    if (!current || !project?.id) return;
    setActionAnnouncement(null);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("chapter");
    const opKey = `chapter:${current.id}`;
    const clientRequestId = retryIds.current.getOrCreate(opKey);
    setChapterGenerateLoading(true);
    const result = await invokeGenerateChapterContent(project.id, current.id, clientRequestId);
    setChapterGenerateLoading(false);
    if (!result.ok) {
      if (result.code === "insufficient_credits") {
        setInsufficientCreditsToastOpen(true);
        toastInsufficientCredits(t, "wizard.content.chapters.errorInsufficientCredits");
      } else if (result.code?.startsWith(INVOKE_ERROR_RATE_LIMITED)) {
        toastRateLimited(t);
      } else if (result.code === "wrong_content_source") {
        const key = "wizard.content.index.errorWrongSource";
        setActionAnnouncement(t(key));
        toastApiFailure(t, key);
      } else {
        const key = "wizard.content.chapters.errorGenerateGeneric";
        if (result.message) {
          setActionAnnouncement(result.message);
          toast.error({
            title: t(key),
            description: result.message,
          });
        } else {
          setActionAnnouncement(t(key));
          toastApiFailure(t, key);
        }
      }
      return;
    }
    retryIds.current.clear(opKey);
    const saved = await updateChapterDraftContent(current.id, result.content);
    if (!saved.ok) {
      const key = "wizard.content.chapters.errorSave";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    setChapterBodyDraft(result.content);
    setChapterRows((rows) =>
      rows.map((r) => (r.id === current.id ? { ...r, content: result.content, approved_at: null } : r)),
    );
    setArtifactApprovedByKey((prev) => ({ ...prev, [selectedKey]: false }));
    setChapterRichTextKey((k) => k + 1);
    void refreshChapterBodyPresence();
    setChapterSuccessMessage(t("wizard.content.chapters.generateSuccess"));
  }, [chapterRows, chapterIdx, project?.id, t, refreshChapterBodyPresence, selectedKey]);

  const handleApproveChapter = useCallback(async () => {
    const current = chapterRows[chapterIdx];
    if (!current || isChapterHtmlEffectivelyEmpty(chapterBodyDraft)) return;
    const draftMatchesSaved = chapterHtmlEquals(chapterBodyDraft, current.content ?? "");
    if (current.approved_at && draftMatchesSaved) return;

    setActionAnnouncement(null);
    setChapterApproveLoading(true);

    if (!draftMatchesSaved) {
      const saveRes = await updateChapterDraftContent(current.id, chapterBodyDraft);
      if (!saveRes.ok) {
        setChapterApproveLoading(false);
        const key = "wizard.content.chapters.errorSave";
        setActionAnnouncement(t(key));
        toastApiFailure(t, key);
        return;
      }
      setChapterRows((rows) =>
        rows.map((r) =>
          r.id === current.id ? { ...r, content: chapterBodyDraft, approved_at: null } : r,
        ),
      );
    }

    const res = await approveChapterBody(current.id);
    setChapterApproveLoading(false);
    if (!res.ok) {
      const key = "wizard.content.chapters.errorApprove";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    const now = new Date().toISOString();
    const optimisticRows = chapterRows.map((r) => (r.id === current.id ? { ...r, approved_at: now } : r));
    let nextRows = optimisticRows;
    if (selectedEbookId) {
      const reloaded = await loadEbookChaptersDraft(selectedEbookId);
      if (reloaded.ok) nextRows = reloaded.rows;
    }
    setChapterRows(nextRows);
    const allApproved = nextRows.length > 0 && nextRows.every((row) => Boolean(row.approved_at));
    setArtifactApprovedByKey((prev) => ({ ...prev, [selectedKey]: allApproved }));
    void refreshChapterBodyPresence();
    setChapterSuccessMessage(t("wizard.content.chapters.approveSuccess"));
  }, [chapterRows, chapterIdx, chapterBodyDraft, t, refreshChapterBodyPresence, selectedKey, selectedEbookId]);

  const handleIntroContentSourceSelect = useCallback(
    async (source: ContentSource) => {
      if (!project || source === project.content_source) return;
      if (introSourceBusy) return;
      const previousSource = project.content_source;
      const nextPhase = source === "upload" ? "upload_alignment" : "main_index";
      setIntroSourceBusy(true);
      try {
        const { error: projErr } = await supabase
          .from("projects")
          .update({ content_source: source })
          .eq("id", project.id);
        if (projErr) {
          toast.error({
            title: t("wizard.content.sourceIntro.updateErrorTitle"),
            description: t("wizard.content.sourceIntro.updateError"),
          });
          return;
        }
        const { error: progErr } = await supabase
          .from("project_content_progress")
          .update({ current_phase: nextPhase })
          .eq("project_id", project.id);
        if (progErr) {
          await supabase.from("projects").update({ content_source: previousSource }).eq("id", project.id);
          toast.error({
            title: t("wizard.content.sourceIntro.updateErrorTitle"),
            description: t("wizard.content.sourceIntro.updateError"),
          });
          return;
        }
        setProject((prev) => (prev ? { ...prev, content_source: source } : null));
        setCurrentPhase(nextPhase);
      } finally {
        setIntroSourceBusy(false);
      }
    },
    [project, introSourceBusy, setProject, t],
  );

  const handleContentIntroContinue = useCallback(() => {
    if (!params.projectId) return;
    try {
      globalThis.sessionStorage.setItem(contentSourceIntroStorageKey(params.projectId), "1");
    } catch {
      /* ignore */
    }
    setContentSourceIntroDone(true);
  }, [params.projectId]);

  const handleAlignmentApproved = useCallback(
    async (approvedChapters: SplitProposalChapter[]) => {
      if (!project?.id || !mainEbookId) return;
      if (project.content_source !== "upload") return;
      if (currentPhase !== "upload_alignment") return;
      if (uploadHandoffBusy) return;

      setUploadHandoffBusy(true);
      setActionAnnouncement(null);
      try {
        // 1. Call edge function: slices manuscript, creates chapters, advances phase to main_chapter
        const res = await invokeApproveAlignment(project.id, approvedChapters);
        if (!res.ok) {
          const descKey =
            res.code === "wrong_phase"
              ? "wizard.content.splitProposal.errorWrongPhase"
              : res.code === "manuscript_not_found"
                ? "wizard.content.splitProposal.errorManuscript"
                : "wizard.content.splitProposal.errorApproveGeneric";
          toast.error({
            title: t("wizard.content.uploadHandoff.errorTitle"),
            description: t(descKey),
          });
          return;
        }

        // 2. Set global_index_frozen_at (approve-alignment doesn't set this column)
        const now = new Date().toISOString();
        await supabase
          .from("project_content_progress")
          .update({ global_index_frozen_at: now })
          .eq("project_id", project.id);

        // 3. Persist default TOC rows for bonus/bump ebooks
        const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
        const packageSlices = targets
          .filter(
            (target): target is Exclude<ContentPackageNavTarget, { kind: "main" }> =>
              target.kind !== "main",
          )
          .map((target) => {
            const key = contentNavTargetToKey(target);
            const rows = buildPackageTocRowsForUploadHandoff(target, bonusBumpToc[key], project);
            return { key, target, rows };
          });

        for (const slice of packageSlices) {
          const ebookId = packageEbookIds[slice.key];
          if (!ebookId) continue;
          await upsertEbookDraftChaptersFromRows(ebookId, slice.rows);
          if (slice.target.kind === "bump") {
            await confirmOrderBumpIndex(ebookId);
          }
        }

        // 4. Update local state
        setGlobalIndexFrozenAt(now);
        setCurrentPhase("main_chapter");

        const loadedMain = await loadEbookChapters(mainEbookId);
        if (loadedMain.ok) {
          setMainTocRows(loadedMain.rows);
          setTocEntryResolved(true);
        }

        const pkgMap = await fetchPackageEbookIdMap(project.id);
        if (pkgMap.ok) {
          setBumpIndexFrozenAt(pkgMap.bumpIndexFrozenAt);
        }

        for (const slice of packageSlices) {
          const ebookId = packageEbookIds[slice.key];
          if (!ebookId) continue;
          const loaded = await loadEbookChapters(ebookId);
          if (loaded.ok) {
            setBonusBumpToc((p) => ({ ...p, [slice.key]: loaded.rows }));
          }
          if (slice.target.kind === "bump") {
            setBumpTocEntryResolved((p) => ({ ...p, [slice.key]: true }));
          }
        }

        // 5. Load chapter drafts for ContentChapterMilestone
        const draft = await loadEbookChaptersDraft(mainEbookId);
        if (draft.ok) {
          setChapterRows(draft.rows);
          setChapterIdx(0);
          setChapterBodyDraft(draft.rows[0]?.content ?? "");
          setChapterRichTextKey((k) => k + 1);
        }

        void refreshChapterBodyPresence();
        setActionAnnouncement(t("wizard.content.splitProposal.approveSuccess"));
      } finally {
        setUploadHandoffBusy(false);
      }
    },
    [
      project,
      mainEbookId,
      currentPhase,
      uploadHandoffBusy,
      bonusBumpToc,
      packageEbookIds,
      t,
      refreshChapterBodyPresence,
    ],
  );

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
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const, onClick: () => navigate(`/app/projects/${params.projectId ?? ""}/wizard`) },
      { id: 2, label: t("wizard.stepper.content"), status: "active" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "upcoming" as const },
    ],
    [t, navigate, params.projectId],
  );

  const mainTocValidation = validateMainTocForConfirm(mainTocRows);
  const globalIndexReady = useMemo(() => {
    if (!project) return false;
    if (!tocEntryResolved || mainTocValidation !== "ok") return false;
    for (const item of navItems) {
      if (item.target.kind === "main") continue;
      const rows = bonusBumpToc[item.key] ?? [];
      if (validateMainTocForConfirm(rows) !== "ok") return false;
      if (item.target.kind === "bump" && bumpTocEntryResolved[item.key] !== true) return false;
    }
    return true;
  }, [project, tocEntryResolved, mainTocValidation, navItems, bonusBumpToc, bumpTocEntryResolved]);

  const confirmDisabled = !globalIndexReady;

  /** True when every artifact (main + bonuses + bumps) has all its chapters approved. */
  const allArtifactsApproved = useMemo(
    () => navItems.length > 0 && navItems.every((item) => item.tocConfirmed),
    [navItems],
  );

  // ── Content UI phase ─────────────────────────────────────────────────────────
  type ContentUiPhase = "loading" | "intro" | "upload_alignment" | "plan_review" | "generating" | "complete";
  const contentUiPhase = useMemo((): ContentUiPhase => {
    if (loading || !workspaceReady) return "loading";
    if (awaitingContentIntro) return "intro";
    if (currentPhase === "upload_alignment") return "upload_alignment";
    if (currentPhase === "main_index" || currentPhase === null) return "plan_review";
    if (allArtifactsApproved) return "complete";
    return "generating";
  }, [loading, workspaceReady, awaitingContentIntro, currentPhase, allArtifactsApproved]);

  const canApproveArtifact = !artifactApproveLoading && !autoGenerating && chapterRows.length > 0;

  const confirmVisible =
    effectiveContentIntroDone &&
    !needsUploadAlignment &&
    !Boolean(globalIndexFrozenAt) &&
    currentPhase === "main_index" &&
    project?.content_source === "ai";

  const tocReadOnly =
    (selectedTarget.kind === "main" &&
      (awaitingContentIntro || needsUploadAlignment || indexFrozen || !workspaceReady)) ||
    (selectedTarget.kind === "bonus" &&
      (awaitingContentIntro || needsUploadAlignment || indexFrozen || !workspaceReady)) ||
    (selectedTarget.kind === "bump" &&
      (awaitingContentIntro || needsUploadAlignment || Boolean(bumpIndexFrozenAt[selectedKey]) || !workspaceReady));

  const showMainTocEmptyChoice =
    (selectedTarget.kind === "main" &&
      !awaitingContentIntro &&
      !needsUploadAlignment &&
      !indexFrozen &&
      currentPhase === "main_index" &&
      workspaceReady &&
      !tocReadOnly &&
      !tocEntryResolved) ||
    (selectedTarget.kind === "bump" &&
      !awaitingContentIntro &&
      !needsUploadAlignment &&
      workspaceReady &&
      !Boolean(bumpIndexFrozenAt[selectedKey]) &&
      bumpTocEntryResolved[selectedKey] === false);

  const regenerateDisabledMain =
    awaitingContentIntro ||
    needsUploadAlignment ||
    indexFrozen ||
    !workspaceReady ||
    generateLoading ||
    project?.content_source !== "ai";

  const regenerateDisabledBump =
    awaitingContentIntro ||
    needsUploadAlignment ||
    Boolean(bumpIndexFrozenAt[selectedKey]) ||
    !workspaceReady ||
    generateLoading ||
    project?.content_source !== "ai";

  const regenerateDisabledBonus =
    awaitingContentIntro ||
    needsUploadAlignment ||
    indexFrozen ||
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

  const chapterProgressValue = useMemo(
    () => chapterRows.filter((ch) => Boolean(ch.approved_at)).length,
    [chapterRows],
  );

  const handleEditIndexFromFooter = useCallback(async () => {
    if (!project?.id) return;
    const persisted = await persistCurrentChapterDraftIfDirty();
    if (!persisted) return;
    setActionAnnouncement(null);
    const reopened = await reopenGlobalIndex(project.id);
    if (!reopened.ok) {
      const key = "wizard.content.index.errorReopenIndex";
      setActionAnnouncement(t(key));
      toastApiFailure(t, key);
      return;
    }
    setGlobalIndexFrozenAt(null);
    setCurrentPhase("main_index");
    setBumpIndexFrozenAt((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) next[key] = null;
      return next;
    });
    setActionAnnouncement(t("wizard.content.index.reopenIndexSuccess"));
  }, [project?.id, persistCurrentChapterDraftIfDirty, t]);

  // ── Tab selection ─────────────────────────────────────────────────────────────
  const handleTabSelect = useCallback(
    (key: string) => {
      void handleSelectPackageKey(key);
    },
    [handleSelectPackageKey],
  );

  // ── Auto-generate all chapters for current artifact ───────────────────────────
  const handleGenerateAllChapters = useCallback(async () => {
    if (!project?.id) return;
    if (autoGenerating) {
      autoGenerateAbortRef.current = true;
      return;
    }
    autoGenerateAbortRef.current = false;
    setAutoGenerating(true);
    setInsufficientCreditsToastOpen(false);
    setInsufficientCreditsSource("chapter");

    const snapshot = [...chapterRows];
    for (let i = 0; i < snapshot.length; i++) {
      if (autoGenerateAbortRef.current) break;
      const ch = snapshot[i]!;
      if (!isChapterHtmlEffectivelyEmpty(ch.content ?? "")) continue;
      setChapterIdx(i);
      const opKey = `autogen:${ch.id}`;
      const clientRequestId = retryIds.current.getOrCreate(opKey);
      setChapterGenerateLoading(true);
      const result = await invokeGenerateChapterContent(project.id, ch.id, clientRequestId);
      setChapterGenerateLoading(false);
      if (autoGenerateAbortRef.current) break;
      if (!result.ok) {
        if (result.code === "insufficient_credits") {
          setInsufficientCreditsToastOpen(true);
          toastInsufficientCredits(t, "wizard.content.chapters.errorInsufficientCredits");
          break;
        }
        continue;
      }
      retryIds.current.clear(opKey);
      await updateChapterDraftContent(ch.id, result.content);
      setChapterBodyDraft(result.content);
      setChapterRichTextKey((k) => k + 1);
      snapshot[i] = { ...ch, content: result.content, approved_at: null };
      setChapterRows((rows) =>
        rows.map((r) => (r.id === ch.id ? { ...r, content: result.content, approved_at: null } : r)),
      );
    }

    setAutoGenerating(false);
    setChapterGenerateLoading(false);
    autoGenerateAbortRef.current = false;
  }, [project?.id, chapterRows, autoGenerating, t]);

  // ── Approve all chapters in the current artifact ──────────────────────────────
  const handleApproveArtifact = useCallback(async () => {
    if (!selectedEbookId) return;
    const saved = await persistCurrentChapterDraftIfDirty();
    if (!saved) return;

    setArtifactApproveLoading(true);
    const draft = await loadEbookChaptersDraft(selectedEbookId);
    if (!draft.ok) {
      setArtifactApproveLoading(false);
      toastApiFailure(t, "wizard.content.chapters.errorApprove");
      return;
    }

    for (const ch of draft.rows) {
      if (ch.approved_at) continue;
      const res = await approveChapterBody(ch.id);
      if (!res.ok) {
        setArtifactApproveLoading(false);
        toastApiFailure(t, "wizard.content.chapters.errorApprove");
        return;
      }
    }

    const now = new Date().toISOString();
    setChapterRows(draft.rows.map((r) => ({ ...r, approved_at: now })));

    // Build updated approvals locally — stale closure can't be used here
    const updatedApprovals = { ...artifactApprovedByKey, [selectedKey]: true };
    setArtifactApprovedByKey(updatedApprovals);
    setArtifactApproveLoading(false);
    toast.success({ title: t("wizard.content.generating.artifactApproved") });

    // Advance to next unapproved artifact using locally-updated map
    const currentIdx = navItems.findIndex((item) => item.key === selectedKey);
    const nextUnapproved = navItems.find((item, idx) => idx > currentIdx && !updatedApprovals[item.key]);
    if (nextUnapproved) {
      setSelectedKey(nextUnapproved.key);
    }
  }, [selectedEbookId, persistCurrentChapterDraftIfDirty, selectedKey, navItems, artifactApprovedByKey, t]);

  const handleBackFromGenerating = useCallback(() => {
    setBackWarningOpen(true);
  }, []);

  const handleConfirmBackToIndex = useCallback(async () => {
    setBackWarningOpen(false);
    autoGenerateAbortRef.current = true;
    await handleEditIndexFromFooter();
  }, [handleEditIndexFromFooter]);

  if (!params.projectId) {
    return null;
  }

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

      <div className="shrink-0 bg-obra-blue-900 px-8 pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div
            role="progressbar"
            aria-valuenow={contentInnerStepCurrent}
            aria-valuemin={1}
            aria-valuemax={contentInnerStepTotal}
            aria-label={contentInnerStepLabel}
            className="flex items-center gap-1"
          >
            {Array.from({ length: contentInnerStepTotal }).map((_, index) => (
              <div
                key={index}
                className={`h-1 w-6 rounded-full transition-all ${
                  index < contentInnerStepCurrent ? "bg-obra-green-400" : "bg-white/20"
                }`}
              />
            ))}
          </div>
          <span className="text-xs font-medium text-white">{contentInnerStepLabel}</span>
        </div>
      </div>

      {/* ── Artifact tab bar ───────────────────────────────────────────────── */}
      {(contentUiPhase === "plan_review" || contentUiPhase === "generating" || contentUiPhase === "complete") &&
        navItems.length > 0 && (
          <ContentArtifactTabs
            tabs={navItems}
            selectedKey={selectedKey}
            onSelect={handleTabSelect}
            approvedByKey={contentUiPhase !== "plan_review" ? artifactApprovedByKey : undefined}
          />
        )}

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">

        {/* Loading / error states */}
        {contentUiPhase === "loading" ? (
          <div className="flex flex-1 items-center justify-center">
            <ObraSpinner size="lg" className="py-16" />
          </div>
        ) : null}
        {error ? (
          <div className="px-8 pt-6">
            <ObraAlert variant="error" title={error} className="mb-4" />
          </div>
        ) : null}
        {workspaceError ? (
          <div className="px-8 pt-6">
            <ObraAlert variant="error" title={workspaceError} className="mb-4" />
          </div>
        ) : null}

        {/* ── Intro: choose content source ───────────────────────────────── */}
        {contentUiPhase === "intro" && project ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto py-4">
            <div className="w-ful px-8 py-10">
              <ContentSourceIntroPanel
                t={t}
                contentSource={project.content_source}
                onSelectSource={handleIntroContentSourceSelect}
                selectDisabled={introSourceBusy}
              />
            </div>
          </div>
        ) : null}

        {/* ── Upload alignment ───────────────────────────────────────────── */}
        {contentUiPhase === "upload_alignment" && project ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <div className="w-full bg-white px-8 py-10">
              <div className="space-y-4">
                {!manuscriptCommitted && (
                  <div className="rounded-card border border-obra-neutral-200 bg-white px-4 py-6">
                    <ManuscriptUploadPanel
                      t={t}
                      projectId={project.id}
                      initialManuscript={manuscriptRow}
                      onManuscriptCommitted={(row) => {
                        setManuscriptRow(row);
                        if ((row.extracted_char_count ?? 0) > 0) {
                          setManuscriptCommitted(true);
                          toast.success({
                            title: t("wizard.content.manuscript.uploadedToast"),
                            description: t("wizard.content.manuscript.uploadedToastDescription"),
                          });
                        }
                      }}
                    />
                  </div>
                )}
                {manuscriptCommitted && manuscriptRow?.extracted_char_count != null && manuscriptRow.extracted_char_count > 0 ? (
                  <ContentUploadAlignmentPanel
                    t={t}
                    projectId={project.id}
                    onApprove={handleAlignmentApproved}
                    approvalBusy={uploadHandoffBusy}
                    autoStart
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Plan review: tab-driven index editing ──────────────────────── */}
        {contentUiPhase === "plan_review" && project ? (
          <div className="flex min-h-0 flex-1 overflow-y-auto">
            <div className="w-full bg-white px-8 py-10">
              
              <div className="mx-auto w-full max-w-2xl">
                {!bannerDismissed ? (
                <ObraAlert
                  variant="info"
                  title={t("wizard.content.banner.body")}
                  onDismiss={dismissBanner}
                  dismissLabel={t("wizard.content.banner.dismiss")}
                  className="mb-6"
                />
              ) : null}
              
                <ContentIndexMilestone
                  t={t}
                  selectedTarget={selectedTarget}
                  panelTitle={panelCopy.title}
                  panelSubtitle={panelCopy.subtitle}
                  tocRows={currentTocRows}
                  onChangeToc={setCurrentToc}
                  onRegenerateOutline={() => {
                    if (selectedTarget.kind === "main") void handleRegenerateMainOutline();
                    else if (selectedTarget.kind === "bump") void handleRegenerateBumpOutline();
                    else void handleRegenerateBonusOutline();
                  }}
                  regenerateDisabled={
                    selectedTarget.kind === "main"
                      ? regenerateDisabledMain
                      : selectedTarget.kind === "bump"
                        ? regenerateDisabledBump
                        : regenerateDisabledBonus
                  }
                  regenerateLoading={generateLoading}
                  tocReadOnly={tocReadOnly}
                  actionAnnouncement={actionAnnouncement}
                  showMainTocEmptyChoice={showMainTocEmptyChoice}
                  mainTocEmptyShowGenerate={project.content_source === "ai"}
                  onMainTocChooseManual={handleEmptyTocChooseManual}
                  onMainTocChooseGenerate={() => {
                    if (selectedTarget.kind === "main") void handleRegenerateMainOutline();
                    else if (selectedTarget.kind === "bump") void handleRegenerateBumpOutline();
                    else void handleRegenerateBonusOutline();
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

        {/* ── Generating / complete: chapter editing per artifact ────────── */}
        {(contentUiPhase === "generating" || contentUiPhase === "complete") && project ? (
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <ContentChapterNav
              t={t}
              chapters={chapterRows}
              selectedIndex={chapterIdx}
              onSelectChapterIndex={(i) => void handleSelectChapterIndex(i)}
              generateLoading={chapterGenerateLoading || autoGenerating}
              title={navItems.find((item) => item.key === selectedKey)?.navTitle}
              onGenerateAll={project.content_source === "ai" ? () => void handleGenerateAllChapters() : undefined}
              generateAllLoading={autoGenerating}
            />
            <div className="flex min-h-0 min-w-0 flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="w-full min-h-full bg-white px-8 py-10">
                  {/* Complete banner */}
                  {contentUiPhase === "complete" && (
                    <div className="mb-5 rounded-lg border border-obra-green-300 bg-obra-green-50 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 shrink-0 text-obra-green-600" aria-hidden />
                        <p className="text-sm font-medium text-obra-green-700">
                          {t("wizard.content.generating.allDone")}
                        </p>
                      </div>
                    </div>
                  )}

                  <ContentChapterMilestone
                    t={t}
                    panelTitle={chapterPanelCopy.title}
                    chapters={chapterRows}
                    selectedIndex={chapterIdx}
                    bodyValue={chapterBodyDraft}
                    onBodyChange={setChapterBodyDraft}
                    onGenerate={() => void handleGenerateChapter()}
                    onApprove={() => void handleApproveChapter()}
                    generateLoading={chapterGenerateLoading}
                    approveLoading={chapterApproveLoading}
                    richTextResetKey={chapterRichTextKey}
                    progressValue={chapterProgressValue}
                    progressMax={Math.max(chapterRows.length, 1)}
                    showAiGenerateButton={project.content_source === "ai"}
                    successMessage={chapterSuccessMessage}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="w-full shrink-0 border-t border-obra-blue-100 bg-white px-4 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex w-full min-w-0 items-center justify-between">
          {/* Left: back button */}
          {contentUiPhase === "generating" || contentUiPhase === "complete" ? (
            <Button type="button" variant="tertiary" onClick={handleBackFromGenerating}>
              <ChevronLeft className="size-4" aria-hidden />
              {t("wizard.content.index.reopenIndex")}
            </Button>
          ) : (
            <Button
              type="button"
              variant="tertiary"
              onClick={() =>
                contentUiPhase === "intro"
                  ? navigate("/app/dashboard")
                  : navigate(`/app/projects/${params.projectId ?? ""}/wizard`)
              }
            >
              <ChevronLeft className="size-4" aria-hidden />
              {t("wizard.content.footer.backToStructure")}
            </Button>
          )}

          {/* Right: primary action */}
          {contentUiPhase === "intro" ? (
            <Button type="button" variant="primary" onClick={handleContentIntroContinue}>
              {t("wizard.content.sourceIntro.continue")}
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : contentUiPhase === "upload_alignment" ? null
          : contentUiPhase === "plan_review" ? (
            <Button
              type="button"
              variant="primary"
              disabled={!confirmVisible || confirmDisabled || confirmLoading}
              onClick={() => void handleConfirmGlobalIndex()}
            >
              {confirmLoading ? t("wizard.content.index.confirmLoading") : t("wizard.content.planReview.confirm")}
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : contentUiPhase === "complete" ? (
            <Button
              type="button"
              variant="primary"
              onClick={() => void navigate(`/app/projects/${params.projectId ?? ""}/preview`)}
            >
              {t("wizard.content.footer.goToPreview")}
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : contentUiPhase === "generating" ? (
            <Button
              type="button"
              variant="primary"
              disabled={!canApproveArtifact}
              onClick={() => void handleApproveArtifact()}
            >
              {artifactApproveLoading
                ? t("wizard.content.generating.approveArtifactLoading")
                : t("wizard.content.generating.approveArtifact")}
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Title-change modal ─────────────────────────────────────────────── */}
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

      {/* ── Back-to-index warning modal ────────────────────────────────────── */}
      <Modal
        open={backWarningOpen}
        onClose={() => setBackWarningOpen(false)}
        closeLabel={t("wizard.content.generating.backWarningCancel")}
      >
        <ModalHead>
          <ModalTitle>{t("wizard.content.generating.backWarningTitle")}</ModalTitle>
          <ModalSubtitle>{t("wizard.content.generating.backWarningBody")}</ModalSubtitle>
        </ModalHead>
        <ModalFooter className="justify-end">
          <Button type="button" variant="tertiary" size="medium" onClick={() => setBackWarningOpen(false)}>
            {t("wizard.content.generating.backWarningCancel")}
          </Button>
          <Button type="button" variant="primary" size="medium" onClick={() => void handleConfirmBackToIndex()}>
            {t("wizard.content.generating.backWarningConfirm")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Insufficient credits toast ─────────────────────────────────────── */}
      {insufficientCreditsToastOpen ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex justify-center px-4 sm:bottom-8">
          <div className="pointer-events-auto w-full max-w-toast">
            <ObraToast
              variant="error"
              title={t("toast.api.insufficientCreditsTitle")}
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
