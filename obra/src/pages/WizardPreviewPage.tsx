import { useCallback, useEffect, useMemo, useState } from "react";
import { Book, ChevronLeft, FileDown, Gift, Package, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { ExportPdfModal } from "@/components/wizard/ExportPdfModal";
import { PreviewDocument, type EbookPreviewData } from "@/components/preview/PreviewDocument";
import { ImageSlot } from "@/components/preview/ImageSlot";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import {
  generateImage,
  getSignedImageUrl,
  loadProjectImages,
  uploadImage,
  type ImageSlotStatus,
  type ProjectImageRow,
} from "@/lib/preview/imageSlotApi";
import { queuePdfExport, getErrorMessage } from "@/utils/pdf-export";
import { supabase } from "@/lib/supabaseClient";

type EbookRow = {
  id: string;
  title: string | null;
  type: "main" | "bonus" | "order_bump";
  package_ordinal: number;
};

/** Stable key for the imageSlots map (matches ProjectImageRow unique constraints). */
function rowSlotKey(row: ProjectImageRow): string {
  if (row.slot_key === "cover_art" && !row.ebook_id) return "cover_art";
  return `${row.ebook_id ?? ""}:${row.chapter_id ?? ""}:${row.slot_key}`;
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
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const, onClick: () => navigate(`/app/projects/${params.projectId ?? ""}/structure`) },
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

  const [zipLoading, setZipLoading] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<"draft" | "published" | "modified">("draft");

  // Image slots state: imageId → { status, signedUrl }
  const [imageSlots, setImageSlots] = useState<Record<string, { status: ImageSlotStatus; url: string | null }>>({});

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
      setEbooksLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [project?.id, t]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load chapters for the selected ebook when not yet cached
  useEffect(() => {
    if (!selectedEbookId || chaptersCache[selectedEbookId] !== undefined) return;
    let cancelled = false;

    async function load() {
      if (!selectedEbookId) return;
      setChaptersLoading(true);
      const result = await loadEbookChaptersDraft(selectedEbookId);
      if (cancelled) return;
      if (result.ok) {
        setChaptersCache((prev) => ({ ...prev, [selectedEbookId]: result.rows }));
      }
      setChaptersLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [selectedEbookId, chaptersCache]);

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
  }, []);

  const handleUploadCover = useCallback(async (file: File) => {
    if (!project?.id) return;
    const key = "cover_art";
    setImageSlots((prev) => ({ ...prev, [key]: { status: "generating", url: prev[key]?.url ?? null } }));
    const result = await uploadImage({ projectId: project.id, slotKey: "cover_art", file });
    if (result.ok) {
      setImageSlots((prev) => ({ ...prev, [key]: { status: "done", url: result.signedUrl } }));
    } else {
      setImageSlots((prev) => ({ ...prev, [key]: { status: "error", url: prev[key]?.url ?? null } }));
    }
  }, [project?.id]);

  const handleGenerateCover = useCallback(async (instruction?: string) => {
    if (!project?.id) return;
    const key = "cover_art";
    setImageSlots((prev) => ({ ...prev, [key]: { status: "generating", url: prev[key]?.url ?? null } }));
    const result = await generateImage({ projectId: project.id, slotKey: "cover_art", instruction });
    if (result.ok) {
      setImageSlots((prev) => ({ ...prev, [key]: { status: "done", url: result.signedUrl } }));
    } else {
      setImageSlots((prev) => ({ ...prev, [key]: { status: "error", url: prev[key]?.url ?? null } }));
    }
  }, [project?.id]);

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

      // Mark as published after first successful queue
      setPublishStatus((prev) => (prev === "draft" ? "published" : prev));
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

  const handleExportZip = useCallback(async () => {
    if (!project?.id) return;
    setZipLoading(true);
    setZipError(null);
    try {
      const { data, error } = await supabase.functions.invoke("export-zip", {
        body: { projectId: project.id },
      });
      if (error || !data?.ok || !data?.signedUrl) {
        console.error("export_zip_error", error ?? data?.error);
        setZipError(t("wizard.preview.export.zipError"));
        return;
      }
      const a = document.createElement("a");
      a.href = data.signedUrl as string;
      a.download = (data.filename as string | undefined) ?? `${project.main_title ?? "project"}.zip`;
      a.click();
      // export-zip also marks published server-side; sync local state
      setPublishStatus("published");
    } finally {
      setZipLoading(false);
    }
  }, [project?.id, project?.main_title, t]);

  const selectedEbook = visibleEbooks.find((e) => e.id === selectedEbookId) ?? null;
  const selectedChapters = selectedEbookId ? (chaptersCache[selectedEbookId] ?? []) : [];

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

  if (!params.projectId) return null;

  const ebookPreviewData: EbookPreviewData | null = selectedEbook
    ? {
        id: selectedEbook.id,
        title: selectedEbook.title ?? "",
        type: selectedEbook.type,
      }
    : null;

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      {/* Top bar */}
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

      {/* Global stepper */}
      <div className="border-b border-obra-blue-100 px-8 py-5">
        <WizardGlobalStepper steps={globalSteps} />
      </div>

      {/* Main area — same pattern as WizardContentPage */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-obra-blue-50">
        <div className="w-full">

          {/* Sidebar + content — same flex pattern as ContentChapterMilestone */}
          <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">

            {/* Deliverable sidebar — icon buttons, no background, inside centered content */}
            {visibleEbooks.length > 0 ? (
              <nav
                aria-label={t("wizard.preview.ebooksNav")}
                className="flex w-full shrink-0 flex-col items-center gap-1 border-b border-obra-blue-100 px-4 py-4 lg:w-auto lg:items-start lg:border-b-0 lg:border-r lg:px-6 lg:py-6"
              >
                <ul className="flex flex-row justify-between gap-2 overflow-x-auto lg:flex-col lg:justify-start lg:overflow-visible">
                  {visibleEbooks.map((ebook) => {
                    const isCurrent = ebook.id === selectedEbookId;
                    const Icon = ebook.type === "bonus" ? Gift : ebook.type === "order_bump" ? Tag : Book;
                    return (
                      <li key={ebook.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectEbook(ebook.id)}
                          title={tabLabel(ebook)}
                          aria-label={tabLabel(ebook)}
                          aria-current={isCurrent ? "page" : undefined}
                          className={[
                            "relative flex size-11 shrink-0 items-center justify-center rounded-md border font-body transition-colors",
                            isCurrent
                              ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
                              : "border-obra-blue-100 bg-white text-obra-neutral-600 hover:border-obra-blue-200 hover:bg-obra-blue-50/60",
                          ].join(" ")}
                        >
                          <Icon className="size-5 shrink-0" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ) : null}

            {/* Preview content */}
            <div className="min-w-0 flex-1 mx-auto max-w-[1024px] py-3 pr-6">
              {isLoading ? (
                <p className="text-sm text-obra-neutral-600">{t("wizard.preview.loading")}</p>
              ) : hasError ? (
                <p
                  role="alert"
                  className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                >
                  {projectError ?? ebooksError}
                </p>
              ) : project && ebookPreviewData ? (
                <>
                  {chaptersLoading ? (
                    <p className="mb-4 text-sm text-obra-neutral-600">{t("wizard.preview.loading")}</p>
                  ) : null}

                  {/* Cover image slot (main ebook only) */}
                  {selectedEbook?.type === "main" ? (
                    <div className="mb-4">
                      <ImageSlot
                        slotKey="cover_art"
                        status={imageSlots["cover_art"]?.status ?? "idle"}
                        imageUrl={imageSlots["cover_art"]?.url ?? null}
                        maxKb={2048}
                        disabled={imageSlots["cover_art"]?.status === "generating"}
                        onGenerate={(instruction) => void handleGenerateCover(instruction)}
                        onUpload={(file) => void handleUploadCover(file)}
                        onRemove={
                          imageSlots["cover_art"]?.url
                            ? () => setImageSlots((prev) => ({ ...prev, cover_art: { status: "pending", url: null } }))
                            : undefined
                        }
                      />
                    </div>
                  ) : null}

                  <PreviewDocument
                    ebook={ebookPreviewData}
                    chapters={selectedChapters}
                    designConfig={project.design_config}
                    author={project.author}
                    layoutPageAssignments={project.layout_page_assignments}
                    coverImageUrl={imageSlots["cover_art"]?.url ?? null}
                  />
                </>
              ) : null}
            </div>

          </div>
        </div>
      </main>

      {/* Export PDF Modal */}
      <ExportPdfModal
        isOpen={isExportModalOpen}
        onOpenChange={setIsExportModalOpen}
        jobId={exportJobId}
        projectTitle={project?.main_title ?? "ebook"}
      />

      {/* Footer */}
      <div className="w-full shrink-0 border-t border-obra-blue-100 bg-white px-8 py-5">
        <div className="flex w-full min-w-0 flex-col gap-3">
          {exportError ? (
            <p role="alert" className="text-xs text-red-600">{exportError}</p>
          ) : null}
          {zipError ? (
            <p role="alert" className="text-xs text-red-600">{zipError}</p>
          ) : null}
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
                variant="secondary"
                size="small"
                disabled={!project?.id || zipLoading}
                onClick={() => void handleExportZip()}
              >
                <Package className="size-4" aria-hidden />
                {zipLoading ? "…" : t("wizard.preview.export.zip")}
              </Button>

              <Button
                type="button"
                variant="primary"
                disabled={!selectedEbook || exportLoading}
                onClick={() => void handleExportPdf()}
              >
                <FileDown className="size-4" aria-hidden />
                {exportLoading ? "…" : t("wizard.preview.export.pdf")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
