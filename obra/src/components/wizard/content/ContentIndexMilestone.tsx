import { Book, Check, Gift, GripVertical, Plus, Trash2 } from "lucide-react";
import { useCallback, useState, type DragEvent } from "react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { ObraInput } from "@/components/obra/ObraInput";
import { usesMultiChapterContentNavTarget, type ContentPackageNavTarget } from "@/lib/wizard/contentNav";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";

export type { TocChapterRow } from "@/lib/wizard/tocTypes";

const TOC_DND_MIME = "application/x-obra-toc-index";

export type ContentNavItem = {
  key: string;
  /** Ebook / bonus / bump title for native tooltip and accessible name. */
  navTitle: string;
  target: ContentPackageNavTarget;
  /** Main ebook: set when the table of contents was confirmed (frozen). */
  tocConfirmed?: boolean;
};

type ContentIndexMilestoneProps = {
  t: TFunction;
  navItems: ContentNavItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  navItemDisabled?: (key: string) => boolean;
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
  navItems,
  selectedKey,
  onSelectKey,
  navItemDisabled,
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
  const selected = navItems.find((item) => item.key === selectedKey) ?? navItems[0];
  const usesChapterList = selected ? usesMultiChapterContentNavTarget(selected.target) : false;
  const readOnly = Boolean(tocReadOnly);
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

  const navLabel = t("wizard.content.index.packageNavAria");
  const hideRegenerateToolbar = Boolean(showMainTocEmptyChoice);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      <nav
        aria-label={navLabel}
        className="flex w-full shrink-0 flex-col gap-1 border-b border-obra-blue-100 pb-4 lg:w-auto lg:items-start lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6"
      >
        <ul className="flex flex-col gap-2">
          {navItems.map((item) => {
            const isCurrent = item.key === selectedKey;
            const disabled = navItemDisabled?.(item.key) ?? false;
            const Icon = item.target.kind === "bonus" ? Gift : Book;
            const accessLabel = item.tocConfirmed
              ? `${item.navTitle}. ${t("wizard.content.index.packageTocConfirmedAria")}`
              : item.navTitle;
            const titleAttr = item.tocConfirmed
              ? `${item.navTitle} — ${t("wizard.content.index.packageTocConfirmedAria")}`
              : item.navTitle;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={disabled}
                  title={titleAttr}
                  aria-label={accessLabel}
                  onClick={() => {
                    if (!disabled) onSelectKey(item.key);
                  }}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "relative flex size-11 shrink-0 items-center justify-center rounded-md border font-body transition-colors",
                    disabled ? "cursor-not-allowed opacity-50" : "",
                    isCurrent
                      ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
                      : "border-obra-blue-100 bg-white text-obra-neutral-600 hover:border-obra-blue-200 hover:bg-obra-blue-50/60",
                  ].join(" ")}
                >
                  <Icon className="size-5 shrink-0" aria-hidden />
                  {item.tocConfirmed ? (
                    <Check
                      className="pointer-events-none absolute bottom-0.5 right-0.5 size-2.5 text-obra-green-600 drop-shadow-[0_0_1px_rgba(255,255,255,0.9)]"
                      strokeWidth={3}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

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
          <div className="rounded-xl border border-obra-neutral-200 bg-white px-5 py-6 shadow-sm">
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
              <Button type="button" variant="tertiary" size="medium" onClick={() => onMainTocChooseManual?.()}>
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
                    "rounded-xl border bg-white px-4 py-3 shadow-sm transition-colors",
                    dragOverIndex === index ? "border-obra-blue-400 bg-obra-blue-50/40" : "border-obra-neutral-200",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-3">
                    {!readOnly ? (
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
                      disabled={readOnly}
                      aria-label={t("wizard.content.index.chapterTitleLabel", { index: index + 1 })}
                      className="min-w-0 flex-1 border-0 bg-transparent py-1 font-body text-sm text-obra-blue-950 outline-none placeholder:text-obra-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    {!readOnly ? (
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
                  className="rounded-xl border border-obra-neutral-200 bg-white p-4 shadow-sm"
                >
                  <ObraInput
                    id={`toc-${row.id}`}
                    label={t("wizard.content.index.chapterTitleLabel", { index: index + 1 })}
                    value={row.title}
                    onChange={(event) => updateRow(row.id, event.target.value)}
                    placeholder={t("wizard.content.index.chapterTitlePlaceholder")}
                    disabled={readOnly}
                  />
                </li>
              )
            )}
          </ol>
        ) : null}

        {usesChapterList && !readOnly && !showMainTocEmptyChoice ? (
          <div>
            <Button type="button" variant="tertiary" size="medium" onClick={addRow}>
              <Plus className="size-4" aria-hidden />
              {t("wizard.content.index.addChapter")}
            </Button>
          </div>
        ) : null}

      </section>
    </div>
  );
}
