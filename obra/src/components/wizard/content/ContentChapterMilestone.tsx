import { Check } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { ChapterRichTextEditor } from "@/components/obra/ChapterRichTextEditor";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import { chapterHtmlEquals, isChapterHtmlEffectivelyEmpty } from "@/lib/sanitizeChapterHtml";

type ContentChapterMilestoneProps = {
  t: TFunction;
  panelTitle: string;
  chapters: ChapterDraftRow[];
  selectedIndex: number;
  onSelectChapterIndex: (index: number) => void;
  bodyValue: string;
  onBodyChange: (value: string) => void;
  onSave: () => void;
  onGenerate: () => void;
  onApprove: () => void;
  saveLoading: boolean;
  generateLoading: boolean;
  approveLoading: boolean;
  /** Bumps when AI replaces body so the editor remounts with new HTML. */
  richTextResetKey: number;
  progressValue?: number;
  progressMax?: number;
  /** When false, hides the AI-backed “Generate” action (upload path / offline). Defaults to true. */
  showAiGenerateButton?: boolean;
};

export function ContentChapterMilestone({
  t,
  panelTitle,
  chapters,
  selectedIndex,
  onSelectChapterIndex,
  bodyValue,
  onBodyChange,
  onSave,
  onGenerate,
  onApprove,
  saveLoading,
  generateLoading,
  approveLoading,
  richTextResetKey,
  progressValue = 0,
  progressMax = 1,
  showAiGenerateButton = true,
}: ContentChapterMilestoneProps) {
  const listLabel = t("wizard.content.chapters.chapterListAria");
  const current = chapters[selectedIndex];
  const dirty = current ? !chapterHtmlEquals(bodyValue, current.content ?? "") : false;
  const generateDisabled = generateLoading || !current?.title?.trim();
  const saveDisabled = saveLoading || !dirty;
  /** Approve persists unsaved text then sets approved_at; only disabled when already approved with no edits. */
  const alreadyApprovedClean = Boolean(current?.approved_at) && !dirty;
  const approveDisabled =
    approveLoading || isChapterHtmlEffectivelyEmpty(bodyValue) || alreadyApprovedClean;
  const safeMax = Math.max(1, progressMax);
  const safeValue = Math.min(Math.max(progressValue, 0), safeMax);
  const progressPercent = Math.round((safeValue / safeMax) * 100);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
        <nav aria-label={listLabel} className="flex w-full shrink-0 flex-col gap-1 lg:w-52">
          <ol className="flex flex-col gap-1">
            {chapters.map((ch, index) => {
              const isSel = index === selectedIndex;
              return (
                <li key={ch.id}>
                  <button
                    type="button"
                    onClick={() => onSelectChapterIndex(index)}
                    aria-current={isSel ? "true" : undefined}
                    className={[
                      "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left font-body text-sm transition-colors",
                      isSel
                        ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
                        : "border-transparent bg-white text-obra-neutral-700 hover:border-obra-blue-200 hover:bg-obra-blue-50/50",
                    ].join(" ")}
                  >
                    <span className="shrink-0 tabular-nums text-obra-neutral-500">{ch.sort_order}.</span>
                    <span className="min-w-0 flex-1 truncate">{ch.title || "—"}</span>
                    {ch.approved_at ? (
                      <Check className="size-4 shrink-0 text-obra-green-600" strokeWidth={2.5} aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section
          aria-labelledby="content-chapters-heading"
          className="flex min-w-0 flex-1 flex-col gap-4"
        >
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="content-chapters-heading" className="font-display text-xl text-obra-blue-950">
                {panelTitle}
              </h2>
              {current?.approved_at ? (
                <span className="rounded-full bg-obra-green-50 px-2 py-0.5 font-body text-xs font-medium text-obra-green-800">
                  {t("wizard.content.chapters.approvedBadge")}
                </span>
              ) : null}
            </div>
            <div className="pt-2">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-body text-xs text-obra-neutral-600">{t("wizard.content.progress.contentLabel")}</span>
                <span className="font-body text-xs font-medium text-obra-blue-950">
                  {safeValue}/{safeMax}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-obra-blue-100">
                <div
                  className="h-full rounded-full bg-obra-blue-700 transition-all"
                  style={{ width: `${progressPercent}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>

          {current ? (
            <ChapterRichTextEditor
              key={`${current.id}-${richTextResetKey}`}
              value={bodyValue}
              onChange={onBodyChange}
              disabled={false}
              placeholder={t("wizard.content.chapters.bodyPlaceholder")}
            />
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            {showAiGenerateButton ? (
              <Button
                type="button"
                variant="secondary"
                size="medium"
                disabled={generateDisabled}
                onClick={onGenerate}
              >
                {generateLoading ? t("wizard.content.chapters.generateLoading") : t("wizard.content.chapters.generate")}
              </Button>
            ) : null}
            <Button type="button" variant="tertiary" size="medium" disabled={saveDisabled} onClick={onSave}>
              {saveLoading ? t("wizard.content.chapters.saveLoading") : t("wizard.content.chapters.save")}
            </Button>
            <Button
              type="button"
              variant="primary"
              size="medium"
              disabled={approveDisabled}
              onClick={onApprove}
            >
              {approveLoading ? t("wizard.content.chapters.approveLoading") : t("wizard.content.chapters.approve")}
            </Button>
          </div>
          <p className="font-body text-xs text-obra-neutral-600">{t("wizard.content.chapters.toolbarHint")}</p>
        </section>
    </div>
  );
}
