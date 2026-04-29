import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, FileDown, Package, RefreshCw, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { ObraLoadingOverlay, ObraSpinner } from "@/components/obra/ObraSpinner";
import { ObraShellGeneratingOverlay } from "@/components/obra/ObraShellGeneratingOverlay";
import { ObraAlert } from "@/components/obra/ObraAlert";
import { ContentChapterNav } from "@/components/wizard/content/ContentChapterMilestone";
import { ContentArtifactTabs } from "@/components/wizard/content/ContentArtifactTabs";
import { ExportPdfModal } from "@/components/wizard/ExportPdfModal";
import { ExportZipModal } from "@/components/wizard/ExportZipModal";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import {
  generateImage,
  getSignedImageUrl,
  loadProjectImages,
  removeImage,
  uploadImage,
  type ImageSlotStatus,
  type ProjectImageRow,
} from "@/lib/preview/imageSlotApi";
import { fetchOrGenerateShell, regenerateShell, hashChapters, type ShellMeta, type ShellProgress } from "@/lib/preview/documentShellApi";
import { injectAll, isSlotMessage } from "@/lib/preview/injectAll";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { queuePdfExport, downloadPdf, getErrorMessage } from "@/utils/pdf-export";
import { supabase } from "@/lib/supabaseClient";

type EbookRow = {
  id: string;
  title: string | null;
  type: "main" | "bonus" | "order_bump";
  package_ordinal: number;
};

/**
 * Stable key for imageSlots state.
 * - Cover: "cover_art"
 * - New chapter slots (slot_key = "chapter-N-image-1"): "{ebookId}:chapter-N-image-1"
 * - Legacy hero rows (slot_key = "hero"): "{ebookId}:{chapterId}:hero"
 */
function rowSlotKey(row: ProjectImageRow): string {
  return compositeSlotKey(row.slot_key, row.ebook_id ?? undefined, row.chapter_id ?? undefined);
}

/**
 * Builds the same composite key from raw DB field values (used after upload/generate
 * so handlers stay consistent with keys produced by rowSlotKey on initial load).
 */
function compositeSlotKey(dbSlotKey: string, ebookId: string | undefined, chapterId: string | undefined): string {
  if (dbSlotKey === "cover_art" && !ebookId && !chapterId) return "cover_art";
  // Legacy rows stored with slot_key="hero" before the chapter-N-image-1 migration
  if (dbSlotKey === "hero" && ebookId && chapterId) return `${ebookId}:${chapterId}:hero`;
  // New chapter slots: slot_key is already the html_shell key (e.g. "chapter-1-image-1")
  if (ebookId) return `${ebookId}:${dbSlotKey}`;
  return dbSlotKey;
}

function chaptersSortedByOrder(chapters: ChapterDraftRow[]): ChapterDraftRow[] {
  return [...chapters].sort((a, b) => a.sort_order - b.sort_order);
}

async function loadProjectEbooks(projectId: string): Promise<{ ok: true; rows: EbookRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("ebooks")
    .select("id, title, type, package_ordinal")
    .eq("project_id", projectId)
    .order("package_ordinal", { ascending: true });

  if (error || !data) return { ok: false };
  return {
    ok: true,
    rows: (data as EbookRow[]).sort((a, b) => {
      const order = { main: 0, bonus: 1, order_bump: 2 } as const;
      if (a.type !== b.type) return order[a.type] - order[b.type];
      return a.package_ordinal - b.package_ordinal;
    }),
  };
}

async function loadEbookChaptersDraft(
  ebookId: string,
): Promise<{ ok: true; rows: ChapterDraftRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, sort_order, content, approved_at")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return { ok: false };
  const rows: ChapterDraftRow[] = (data as {
    id: string;
    title: string;
    sort_order: number;
    content: string | null;
    approved_at: string | null;
  }[]).map((row) => ({
    id: row.id,
    title: row.title,
    sort_order: Number(row.sort_order) || 0,
    content: row.content ?? null,
    approved_at: row.approved_at ?? null,
  }));
  return { ok: true, rows };
}

