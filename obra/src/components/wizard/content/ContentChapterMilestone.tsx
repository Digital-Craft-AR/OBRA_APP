import { Check } from "lucide-react";
import { useState } from "react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { ObraAlert } from "@/components/obra/ObraAlert";
import { ChapterRichTextEditor } from "@/components/obra/ChapterRichTextEditor";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import { chapterHtmlEquals, isChapterHtmlEffectivelyEmpty } from "@/lib/sanitizeChapterHtml";

export function allChaptersHaveContentCheck(chapters: ChapterDraftRow[]): boolean {
  return chapters.length > 0 && chapters.every((ch) => !isChapterHtmlEffectivelyEmpty(ch.content ?? ""));
}

type ContentChapterMilestoneProps = {
  t: TFunction;
  panelTitle: string;
  chapters: ChapterDraftRow[];
  selectedIndex: number;
  bodyValue: string;
  onBodyChange: (value: string) => void;
  onGenerate: () => void;
  onApprove: () => void;
  generateLoading: boolean;
  approveLoading: boolean;
  /** Bumps when AI replaces body so the editor remounts with new HTML. */
  richTextResetKey: number;
  progressValue?: number;
  progressMax?: number;
  /** When false, hides all AI generate actions (upload path). Defaults to true. */
  showAiGenerateButton?: boolean;
  /** Inline success message shown as ObraAlert, auto-cleared by parent. */
  successMessage?: string | null;
  /** True while the "generate all" operation is running (changes single-chapter button label). */
  generateAllLoading?: boolean;
};

