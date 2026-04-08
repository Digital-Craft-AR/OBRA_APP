import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import { ObraInput } from "@/components/obra/ObraInput";
import type { ContentPackageNavTarget } from "@/lib/wizard/contentNav";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";

export type { TocChapterRow } from "@/lib/wizard/tocTypes";

export type ContentNavItem = {
  key: string;
  label: string;
  target: ContentPackageNavTarget;
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
  confirmVisible?: boolean;
  onConfirmIndex?: () => void;
  confirmDisabled?: boolean;
  confirmLoading?: boolean;
  actionAnnouncement?: string | null;
};

function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 11)}`;
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
  confirmVisible,
  onConfirmIndex,
  confirmDisabled,
  confirmLoading,
  actionAnnouncement,
}: ContentIndexMilestoneProps) {
  const selected = navItems.find((item) => item.key === selectedKey) ?? navItems[0];
  const isMainToc = selected?.target.kind === "main";
  const readOnly = Boolean(tocReadOnly);

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

  function moveRow(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= tocRows.length) return;
    const copy = [...tocRows];
    const tmp = copy[index];
    copy[index] = copy[next]!;
    copy[next] = tmp!;
    onChangeToc(copy);
  }

  const navLabel = t("wizard.content.index.packageNavAria");

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 lg:flex-row lg:gap-8">
      <nav
        aria-label={navLabel}
        className="flex w-full shrink-0 flex-col gap-1 border-b border-obra-blue-100 pb-4 lg:w-64 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6"
      >
        <h2 className="font-body text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">
          {t("wizard.content.index.packageNavHeading")}
        </h2>
        <ul className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isCurrent = item.key === selectedKey;
            const disabled = navItemDisabled?.(item.key) ?? false;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) onSelectKey(item.key);
                  }}
                  aria-current={isCurrent ? "page" : undefined}
                  className={[
                    "w-full rounded-input border px-3 py-2.5 text-left font-body text-sm transition-colors",
                    disabled ? "cursor-not-allowed opacity-50" : "",
                    isCurrent
                      ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
                      : "border-transparent bg-white text-obra-neutral-600 hover:border-obra-blue-100 hover:bg-obra-blue-50/60",
                  ].join(" ")}
                >
                  {item.label}
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
          <p className="font-body text-xs text-obra-neutral-600">
            {t("wizard.content.index.regenerateOutlineHint")}
          </p>
        </div>

        {!isMainToc ? (
          <p className="rounded-card border border-obra-blue-100 bg-white px-4 py-3 font-body text-sm text-obra-neutral-600">
            {t("wizard.content.index.singleArtifactTocHint")}
          </p>
        ) : null}

        <ol className="space-y-3">
          {tocRows.map((row, index) => (
            <li
              key={row.id}
              className="rounded-card border border-obra-blue-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <ObraInput
                    id={`toc-${row.id}`}
                    label={t("wizard.content.index.chapterTitleLabel", { index: index + 1 })}
                    value={row.title}
                    onChange={(event) => updateRow(row.id, event.target.value)}
                    placeholder={t("wizard.content.index.chapterTitlePlaceholder")}
                    disabled={readOnly}
                  />
                </div>
                {isMainToc && !readOnly ? (
                  <div className="flex shrink-0 gap-1 sm:pt-7">
                    <button
                      type="button"
                      className="rounded-input border border-obra-neutral-200 p-2 text-obra-neutral-600 hover:bg-obra-blue-50 disabled:opacity-40"
                      aria-label={t("wizard.content.index.moveUpAria")}
                      disabled={index === 0}
                      onClick={() => moveRow(index, -1)}
                    >
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="rounded-input border border-obra-neutral-200 p-2 text-obra-neutral-600 hover:bg-obra-blue-50 disabled:opacity-40"
                      aria-label={t("wizard.content.index.moveDownAria")}
                      disabled={index === tocRows.length - 1}
                      onClick={() => moveRow(index, 1)}
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="rounded-input border border-obra-neutral-200 p-2 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      aria-label={t("wizard.content.index.removeChapterAria")}
                      disabled={tocRows.length <= 1}
                      onClick={() => removeRow(row.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {isMainToc && !readOnly ? (
          <div>
            <Button type="button" variant="tertiary" size="medium" onClick={addRow}>
              <Plus className="size-4" aria-hidden />
              {t("wizard.content.index.addChapter")}
            </Button>
          </div>
        ) : null}

        {confirmVisible && isMainToc ? (
          <div className="border-t border-obra-blue-100 pt-4">
            <Button
              type="button"
              variant="primary"
              size="medium"
              disabled={confirmDisabled || confirmLoading}
              onClick={() => onConfirmIndex?.()}
            >
              {confirmLoading ? t("wizard.content.index.confirmLoading") : t("wizard.content.index.confirmIndex")}
            </Button>
            <p className="mt-2 font-body text-xs text-obra-neutral-600">{t("wizard.content.index.confirmIndexHint")}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
