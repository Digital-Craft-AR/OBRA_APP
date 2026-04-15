import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState, type DragEvent } from "react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { ObraInput } from "@/components/obra/ObraInput";
import { usesMultiChapterContentNavTarget, type ContentPackageNavTarget } from "@/lib/wizard/contentNav";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";

export type { TocChapterRow } from "@/lib/wizard/tocTypes";
export type { ContentNavItem } from "@/lib/wizard/contentNav";

const TOC_DND_MIME = "application/x-obra-toc-index";

type ContentIndexMilestoneProps = {
  t: TFunction;
  /** Which package artifact is being edited (drives single-section vs multi-chapter TOC UI). */
  selectedTarget: ContentPackageNavTarget;
  panelTitle: string;
  panelSubtitle: string;
  tocRows: TocChapterRow[];
  onChangeToc: (rows: TocChapterRow[]) => void;
  onRegenerateOutline: () => void;
  regenerateDisabled?: boolean;
  regenerateLoading?: boolean;
  tocReadOnly?: boolean;
  actionAnnouncement?: string | null;
  showMainTocEmptyChoice?: boolean;
  mainTocEmptyShowGenerate?: boolean;
  onMainTocChooseManual?: () => void;
  onMainTocChooseGenerate?: () => void;
  /** When false, hides the regenerate toolbar (e.g. single-section bonuses). */
  showRegenerateToolbar?: boolean;
};

