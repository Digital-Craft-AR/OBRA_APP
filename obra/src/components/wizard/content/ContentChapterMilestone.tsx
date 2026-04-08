import { Book, Check, Gift } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import type { ChapterDraftRow } from "@/lib/wizard/contentIndexApi";
import type { ContentNavItem } from "@/components/wizard/content/ContentIndexMilestone";

type ContentChapterMilestoneProps = {
  t: TFunction;
  navItems: ContentNavItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  navItemDisabled?: (key: string) => boolean;
  panelTitle: string;
  panelSubtitle: string;
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
  actionAnnouncement?: string | null;
};

export function ContentChapterMilestone({
  t,
  navItems,
  selectedKey,
  onSelectKey,
  navItemDisabled,
  panelTitle,
  panelSubtitle,
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
  actionAnnouncement,
}: ContentChapterMilestoneProps) {
  const navLabel = t("wizard.content.index.packageNavAria");
  const listLabel = t("wizard.content.chapters.chapterListAria");
  const current = chapters[selectedIndex];
  const dirty = current ? bodyValue !== (current.content ?? "") : false;
  const generateDisabled = generateLoading || !current?.title?.trim();
  const saveDisabled = saveLoading || !dirty;
  const approveDisabled =
    approveLoading || !bodyValue.trim() || dirty || Boolean(current?.approved_at);

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
            <p className="font-body text-sm text-obra-neutral-600">{panelSubtitle}</p>
          </div>

          {current ? (
            <p className="font-body text-sm font-medium text-obra-blue-950">{current.title}</p>
          ) : null}

          {actionAnnouncement ? (
            <p role="status" aria-live="polite" className="font-body text-sm text-obra-blue-950">
              {actionAnnouncement}
            </p>
          ) : null}

          <textarea
            value={bodyValue}
            onChange={(e) => onBodyChange(e.target.value)}
            disabled={!current}
            rows={16}
            placeholder={t("wizard.content.chapters.bodyPlaceholder")}
            className="min-h-[12rem] w-full resize-y rounded-xl border border-obra-neutral-200 bg-white px-4 py-3 font-body text-sm text-obra-blue-950 outline-none ring-obra-blue-400 placeholder:text-obra-neutral-400 focus:border-obra-blue-400 focus:ring-2 focus:ring-obra-blue-400/30 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t("wizard.content.chapters.bodyAria")}
          />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="medium"
              disabled={generateDisabled}
              onClick={onGenerate}
            >
              {generateLoading ? t("wizard.content.chapters.generateLoading") : t("wizard.content.chapters.generate")}
            </Button>
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
    </div>
  );
}
