import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import {
  applyLockedBonusSlotsOnly,
  applyLockedBumpSlotsOnly,
  fetchEbookIdsWithChapterContentWarnings,
  listProjectPackageEbooks,
  type ListedPackageEbook,
  type PackageSlotRow,
} from "@/lib/wizard/structurePackageLockedPersistence";
import type { ProjectRow } from "@/lib/wizard/structureTypes";

export type StructurePackageModifyKind = "bonus" | "bump";

type StructurePackageCountsModalProps = {
  kind: StructurePackageModifyKind;
  open: boolean;
  project: ProjectRow;
  onClose: () => void;
  onApplied: (patch: Pick<ProjectRow, "bonus_count" | "bump_count" | "bonus_items" | "bump_items">) => void;
};

function buildBonusDraft(project: ProjectRow, ebooks: ListedPackageEbook[]): PackageSlotRow[] {
  const bonusEbooks = ebooks.filter((row) => row.type === "bonus").sort((a, b) => a.package_ordinal - b.package_ordinal);
  const byOrdinal = new Map(bonusEbooks.map((row) => [row.package_ordinal, row]));
  const count = Math.max(project.bonus_count ?? 0, bonusEbooks.length);
  return Array.from({ length: count }, (_, ordinal) => {
    const ebook = byOrdinal.get(ordinal);
    const titleFromProject = project.bonus_items[ordinal]?.title;
    const fallbackTitle = ebook?.title?.trim() || "";
    const title = (titleFromProject ?? fallbackTitle).trim() || `Bonus ${ordinal + 1}`;
    return { ebookId: ebook?.id ?? null, title };
  });
}

function buildBumpDraft(project: ProjectRow, ebooks: ListedPackageEbook[]): PackageSlotRow[] {
  const bumpEbooks = ebooks
    .filter((row) => row.type === "order_bump")
    .sort((a, b) => a.package_ordinal - b.package_ordinal);
  const byOrdinal = new Map(bumpEbooks.map((row) => [row.package_ordinal, row]));
  const count = Math.max(project.bump_count ?? 0, bumpEbooks.length);
  return Array.from({ length: count }, (_, ordinal) => {
    const ebook = byOrdinal.get(ordinal);
    const titleFromProject = project.bump_items[ordinal]?.title;
    const fallbackTitle = ebook?.title?.trim() || "";
    const title = (titleFromProject ?? fallbackTitle).trim() || `Order bump ${ordinal + 1}`;
    return { ebookId: ebook?.id ?? null, title };
  });
}