function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 11)}`;
}

function reorderTocRows(rows: TocChapterRow[], from: number, to: number): TocChapterRow[] {
  if (from === to) return rows;
  const next = [...rows];
  const [removed] = next.splice(from, 1);
  next.splice(to, 0, removed!);
  return next;
}

export function ContentIndexMilestone({
  t,
  selectedTarget,
  panelTitle,
  panelSubtitle,
  tocRows,
  onChangeToc,
  onRegenerateOutline,
  regenerateDisabled,
  regenerateLoading,
  tocReadOnly,
  actionAnnouncement,
  showMainTocEmptyChoice = false,
  mainTocEmptyShowGenerate = true,
  onMainTocChooseManual,
  onMainTocChooseGenerate,
  showRegenerateToolbar = true,
}: ContentIndexMilestoneProps) {
  const usesChapterList = usesMultiChapterContentNavTarget(selectedTarget);
  const readOnly = Boolean(tocReadOnly);
  const tocAiBusy = Boolean(regenerateLoading);
  const tocFieldsLocked = readOnly || tocAiBusy;
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  function updateRow(id: string, title: string) {
    onChangeToc(tocRows.map((row) => (row.id === id ? { ...row, title } : row)));
  }

  function removeRow(id: string) {
    if (tocRows.length <= 1) return;
    onChangeToc(tocRows.filter((row) => row.id !== id));
  }

  function addRow() {
    onChangeToc([...tocRows, { id: newRowId(), title: "" }]);
  }

  const handleDragStart = useCallback((e: DragEvent, index: number) => {
    e.dataTransfer.setData(TOC_DND_MIME, String(index));
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent, dropIndex: number) => {
      e.preventDefault();
      setDragOverIndex(null);
      const raw = e.dataTransfer.getData(TOC_DND_MIME);
      const from = Number.parseInt(raw, 10);
      if (Number.isNaN(from)) return;
      onChangeToc(reorderTocRows(tocRows, from, dropIndex));
    },
    [onChangeToc, tocRows],
  );

  const handleDragEnd = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const hideRegenerateToolbar = Boolean(showMainTocEmptyChoice);

  return (
    <section
      aria-labelledby="content-toc-heading"
      className="flex min-w-0 flex-1 flex-col gap-4"
    >
        <div className="space-y-1">
          <h2 id="content-toc-heading" className="font-display text-xl text-obra-blue-950">
            {panelTitle}
          </h2>
          <p className="font-body text-sm text-obra-neutral-600">{panelSubtitle}</p>
        </div>

        {actionAnnouncement ? (
          <p role="status" aria-live="polite" className="font-body text-sm text-obra-blue-950">
            {actionAnnouncement}
          </p>
        ) : null}

        {showMainTocEmptyChoice ? (
          <div className="rounded-card border border-obra-neutral-200 bg-white px-5 py-6">
            <p className="mb-5 font-body text-sm text-obra-blue-950">{t("wizard.content.index.emptyTocPrompt")}</p>
            <div className="flex flex-wrap gap-3">
              {mainTocEmptyShowGenerate ? (
                <Button
                  type="button"
                  variant="primary"
                  size="medium"
                  disabled={regenerateDisabled || regenerateLoading}
                  onClick={() => onMainTocChooseGenerate?.()}
                >
                  {regenerateLoading ? t("wizard.content.index.regenerateLoading") : t("wizard.content.index.emptyTocGenerate")}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="tertiary"
                size="medium"
                disabled={tocAiBusy}
                onClick={() => onMainTocChooseManual?.()}
              >
                {t("wizard.content.index.emptyTocManual")}
              </Button>
            </div>
          </div>
        ) : null}

        {!hideRegenerateToolbar && showRegenerateToolbar ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="medium"
              onClick={onRegenerateOutline}
              disabled={regenerateDisabled || regenerateLoading}
            >
              {regenerateLoading ? t("wizard.content.index.regenerateLoading") : t("wizard.content.index.regenerateOutline")}
            </Button>
            <p className="font-body text-xs text-obra-neutral-600">{t("wizard.content.index.regenerateOutlineHint")}</p>
          </div>
        ) : null}

        {!usesChapterList ? (
          <p className="rounded-card border border-obra-blue-100 bg-white px-4 py-3 font-body text-sm text-obra-neutral-600">
            {t("wizard.content.index.singleArtifactTocHint")}
          </p>
        ) : null}

        {!showMainTocEmptyChoice ? (
          <ol className="space-y-3">
            {tocRows.map((row, index) =>
              usesChapterList ? (
                <li
                  key={row.id}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={[
                    "rounded-card border bg-white px-4 py-3 transition-colors",
                    dragOverIndex === index ? "border-obra-blue-400 bg-obra-blue-50/40" : "border-obra-neutral-200",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {!readOnly && !tocAiBusy ? (
                      <span
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        className="cursor-grab text-obra-neutral-400 select-none active:cursor-grabbing"
                        aria-label={t("wizard.content.index.dragChapterAria")}
                      >
                        <GripVertical className="size-5 shrink-0" aria-hidden />
                      </span>
                    ) : null}
                    <span className="shrink-0 font-body text-sm tabular-nums text-obra-blue-950">{index + 1}.</span>
                    <input
                      id={`toc-${row.id}`}
                      type="text"
                      value={row.title}
                      onChange={(event) => updateRow(row.id, event.target.value)}
                      placeholder={t("wizard.content.index.chapterTitlePlaceholder")}
                      disabled={tocFieldsLocked}
                      aria-label={t("wizard.content.index.chapterTitleLabel", { index: index + 1 })}
                      className="min-w-0 flex-1 border-0 bg-transparent py-1 font-body text-sm text-obra-blue-950 outline-none placeholder:text-obra-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    {!readOnly && !tocAiBusy ? (
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-2 text-obra-neutral-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label={t("wizard.content.index.removeChapterAria")}
                        disabled={tocRows.length <= 1}
                        onClick={() => removeRow(row.id)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
                </li>
              ) : (
                <li
                  key={row.id}
                  className="rounded-card border border-obra-neutral-200 bg-white p-4"
                >
                  <ObraInput
                    id={`toc-${row.id}`}
                    label={t("wizard.content.index.chapterTitleLabel", { index: index + 1 })}
                    value={row.title}
                    onChange={(event) => updateRow(row.id, event.target.value)}
                    placeholder={t("wizard.content.index.chapterTitlePlaceholder")}
                    disabled={tocFieldsLocked}
                  />
                </li>
              )
            )}
          </ol>
        ) : null}

        {usesChapterList && !readOnly && !tocAiBusy && !showMainTocEmptyChoice ? (
          <div>
            <Button type="button" variant="tertiary" size="medium" onClick={addRow}>
              <Plus className="size-4" aria-hidden />
              {t("wizard.content.index.addChapter")}
            </Button>
          </div>
        ) : null}

    </section>
  );
}