export function ContentChapterMilestone({
  t,
  panelTitle,
  chapters,
  selectedIndex,
  bodyValue,
  onBodyChange,
  onGenerate,
  onApprove,
  generateLoading,
  approveLoading,
  richTextResetKey,
  progressValue = 0,
  progressMax = 1,
  showAiGenerateButton = true,
  successMessage,
  generateAllLoading = false,
}: ContentChapterMilestoneProps) {
  const current = chapters[selectedIndex];
  const dirty = current ? !chapterHtmlEquals(bodyValue, current.content ?? "") : false;
  const generateDisabled = generateLoading || !current?.title?.trim();
  const alreadyApprovedClean = Boolean(current?.approved_at) && !dirty;
  const approveDisabled =
    approveLoading ||
    generateLoading ||
    isChapterHtmlEffectivelyEmpty(bodyValue) ||
    alreadyApprovedClean;

  const safeMax = Math.max(1, progressMax);
  const safeValue = Math.min(Math.max(progressValue, 0), safeMax);
  const progressPercent = Math.round((safeValue / safeMax) * 100);

  return (
    <section
      aria-labelledby="content-chapters-heading"
      className="flex min-w-0 flex-1 flex-col gap-6"
    >
      {/* Title + progress row */}
      <div className="space-y-3">
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

        <div className="flex flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-body text-xs text-obra-neutral-600">
                {t("wizard.content.progress.contentLabel")}
              </span>
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
      </div>

      {/* Chapter editor */}
      {current ? (
        <ChapterRichTextEditor
          key={`${current.id}-${richTextResetKey}`}
          value={bodyValue}
          onChange={onBodyChange}
          disabled={generateLoading}
          placeholder={t("wizard.content.chapters.bodyPlaceholder")}
        />
      ) : null}

      {/* Success alert */}
      {successMessage ? (
        <ObraAlert variant="success" title={successMessage} />
      ) : null}

      {/* Action toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {showAiGenerateButton ? (
          <Button
            type="button"
            variant="secondary"
            size="medium"
            disabled={generateDisabled}
            onClick={onGenerate}
          >
            {generateLoading && !generateAllLoading
              ? t("wizard.content.chapters.generateLoading")
              : t("wizard.content.chapters.generate")}
          </Button>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="medium"
          disabled={approveDisabled}
          onClick={onApprove}
        >
          {approveLoading
            ? t("wizard.content.chapters.approveLoading")
            : t("wizard.content.chapters.approve")}
        </Button>
      </div>
      <p className="font-body text-xs text-obra-neutral-600">{t("wizard.content.chapters.toolbarHint")}</p>

    </section>
  );
}

type ContentChapterNavProps = {
  t: TFunction;
  chapters: ChapterDraftRow[];
  selectedIndex: number;
  onSelectChapterIndex: (index: number) => void;
  generateLoading: boolean;
  /** Title of the selected parent item (ebook / bonus / bump name). */
  title?: string;
  /** When provided, shows "Generate all" button at the bottom of the sidebar. */
  onGenerateAll?: () => void;
  generateAllLoading?: boolean;
};

export function ContentChapterNav({
  t,
  chapters,
  selectedIndex,
  onSelectChapterIndex,
  generateLoading,
  title,
  onGenerateAll,
  generateAllLoading = false,
}: ContentChapterNavProps) {
  const [regenAllModalOpen, setRegenAllModalOpen] = useState(false);

  const allChaptersHaveContent = allChaptersHaveContentCheck(chapters);

  function handleGenerateAllClick() {
    if (generateAllLoading) {
      onGenerateAll?.();
      return;
    }
    if (allChaptersHaveContent) {
      setRegenAllModalOpen(true);
    } else {
      onGenerateAll?.();
    }
  }

  return (
    <>
      <nav
        aria-label={t("wizard.content.chapters.chapterListAria")}
        className="flex w-full shrink-0 flex-col border-b border-obra-neutral-200 bg-obra-neutral-100 lg:w-52 lg:border-b-0 lg:border-r lg:overflow-y-auto"
      >
        {title ? (
          <div className="border-b border-obra-neutral-200 px-3 py-2.5">
            <p className="truncate font-body text-xs font-semibold text-obra-blue-950">{title}</p>
          </div>
        ) : null}
        <ol className="flex flex-row gap-1 overflow-x-auto p-3 lg:flex-col lg:overflow-x-visible lg:flex-1">
          {chapters.map((ch, index) => {
            const isSel = index === selectedIndex;
            return (
              <li key={ch.id} className="shrink-0 lg:shrink">
                <button
                  type="button"
                  disabled={generateLoading || generateAllLoading}
                  onClick={() => onSelectChapterIndex(index)}
                  aria-current={isSel ? "true" : undefined}
                  className={[
                    "flex w-full items-start gap-2 rounded-md border px-3 py-2 text-left font-body text-sm transition-colors",
                    generateLoading || generateAllLoading ? "cursor-not-allowed opacity-50" : "",
                    isSel
                      ? "bg-obra-blue-900 text-white"
                      : "border-transparent text-obra-neutral-600 hover:bg-white/70 hover:text-obra-blue-950",
                  ].join(" ")}
                >
                  <span className="shrink-0 tabular-nums text-obra-neutral-400">{ch.sort_order}.</span>
                  <span className="min-w-0 flex-1 truncate">{ch.title || "—"}</span>
                  {ch.approved_at ? (
                    <Check className="size-4 shrink-0 text-obra-green-600" strokeWidth={2.5} aria-hidden />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ol>
        {onGenerateAll ? (
          <div className="hidden border-t border-obra-neutral-200 p-3 lg:block">
            <Button
              type="button"
              variant="secondary"
              size="small"
              className="w-full"
              onClick={handleGenerateAllClick}
              disabled={!generateAllLoading && generateLoading}
            >
              {generateAllLoading
                ? t("wizard.content.chapters.stopGenerateAll")
                : allChaptersHaveContent
                  ? t("wizard.content.chapters.regenerateAll")
                  : t("wizard.content.chapters.generateAll")}
            </Button>
          </div>
        ) : null}
      </nav>

      <Modal
        open={regenAllModalOpen}
        onClose={() => setRegenAllModalOpen(false)}
        closeLabel={t("wizard.content.chapters.regenerateAllConfirmCancel")}
      >
        <ModalHead>
          <ModalTitle>{t("wizard.content.chapters.regenerateAllConfirmTitle")}</ModalTitle>
        </ModalHead>
        <ModalContent>
          <p className="font-body text-sm text-obra-neutral-600">
            {t("wizard.content.chapters.regenerateAllConfirmBody")}
          </p>
        </ModalContent>
        <ModalFooter className="justify-end">
          <Button
            type="button"
            variant="tertiary"
            size="medium"
            onClick={() => setRegenAllModalOpen(false)}
          >
            {t("wizard.content.chapters.regenerateAllConfirmCancel")}
          </Button>
          <Button
            type="button"
            variant="primary"
            size="medium"
            onClick={() => {
              setRegenAllModalOpen(false);
              onGenerateAll?.();
            }}
          >
            {t("wizard.content.chapters.regenerateAllConfirmCta")}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