export function StructurePackageCountsModal({
  kind,
  open,
  project,
  onClose,
  onApplied,
}: StructurePackageCountsModalProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bonusDraft, setBonusDraft] = useState<PackageSlotRow[]>([]);
  const [bumpDraft, setBumpDraft] = useState<PackageSlotRow[]>([]);
  const [warnedEbookIds, setWarnedEbookIds] = useState<Set<string>>(() => new Set());

  const resetFromProject = useCallback(async () => {
    setLoading(true);
    setError(null);
    const ebooks = await listProjectPackageEbooks(project.id);
    if (kind === "bonus") {
      setBonusDraft(buildBonusDraft(project, ebooks));
      setBumpDraft([]);
      const bonusEbooks = ebooks.filter((row) => row.type === "bonus");
      setWarnedEbookIds(await fetchEbookIdsWithChapterContentWarnings(bonusEbooks.map((row) => row.id)));
    } else {
      setBumpDraft(buildBumpDraft(project, ebooks));
      setBonusDraft([]);
      const bumpEbooks = ebooks.filter((row) => row.type === "order_bump");
      setWarnedEbookIds(await fetchEbookIdsWithChapterContentWarnings(bumpEbooks.map((row) => row.id)));
    }
    setLoading(false);
  }, [project, kind]);

  useEffect(() => {
    if (!open) return;
    void resetFromProject();
  }, [open, resetFromProject]);

  const warnedLookup = useMemo(() => warnedEbookIds, [warnedEbookIds]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    if (kind === "bonus") {
      const result = await applyLockedBonusSlotsOnly(project.id, bonusDraft, project.bump_count, project.bump_items);
      setSaving(false);
      if (!result.ok) {
        setError(t("wizard.structure.packageModify.saveError"));
        return;
      }
      onApplied({
        bonus_count: bonusDraft.length,
        bump_count: project.bump_count,
        bonus_items: bonusDraft.map((row) => ({ title: row.title, locked: false })),
        bump_items: project.bump_items,
      });
    } else {
      const result = await applyLockedBumpSlotsOnly(project.id, bumpDraft, project.bonus_count, project.bonus_items);
      setSaving(false);
      if (!result.ok) {
        setError(t("wizard.structure.packageModify.saveError"));
        return;
      }
      onApplied({
        bonus_count: project.bonus_count,
        bump_count: bumpDraft.length,
        bonus_items: project.bonus_items,
        bump_items: bumpDraft.map((row) => ({ title: row.title, locked: false })),
      });
    }
    onClose();
  };

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const titleKey =
    kind === "bonus" ? "wizard.structure.packageModify.titleBonus" : "wizard.structure.packageModify.titleBump";
  const subtitleKey =
    kind === "bonus" ? "wizard.structure.packageModify.subtitleBonus" : "wizard.structure.packageModify.subtitleBump";
  const closeKey =
    kind === "bonus" ? "wizard.structure.packageModify.closeAriaBonus" : "wizard.structure.packageModify.closeAriaBump";

  return (
    <Modal open={open} onClose={handleClose} closeLabel={t(closeKey)} surfaceClassName="max-w-2xl">
      <ModalHead>
        <ModalTitle>{t(titleKey)}</ModalTitle>
      </ModalHead>
      <ModalContent className="space-y-6 max-h-[70vh] overflow-y-auto">
        <p className="text-sm text-obra-neutral-600">{t(subtitleKey)}</p>
        {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
        {error ? (
          <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {kind === "bonus" ? (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-obra-blue-950">{t("wizard.structure.step3.bonusLabel")}</p>
              <Button
                type="button"
                size="small"
                variant="secondary"
                disabled={loading || saving || bonusDraft.length >= 5}
                onClick={() =>
                  setBonusDraft((current) => [
                    ...current,
                    { ebookId: null, title: t("wizard.structure.packageModify.newBonusTitle") },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden />
                {t("wizard.structure.packageModify.addBonus")}
              </Button>
            </div>
            <div className="space-y-2">
              {bonusDraft.map((row, index) => (
                <div
                  key={`${row.ebookId ?? "new"}-${index}`}
                  className="flex flex-col gap-2 rounded-card border border-obra-blue-100 bg-obra-blue-50/40 px-3 py-2 sm:flex-row sm:items-center"
                >
                  <label className="flex flex-1 flex-col gap-1 text-xs text-obra-neutral-600">
                    <span className="font-medium text-obra-blue-950">
                      {t("wizard.structure.packageModify.rowLabel", { index: index + 1 })}
                    </span>
                    <input
                      className="h-11 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm text-obra-neutral-900 placeholder:text-obra-neutral-400 focus:border-obra-blue-700 focus:outline-none focus:ring-2 focus:ring-obra-blue-700"
                      value={row.title}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBonusDraft((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item)),
                        );
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {row.ebookId && warnedLookup.has(row.ebookId) ? (
                      <p className="text-xs text-yellow-700">{t("wizard.structure.packageModify.contentWarning")}</p>
                    ) : null}
                    <Button
                      type="button"
                      size="small"
                      variant="tertiary"
                      className="shrink-0"
                      disabled={saving || bonusDraft.length === 0}
                      onClick={() => setBonusDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={t("wizard.structure.packageModify.removeBonusRow", { index: index + 1 })}
                    >
                      <Minus className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-obra-blue-950">{t("wizard.structure.step3.bumpLabel")}</p>
              <Button
                type="button"
                size="small"
                variant="secondary"
                disabled={loading || saving || bumpDraft.length >= 2}
                onClick={() =>
                  setBumpDraft((current) => [
                    ...current,
                    { ebookId: null, title: t("wizard.structure.packageModify.newBumpTitle") },
                  ])
                }
              >
                <Plus className="size-4" aria-hidden />
                {t("wizard.structure.packageModify.addBump")}
              </Button>
            </div>
            <div className="space-y-2">
              {bumpDraft.map((row, index) => (
                <div
                  key={`${row.ebookId ?? "new"}-${index}`}
                  className="flex flex-col gap-2 rounded-card border border-obra-blue-100 bg-obra-blue-50/40 px-3 py-2 sm:flex-row sm:items-center"
                >
                  <label className="flex flex-1 flex-col gap-1 text-xs text-obra-neutral-600">
                    <span className="font-medium text-obra-blue-950">
                      {t("wizard.structure.packageModify.rowLabel", { index: index + 1 })}
                    </span>
                    <input
                      className="h-11 w-full rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm text-obra-neutral-900 placeholder:text-obra-neutral-400 focus:border-obra-blue-700 focus:outline-none focus:ring-2 focus:ring-obra-blue-700"
                      value={row.title}
                      disabled={saving}
                      onChange={(event) => {
                        const value = event.target.value;
                        setBumpDraft((current) =>
                          current.map((item, itemIndex) => (itemIndex === index ? { ...item, title: value } : item)),
                        );
                      }}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    {row.ebookId && warnedLookup.has(row.ebookId) ? (
                      <p className="text-xs text-yellow-700">{t("wizard.structure.packageModify.contentWarning")}</p>
                    ) : null}
                    <Button
                      type="button"
                      size="small"
                      variant="tertiary"
                      className="shrink-0"
                      disabled={saving || bumpDraft.length === 0}
                      onClick={() => setBumpDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      aria-label={t("wizard.structure.packageModify.removeBumpRow", { index: index + 1 })}
                    >
                      <Minus className="size-4" aria-hidden />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </ModalContent>
      <ModalFooter className="justify-end">
        <Button type="button" variant="tertiary" disabled={saving} onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button type="button" variant="primary" disabled={loading || saving} onClick={() => void handleSave()}>
          {t("wizard.structure.packageModify.save")}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
