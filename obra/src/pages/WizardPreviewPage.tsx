import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, FileDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { PreviewDocument, type EbookPreviewData } from "@/components/preview/PreviewDocument";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import { supabase } from "@/lib/supabaseClient";

type EbookRow = {
  id: string;
  title: string | null;
  type: "main" | "bonus" | "order_bump";
  package_ordinal: number;
};

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
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const },
      { id: 2, label: t("wizard.stepper.content"), status: "completed" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "active" as const },
    ],
    [t],
  );

  const [ebooks, setEbooks] = useState<EbookRow[]>([]);
  const [ebooksLoading, setEbooksLoading] = useState(false);
  const [ebooksError, setEbooksError] = useState<string | null>(null);

  const [selectedEbookId, setSelectedEbookId] = useState<string | null>(null);
  const [chaptersCache, setChaptersCache] = useState<Record<string, ChapterDraftRow[]>>({});
  const [chaptersLoading, setChaptersLoading] = useState(false);

  const [exportLoading, setExportLoading] = useState(false);

  // Load ebooks once project is ready
  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;

    async function load() {
      setEbooksLoading(true);
      setEbooksError(null);
      const result = await loadProjectEbooks(project!.id);
      if (cancelled) return;
      if (!result.ok) {
        setEbooksError(t("wizard.preview.error.load"));
      } else {
        setEbooks(result.rows);
        if (result.rows.length > 0 && !selectedEbookId) {
          setSelectedEbookId(result.rows[0].id);
        }
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

  const handleSelectEbook = useCallback((id: string) => {
    setSelectedEbookId(id);
  }, []);

  const handleExportPdf = useCallback(async () => {
    // Stub: PDF export Edge Function is implemented in #65.
    setExportLoading(true);
    await new Promise((r) => setTimeout(r, 600));
    setExportLoading(false);
  }, []);

  const selectedEbook = ebooks.find((e) => e.id === selectedEbookId) ?? null;
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

      {/* Page header */}
      <div className="border-b border-obra-blue-100 px-8 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-semibold text-obra-blue-950">
              {t("wizard.preview.title")}
            </h1>
            <p className="mt-0.5 text-sm text-obra-neutral-600">{t("wizard.preview.subtitle")}</p>
          </div>
          <Button
            type="button"
            variant="tertiary"
            size="small"
            onClick={() => navigate(`/app/projects/${params.projectId ?? ""}/content`)}
          >
            {t("wizard.preview.editContent")}
          </Button>
        </div>
      </div>

      {/* Deliverable tabs */}
      {ebooks.length > 0 ? (
        <div className="flex gap-1 overflow-x-auto border-b border-obra-blue-100 px-8">
          {ebooks.map((ebook) => (
            <button
              key={ebook.id}
              type="button"
              onClick={() => handleSelectEbook(ebook.id)}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                ebook.id === selectedEbookId
                  ? "border-obra-blue-900 text-obra-blue-950"
                  : "border-transparent text-obra-neutral-600 hover:text-obra-blue-950"
              }`}
              aria-selected={ebook.id === selectedEbookId}
            >
              {tabLabel(ebook)}
            </button>
          ))}
        </div>
      ) : null}

      {/* Main preview area */}
      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-obra-blue-50">
        <div className="mx-auto w-full max-w-3xl px-6 py-8">
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
              <PreviewDocument
                ebook={ebookPreviewData}
                chapters={selectedChapters}
                designConfig={project.design_config}
                author={project.author}
                layoutPageAssignments={project.layout_page_assignments}
              />
            </>
          ) : null}
        </div>
      </main>

      {/* Footer */}
      <div className="w-full shrink-0 border-t border-obra-blue-100 bg-white px-8 py-5">
        <div className="flex w-full min-w-0 items-center justify-between">
          <Button
            type="button"
            variant="tertiary"
            onClick={() => navigate(`/app/projects/${params.projectId ?? ""}/content`)}
          >
            <ChevronLeft className="size-4" aria-hidden />
            {t("wizard.preview.footer.backToContent")}
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
  );
}