export function WizardPreviewPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ projectId: string }>();

  const { project, loading: projectLoading, error: projectError } = useWizardStructureProject(
    params.projectId,
    t("wizard.preview.error.load"),
  );

  const globalSteps = useMemo(
    () => [
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const, onClick: () => navigate(`/app/projects/${params.projectId ?? ""}/wizard`) },
      { id: 2, label: t("wizard.stepper.content"), status: "completed" as const, onClick: () => navigate(`/app/projects/${params.projectId ?? ""}/content`) },
      { id: 3, label: t("wizard.stepper.preview"), status: "active" as const },
    ],
    [t, navigate, params.projectId],
  );

  const [ebooks, setEbooks] = useState<EbookRow[]>([]);
  const [ebooksLoading, setEbooksLoading] = useState(false);
  const [ebooksError, setEbooksError] = useState<string | null>(null);

  /** Only deliverables configured on the project (avoids stale extra ebook rows in the nav). */
  const visibleEbooks = useMemo(() => {
    if (!project) return ebooks;
    const bonusN = Math.max(0, Math.floor(Number(project.bonus_count) || 0));
    const bumpN = Math.max(0, Math.floor(Number(project.bump_count) || 0));
    return ebooks.filter((e) => {
      if (e.type === "main") return true;
      if (e.type === "bonus") return e.package_ordinal >= 0 && e.package_ordinal < bonusN;
      if (e.type === "order_bump") return e.package_ordinal >= 0 && e.package_ordinal < bumpN;
      return false;
    });
  }, [ebooks, project]);

  const [selectedEbookId, setSelectedEbookId] = useState<string | null>(null);
  const [chaptersCache, setChaptersCache] = useState<Record<string, ChapterDraftRow[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // ebookId → signed PDF URL for the most recent completed export
  const [ebookPdfUrls, setEbookPdfUrls] = useState<Record<string, string>>({});

  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [publishStatus, setPublishStatus] = useState<"draft" | "published" | "modified">("draft");

  // Image slots state: slotKey → { status, url }
  const [imageSlots, setImageSlots] = useState<Record<string, { status: ImageSlotStatus; url: string | null }>>({});

  // AI generate modal state
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generateModalSlotKey, setGenerateModalSlotKey] = useState<string | null>(null);
  const [generateInstruction, setGenerateInstruction] = useState("");
  const [generateBusy, setGenerateBusy] = useState(false);

  // HTML shell state per ebook id
  const [shellCache, setShellCache] = useState<Record<string, { html: string; meta: ShellMeta }>>({});
  /**
   * In-flight shell requests per ebook (refcount). Overlapping calls (e.g. effect + regenerate, or 409
   * while the first generation still runs) must not clear loading until every request for that id ends.
   */
  const [shellInflightByEbook, setShellInflightByEbook] = useState<Record<string, number>>({});
  const [shellProgressByEbook, setShellProgressByEbook] = useState<Record<string, ShellProgress>>({});
  const beginShellInflight = useCallback((ebookId: string) => {
    setShellInflightByEbook((prev) => ({ ...prev, [ebookId]: (prev[ebookId] ?? 0) + 1 }));
  }, []);
  const endShellInflight = useCallback((ebookId: string) => {
    setShellInflightByEbook((prev) => {
      const next = (prev[ebookId] ?? 0) - 1;
      if (next <= 0) {
        const { [ebookId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [ebookId]: next };
    });
  }, []);
  const [shellError, setShellError] = useState<string | null>(null);
  const selectedEbookIdRef = useRef<string | null>(null);
  selectedEbookIdRef.current = selectedEbookId;
  /** Tracks ebook IDs for which shell generation has already been started, preventing duplicate
   * concurrent invocations when the shell effect re-fires due to React state updates. */
  const shellGenerationStartedRef = useRef(new Set<string>());
  /** True when current chapters count/page config differs from what the shell was generated with */
  const [shellStale, setShellStale] = useState(false);

  // Redirect if the project is archived or in trash — read-only, editing not allowed.
  useEffect(() => {
    if (!projectLoading && project && project.lifecycle_status !== "active") {
      navigate("/app/dashboard", { replace: true });
    }
  }, [projectLoading, project, navigate]);

  // Load ebooks + publish_status once project is ready
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;

    async function load() {
      setEbooksLoading(true);
      setEbooksError(null);
      const [ebooksResult, projectStatusResult] = await Promise.all([
        loadProjectEbooks(project!.id),
        supabase
          .from("projects")
          .select("publish_status")
          .eq("id", project!.id)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      if (!ebooksResult.ok) {
        setEbooksError(t("wizard.preview.error.load"));
      } else {
        setEbooks(ebooksResult.rows);
        if (ebooksResult.rows.length > 0 && !selectedEbookId) {
          setSelectedEbookId(ebooksResult.rows[0].id);
        }
      }
      const status = (projectStatusResult.data as { publish_status?: string } | null)?.publish_status;
      if (status === "published" || status === "modified" || status === "draft") {
        setPublishStatus(status);
      }

      // Load latest completed PDF URL per ebook
      const { data: completedJobs } = await supabase
        .from("pdf_export_jobs")
        .select("ebook_id, storage_path")
        .eq("project_id", project!.id)
        .eq("status", "completed")
        .not("storage_path", "is", null)
        .order("completed_at", { ascending: false });
      if (!cancelled && completedJobs?.length) {
        const urls: Record<string, string> = {};
        const seen = new Set<string>();
        for (const job of completedJobs as { ebook_id: string | null; storage_path: string | null }[]) {
          if (!job.ebook_id || !job.storage_path || seen.has(job.ebook_id)) continue;
          seen.add(job.ebook_id);
          const { data: signed } = await supabase.storage
            .from("project-pdfs")
            .createSignedUrl(job.storage_path, 3600);
          if (signed?.signedUrl) urls[job.ebook_id] = signed.signedUrl;
        }
        if (!cancelled) setEbookPdfUrls(urls);
      }

      setEbooksLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [project?.id, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load chapters for ALL visible ebooks in parallel on first visit
  useEffect(() => {
    const missing = visibleEbooks.filter((e) => chaptersCache[e.id] === undefined);
    if (missing.length === 0) return;
    let cancelled = false;

    async function loadAll() {
      setChaptersLoading(true);
      const pairs = await Promise.all(
        missing.map(async (e) => ({ id: e.id, result: await loadEbookChaptersDraft(e.id) })),
      );
      if (cancelled) return;
      const updates: Record<string, ChapterDraftRow[]> = {};
      for (const { id, result } of pairs) {
        if (result.ok) updates[id] = result.rows;
      }
      setChaptersCache((prev) => ({ ...prev, ...updates }));
      setChaptersLoading(false);
    }

    void loadAll();
    return () => {
      cancelled = true;
    };
  }, [visibleEbooks]); // eslint-disable-line react-hooks/exhaustive-deps

  const markModified = useCallback((ebookId?: string) => {
    setPublishStatus((prev) => (prev === "published" ? "modified" : prev));
    // Clear the cached PDF URL for this ebook and reset the export job so the modal remounts fresh.
    if (ebookId) setEbookPdfUrls((prev) => { const { [ebookId]: _, ...rest } = prev; return rest; });
    setExportJobId(null);
    if (project?.id) {
      void supabase
        .from("projects")
        .update({ publish_status: "modified" })
        .eq("id", project.id)
        .then(({ error }) => { if (error) console.error("mark_modified_error", error); });
    }
  }, [project?.id]);

  // Generate shells for ALL ebooks with chapters simultaneously; tab switches reuse the cache
  useEffect(() => {
    if (!project?.id) return;

    // Staleness check for the currently selected ebook (UI state only, no generation)
    if (selectedEbookId && shellCache[selectedEbookId]) {
      const meta = shellCache[selectedEbookId]!.meta;
      const chapters = chaptersCache[selectedEbookId];
      if (chapters && chapters.length > 0) {
        const dc = (project.design_config ?? {}) as Record<string, unknown>;
        const page = (dc.page as { size: string; orientation: string } | null) ?? { size: "a4", orientation: "portrait" };
        const contentHash = hashChapters(chapters);
        const stale =
          meta.chapter_count !== chapters.length ||
          meta.page_size !== page.size ||
          meta.page_orientation !== page.orientation ||
          meta.content_hash !== contentHash;
        setShellStale(stale);
      }
    }

    const dc = (project.design_config ?? {}) as Record<string, unknown>;
    const page = (dc.page as { size: string; orientation: string } | null) ?? { size: "a4", orientation: "portrait" };

    // Collect ebooks that need generation (chapters ready, no cached shell, not already started)
    const toGenerate = visibleEbooks.filter((e) => {
      const chapters = chaptersCache[e.id];
      return (
        chapters &&
        chapters.length > 0 &&
        !shellCache[e.id] &&
        !shellGenerationStartedRef.current.has(e.id)
      );
    });

    if (toGenerate.length === 0) return;

    let unmounted = false;
    setShellError(null);

    for (const ebook of toGenerate) {
      const ebookId = ebook.id;
      shellGenerationStartedRef.current.add(ebookId);
      beginShellInflight(ebookId);
      setShellProgressByEbook((prev) => { const { [ebookId]: _, ...rest } = prev; return rest; });

      const chapters = chaptersCache[ebookId]!;

      void fetchOrGenerateShell({
        projectId: project.id,
        ebookId,
        currentChapterCount: chapters.length,
        currentPageSize: page.size,
        currentPageOrientation: page.orientation,
        currentContentHash: hashChapters(chapters),
        onProgress: (p) => setShellProgressByEbook((prev) => ({ ...prev, [ebookId]: p })),
      }).then((result) => {
        if (unmounted) {
          endShellInflight(ebookId);
          return;
        }
        if (result.ok) {
          setShellCache((prev) => ({
            ...prev,
            [ebookId]: { html: result.htmlShell, meta: result.shellMeta },
          }));
          if (selectedEbookIdRef.current === ebookId) setShellStale(result.stale);
          // Shell had to be regenerated (not served from cache) → content changed since last export.
          // Mark the project as modified so the stale PDF URL is cleared and Download PDF is hidden.
          if (!result.cached) markModified(ebookId);
        } else if (result.error !== "generation_in_progress") {
          // Allow retry on error so the effect can restart generation if triggered again
          shellGenerationStartedRef.current.delete(ebookId);
          if (selectedEbookIdRef.current === ebookId) setShellError(result.error);
        }
        endShellInflight(ebookId);
      });
    }

    return () => { unmounted = true; };
  }, [project, visibleEbooks, selectedEbookId, chaptersCache, shellCache, beginShellInflight, endShellInflight, markModified]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleExportSuccess = useCallback((pdfUrl: string) => {
    if (!selectedEbookId) return;
    setEbookPdfUrls((prev) => ({ ...prev, [selectedEbookId]: pdfUrl }));
  }, [selectedEbookId]);

  const handleRegenerateShell = useCallback(async () => {
    if (!project?.id || !selectedEbookId) return;
    const ebookId = selectedEbookId;
    beginShellInflight(ebookId);
    setShellError(null);
    setShellProgressByEbook((prev) => { const { [ebookId]: _, ...rest } = prev; return rest; });
    const result = await regenerateShell({
      projectId: project.id,
      ebookId,
      onProgress: (p) => setShellProgressByEbook((prev) => ({ ...prev, [ebookId]: p })),
    });
    if (selectedEbookIdRef.current !== ebookId) {
      endShellInflight(ebookId);
      return;
    }
    if (result.ok) {
      setShellCache((prev) => ({
        ...prev,
        [ebookId]: { html: result.htmlShell, meta: result.shellMeta },
      }));
      setShellStale(false);
      markModified(ebookId);
    } else if (result.error !== "generation_in_progress") {
      setShellError(result.error);
    }
    endShellInflight(ebookId);
  }, [project?.id, selectedEbookId, beginShellInflight, endShellInflight, markModified]);

  // Load existing image slots when project is loaded
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    async function load() {
      const result = await loadProjectImages(project!.id);
      if (cancelled || !result.ok) return;
      const slots: Record<string, { status: ImageSlotStatus; url: string | null }> = {};
      for (const row of result.rows) {
        const key = rowSlotKey(row);
        const url = row.storage_path && row.status === "done"
          ? await getSignedImageUrl(row.storage_path)
          : null;
        slots[key] = { status: row.status, url };
      }
      if (!cancelled) setImageSlots(slots);
    }
    void load();
    return () => { cancelled = true; };
  }, [project?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // If counts shrank or rows are stale, keep selection on a visible deliverable.
  useEffect(() => {
    if (visibleEbooks.length === 0) return;
    const stillThere = selectedEbookId && visibleEbooks.some((e) => e.id === selectedEbookId);
    if (!stillThere) {
      setSelectedEbookId(visibleEbooks[0]!.id);
    }
  }, [visibleEbooks, selectedEbookId]);

  const handleSelectEbook = useCallback((id: string) => {
    setSelectedEbookId(id);
    setSelectedPreviewChapterIdx(0);
    setShellError(null);
  }, []);

  const [selectedPreviewChapterIdx, setSelectedPreviewChapterIdx] = useState(0);
  const previewScrollRef = useRef<HTMLDivElement>(null);

  const handleSelectPreviewChapter = useCallback((index: number) => {
    setSelectedPreviewChapterIdx(index);
    const chapters = selectedEbookId ? chaptersCache[selectedEbookId] ?? [] : [];
    const chapter = chapters[index];
    if (!chapter || !previewScrollRef.current) return;
    const el = previewScrollRef.current.querySelector(`#chapter-${chapter.id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedEbookId, chaptersCache]);

  /**
   * Maps shell `data-slot-key` ("cover", "chapter-N-image-1") to DB slot_key + ids
   * for uploadImage / generateImage (hero slots require ebook + chapter).
   */
  const resolveSlotArgs = useCallback(
    (htmlSlotKey: string) => {
      if (htmlSlotKey === "cover") {
        return {
          dbSlotKey: "cover_art" as const,
          ebookId: undefined as string | undefined,
          chapterId: undefined as string | undefined,
        };
      }
      // Also handle legacy format "chapter-N-img" generated by older prompt templates
      const normalizedSlotKey = /^chapter-(\d+)-img$/.test(htmlSlotKey)
        ? htmlSlotKey.replace(/^(chapter-\d+)-img$/, "$1-image-1")
        : htmlSlotKey;
      const m = /^chapter-(\d+)-image-1$/.exec(normalizedSlotKey);
      if (!m || !selectedEbookId) {
        return {
          dbSlotKey: htmlSlotKey,
          ebookId: selectedEbookId ?? undefined,
          chapterId: undefined as string | undefined,
        };
      }
      const n = Number.parseInt(m[1]!, 10);
      const sorted = chaptersSortedByOrder(chaptersCache[selectedEbookId] ?? []);
      const chapter = Number.isFinite(n) && n >= 1 ? sorted[n - 1] : undefined;
      return {
        dbSlotKey: normalizedSlotKey,
        ebookId: selectedEbookId,
        chapterId: chapter?.id,
      };
    },
    [selectedEbookId, chaptersCache],
  );

  const handleSlotUpload = useCallback(async (htmlSlotKey: string, file: File) => {
    if (!project?.id) return;
    const { dbSlotKey, ebookId, chapterId } = resolveSlotArgs(htmlSlotKey);
    const cKey = compositeSlotKey(dbSlotKey, ebookId, chapterId);
    if (dbSlotKey !== "cover_art" && (!ebookId || !chapterId)) {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "error", url: prev[cKey]?.url ?? null } }));
      return;
    }
    setImageSlots((prev) => ({ ...prev, [cKey]: { status: "generating", url: prev[cKey]?.url ?? null } }));
    const result = await uploadImage({ projectId: project.id, slotKey: dbSlotKey, file, ebookId, chapterId });
    if (result.ok) {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "done", url: result.signedUrl } }));
      markModified(ebookId);
    } else {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "error", url: prev[cKey]?.url ?? null } }));
    }
  }, [project?.id, resolveSlotArgs, markModified]);

  const handleSlotGenerate = useCallback(async (htmlSlotKey: string, instruction?: string) => {
    if (!project?.id) return;
    const { dbSlotKey, ebookId, chapterId } = resolveSlotArgs(htmlSlotKey);
    const cKey = compositeSlotKey(dbSlotKey, ebookId, chapterId);
    if (dbSlotKey !== "cover_art" && (!ebookId || !chapterId)) {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "error", url: prev[cKey]?.url ?? null } }));
      return;
    }
    setImageSlots((prev) => ({ ...prev, [cKey]: { status: "generating", url: prev[cKey]?.url ?? null } }));
    const result = await generateImage({
      projectId: project.id,
      slotKey: dbSlotKey,
      ebookId,
      chapterId,
      instruction,
    });
    if (result.ok) {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "done", url: result.signedUrl ?? null } }));
      markModified(ebookId);
    } else {
      setImageSlots((prev) => ({ ...prev, [cKey]: { status: "error", url: prev[cKey]?.url ?? null } }));
    }
  }, [project?.id, resolveSlotArgs, markModified]);

  const handleSlotRemove = useCallback((htmlSlotKey: string) => {
    if (!project?.id) return;
    const { dbSlotKey, ebookId, chapterId } = resolveSlotArgs(htmlSlotKey);
    const cKey = compositeSlotKey(dbSlotKey, ebookId, chapterId);
    setImageSlots((prev) => {
      const next = { ...prev };
      delete next[cKey];
      return next;
    });
    markModified(ebookId);
    void removeImage({ projectId: project.id, slotKey: dbSlotKey, ebookId, chapterId });
  }, [project?.id, resolveSlotArgs, markModified]);

  // postMessage listener — receives slot actions from the preview iframe
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (!isSlotMessage(event.data)) return;
      const msg = event.data;
      switch (msg.type) {
        case "obra:slot:file": {
          // Convert dataUrl → File and upload
          void (async () => {
            const res = await fetch(msg.dataUrl);
            const blob = await res.blob();
            const file = new File([blob], msg.fileName, { type: msg.mimeType });
            await handleSlotUpload(msg.slotKey, file);
          })();
          break;
        }
        case "obra:slot:generate": {
          setGenerateModalSlotKey(msg.slotKey);
          setGenerateInstruction("");
          setGenerateModalOpen(true);
          break;
        }
        case "obra:slot:remove": {
          handleSlotRemove(msg.slotKey);
          break;
        }
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleSlotUpload, handleSlotRemove]);

  const handleExportPdf = useCallback(async () => {
    if (!project?.id || !selectedEbookId) return;

    setExportLoading(true);
    setExportError(null);

    try {
      // Queue PDF export job (Railway will process it asynchronously)
      const result = await queuePdfExport(project.id, selectedEbookId);

      // Open modal to show progress
      setExportJobId(result.jobId);
      setIsExportModalOpen(true);

      setPublishStatus("published");
      await supabase
        .from("projects")
        .update({ publish_status: "published" })
        .eq("id", project.id);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setExportError(errorMsg);
      console.error("export_pdf_queue_error", err);
    } finally {
      setExportLoading(false);
    }
  }, [project?.id, selectedEbookId]);

  const selectedEbook = visibleEbooks.find((e) => e.id === selectedEbookId) ?? null;
  const selectedChapters = selectedEbookId ? (chaptersCache[selectedEbookId] ?? []) : [];

  /** HTML for iframe: always runs injectAll so chapters and images render even when shell is stale. */
  const previewSrcDoc = useMemo(() => {
    if (!selectedEbookId) return null;
    const shell = shellCache[selectedEbookId];
    if (!shell) return null;
    const imageUrls: Record<string, string> = {};
    const sorted = chaptersSortedByOrder(selectedChapters);
    for (const [key, slot] of Object.entries(imageSlots)) {
      if (!slot.url) continue;
      if (key === "cover_art") {
        imageUrls.cover = slot.url;
        continue;
      }
      // New format: "{ebookId}:chapter-N-image-1"
      const newMatch = /^([^:]+):(chapter-\d+-image-\d+)$/.exec(key);
      if (newMatch && newMatch[1] === selectedEbookId) {
        const slotKeyNew = newMatch[2]!;
        imageUrls[slotKeyNew] = slot.url;
        // Also inject using legacy key for shells generated before the prompt fix
        imageUrls[slotKeyNew.replace(/-image-\d+$/, "-img")] = slot.url;
        continue;
      }
      // Legacy format: "{ebookId}:{chapterId}:hero"
      const heroMatch = /^([^:]+):([^:]+):hero$/.exec(key);
      if (heroMatch && heroMatch[1] === selectedEbookId) {
        const chapterId = heroMatch[2]!;
        const idx = sorted.findIndex((c) => c.id === chapterId);
        if (idx >= 0) imageUrls[`chapter-${idx + 1}-image-1`] = slot.url;
      }
    }
    return injectAll(shell.html, { chapters: selectedChapters, images: imageUrls });
  }, [selectedEbookId, shellCache, selectedChapters, imageSlots]);

  const tabLabel = useCallback(
    (ebook: EbookRow): string => {
      if (ebook.type === "main") return t("wizard.preview.tabs.main");
      if (ebook.type === "bonus") return t("wizard.preview.tabs.bonus", { n: ebook.package_ordinal + 1 });
      return t("wizard.preview.tabs.bump", { n: ebook.package_ordinal + 1 });
    },
    [t],
  );

  const isLoading = projectLoading || ebooksLoading;
  const hasError = Boolean(projectError || ebooksError);
  const shellLoading = Boolean(selectedEbookId && (shellInflightByEbook[selectedEbookId] ?? 0) > 0);

  if (!params.projectId) return null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Top bar + stepper */}
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

      {/* Artifact tab bar */}
      {visibleEbooks.length > 0 && (
        <ContentArtifactTabs
          tabs={visibleEbooks.map((e) => ({ key: e.id, navTitle: tabLabel(e) }))}
          selectedKey={selectedEbookId ?? ""}
          onSelect={handleSelectEbook}
        />
      )}

      {/* Main area */}
      <main className="flex min-h-0 flex-1 overflow-hidden bg-obra-blue-50">
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

          {/* Chapter nav — light sidebar */}
          {selectedChapters.length > 0 ? (
            <ContentChapterNav
              t={t}
              chapters={selectedChapters}
              selectedIndex={selectedPreviewChapterIdx}
              onSelectChapterIndex={handleSelectPreviewChapter}
              generateLoading={chaptersLoading}
              title={selectedEbook ? tabLabel(selectedEbook) : undefined}
            />
          ) : null}

          {/* Preview content */}
          <div ref={previewScrollRef} className="relative min-h-0 min-w-0 flex-1 overflow-y-auto bg-[#e8edf2]">
            {shellLoading ? (
              <ObraShellGeneratingOverlay
                current={selectedEbookId ? shellProgressByEbook[selectedEbookId]?.current : undefined}
                total={selectedEbookId ? (shellProgressByEbook[selectedEbookId]?.total ?? selectedChapters.length) : selectedChapters.length}
              />
            ) : chaptersLoading ? (
              <ObraLoadingOverlay />
            ) : null}

            {isLoading ? (
              <ObraSpinner size="lg" className="py-16" />
            ) : hasError ? (
              <div className="p-8">
                <ObraAlert variant="error" title={projectError ?? ebooksError ?? ""} />
              </div>
            ) : shellError ? (
              <div className="p-8 space-y-3">
                <ObraAlert variant="error" title={t("wizard.preview.shell.errorTitle")} description={t("wizard.preview.shell.errorDesc")} />
                <Button type="button" variant="secondary" onClick={() => void handleRegenerateShell()}>
                  <RefreshCw className="size-4" aria-hidden />
                  {t("wizard.preview.shell.retryCta")}
                </Button>
              </div>
            ) : previewSrcDoc ? (
              <div className="flex min-h-0 w-full flex-col gap-3 p-4">
                {shellStale ? (
                  <ObraAlert
                    variant="warning"
                    title={t("wizard.preview.shell.staleTitle")}
                    description={t("wizard.preview.shell.staleDesc")}
                  />
                ) : null}
                <iframe
                  srcDoc={previewSrcDoc}
                  title={t("wizard.preview.iframeTitle")}
                  className="w-full min-w-0"
                  style={{ border: "none", minHeight: "100%" }}
                  onLoad={(e) => {
                    const iframe = e.currentTarget;
                    try {
                      const h = iframe.contentDocument?.body?.scrollHeight;
                      if (h) iframe.style.height = `${h + 64}px`;
                    } catch { /* cross-origin guard */ }
                  }}
                />
              </div>
            ) : !shellLoading && selectedChapters.length === 0 ? (
              <div className="p-8">
                <ObraAlert variant="info" title={t("wizard.preview.shell.noChapters")} />
              </div>
            ) : null}
          </div>
        </div>
      </main>

      {/* AI Image Generate Modal */}
      <Modal
        open={generateModalOpen}
        onClose={() => setGenerateModalOpen(false)}
        closeLabel={t("common.close")}
      >
        <ModalHead>
          <ModalTitle>{t("wizard.preview.generateModal.title")}</ModalTitle>
        </ModalHead>
        <ModalContent>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-obra-blue-950">
              {t("wizard.preview.generateModal.instructionLabel")}
            </span>
            <textarea
              className="w-full rounded-md border border-obra-blue-100 px-3 py-2 font-body text-sm text-obra-blue-950 outline-none focus:border-obra-blue-700 focus:ring-2 focus:ring-obra-blue-700/20 min-h-[80px] resize-none"
              placeholder={t("wizard.preview.generateModal.instructionPlaceholder")}
              value={generateInstruction}
              onChange={(e) => setGenerateInstruction(e.target.value)}
              disabled={generateBusy}
            />
          </label>
        </ModalContent>
        <ModalFooter>
          <Button
            type="button"
            variant="tertiary"
            onClick={() => setGenerateModalOpen(false)}
            disabled={generateBusy}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={generateBusy}
            onClick={() => {
              if (!generateModalSlotKey) return;
              setGenerateBusy(true);
              void handleSlotGenerate(generateModalSlotKey, generateInstruction || undefined)
                .finally(() => {
                  setGenerateBusy(false);
                  setGenerateModalOpen(false);
                });
            }}
          >
            {generateBusy ? t("wizard.preview.generateModal.generating") : t("wizard.preview.generateModal.cta")}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Export PDF Modal — key forces remount when jobId changes so internal state never shows stale results */}
      <ExportPdfModal
        key={exportJobId ?? "no-job"}
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        jobId={exportJobId}
        projectTitle={project?.main_title ?? "ebook"}
        onSuccess={handleExportSuccess}
      />

      {/* Export ZIP Modal */}
      {project?.id ? (
        <ExportZipModal
          isOpen={isZipModalOpen}
          onOpenChange={setIsZipModalOpen}
          ebooks={visibleEbooks.map((e) => ({ id: e.id, label: tabLabel(e), title: e.type === "main" ? (project.main_title ?? e.title) : e.title, type: e.type, package_ordinal: e.package_ordinal }))}
          projectId={project.id}
          projectTitle={project.main_title ?? "project"}
          onSuccess={() => {
            setPublishStatus("published");
            void supabase.from("projects").update({ publish_status: "published" }).eq("id", project.id);
          }}
        />
      ) : null}

      {/* Footer */}
      <div className="w-full shrink-0 border-t border-obra-blue-100 bg-white px-4 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex w-full min-w-0 flex-col gap-3">
          {exportError ? <ObraAlert variant="error" title={exportError} /> : null}
          <div className="flex w-full min-w-0 items-center justify-between gap-4">
            <Button
              type="button"
              variant="tertiary"
              onClick={() => navigate(`/app/projects/${params.projectId ?? ""}/content`)}
            >
              <ChevronLeft className="size-4" aria-hidden />
              {t("wizard.preview.footer.backToContent")}
            </Button>

            <div className="flex items-center gap-2">
              {publishStatus === "published" || publishStatus === "modified" ? (
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    publishStatus === "published"
                      ? "bg-obra-green-400/20 text-obra-blue-950"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {t(`wizard.preview.publishStatus.${publishStatus}`)}
                </span>
              ) : null}

              <Button
                type="button"
                variant="tertiary"
                size="small"
                disabled={!selectedEbookId || shellLoading}
                onClick={() => void handleRegenerateShell()}
                title={t("wizard.preview.shell.regenerateCta")}
              >
                <RefreshCw className={["size-4", shellLoading ? "animate-spin" : ""].join(" ").trim()} aria-hidden />
                {t("wizard.preview.shell.regenerateCta")}
              </Button>

              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={!project?.id || shellLoading}
                onClick={() => setIsZipModalOpen(true)}
              >
                <Package className="size-4" aria-hidden />
                {t("wizard.preview.export.zip")}
              </Button>

              {selectedEbookId && ebookPdfUrls[selectedEbookId] && publishStatus === "published" ? (
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  disabled={shellLoading}
                  onClick={() => downloadPdf(ebookPdfUrls[selectedEbookId!]!, `${project?.main_title ?? "ebook"}.pdf`)}
                >
                  <FileDown className="size-4" aria-hidden />
                  {t("wizard.preview.export.download")}
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  disabled={!selectedEbook || exportLoading || shellLoading}
                  onClick={() => void handleExportPdf()}
                >
                  <FileDown className="size-4" aria-hidden />
                  {exportLoading ? "…" : selectedEbookId && ebookPdfUrls[selectedEbookId]
                    ? t("wizard.preview.export.regeneratePdf")
                    : t("wizard.preview.export.generatePdf")}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
