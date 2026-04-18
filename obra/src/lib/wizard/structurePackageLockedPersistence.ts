import { supabase } from "@/lib/supabaseClient";
import type { WizardTitleItem } from "@/lib/wizard/structureTypes";

export type PackageSlotRow = {
  ebookId: string | null;
  title: string;
};

export type ListedPackageEbook = {
  id: string;
  type: "bonus" | "order_bump";
  package_ordinal: number;
  title: string | null;
};

const TEMP_ORDINAL_BASE = 3000;

export function isValidLockedPackageDraft(bonusRows: PackageSlotRow[], bumpRows: PackageSlotRow[]): boolean {
  return bonusRows.length <= 5 && bumpRows.length <= 2;
}

export function isValidBonusDraftOnly(rows: PackageSlotRow[]): boolean {
  return rows.length <= 5;
}

export function isValidBumpDraftOnly(rows: PackageSlotRow[]): boolean {
  return rows.length <= 2;
}

export async function listProjectPackageEbooks(projectId: string): Promise<ListedPackageEbook[]> {
  const { data, error } = await supabase
    .from("ebooks")
    .select("id,type,package_ordinal,title")
    .eq("project_id", projectId)
    .in("type", ["bonus", "order_bump"])
    .order("type", { ascending: true })
    .order("package_ordinal", { ascending: true });

  if (error || !data) return [];
  return data as ListedPackageEbook[];
}

export async function fetchEbookIdsWithChapterContentWarnings(ebookIds: string[]): Promise<Set<string>> {
  if (ebookIds.length === 0) return new Set();
  const { data, error } = await supabase.from("chapters").select("ebook_id,content,approved_at").in("ebook_id", ebookIds);
  if (error || !data) return new Set();
  const warned = new Set<string>();
  for (const row of data as { ebook_id: string; content: string | null; approved_at: string | null }[]) {
    const hasBody = Boolean(row.content && row.content.trim().length > 0);
    const approved = Boolean(row.approved_at);
    if (hasBody || approved) warned.add(row.ebook_id);
  }
  return warned;
}

async function applyTypeSlots(projectId: string, type: "bonus" | "order_bump", draft: PackageSlotRow[]): Promise<boolean> {
  const { data: existing, error: existingError } = await supabase
    .from("ebooks")
    .select("id,package_ordinal")
    .eq("project_id", projectId)
    .eq("type", type)
    .order("package_ordinal", { ascending: true });

  if (existingError) return false;

  const keepIds = new Set(
    draft
      .map((row) => row.ebookId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const deleteIds = (existing ?? []).map((row) => row.id).filter((id) => !keepIds.has(id));
  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase.from("ebooks").delete().in("id", deleteIds);
    if (deleteError) return false;
  }

  const { data: survivors, error: survivorsError } = await supabase
    .from("ebooks")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", type)
    .order("package_ordinal", { ascending: true });

  if (survivorsError) return false;

  for (let i = 0; i < (survivors ?? []).length; i++) {
    const id = survivors![i].id;
    const { error: tempError } = await supabase
      .from("ebooks")
      .update({ package_ordinal: TEMP_ORDINAL_BASE + i })
      .eq("id", id);
    if (tempError) return false;
  }

  let nextOrdinal = 0;
  for (const row of draft) {
    if (row.ebookId) {
      const { error: updateError } = await supabase
        .from("ebooks")
        .update({ package_ordinal: nextOrdinal, title: row.title || "" })
        .eq("id", row.ebookId);
      if (updateError) return false;
      nextOrdinal += 1;
    } else {
      const { error: insertError } = await supabase.from("ebooks").insert({
        project_id: projectId,
        type,
        package_ordinal: nextOrdinal,
        title: row.title || "",
      });
      if (insertError) return false;
      nextOrdinal += 1;
    }
  }

  return true;
}

export async function applyLockedPackageSlots(
  projectId: string,
  bonusRows: PackageSlotRow[],
  bumpRows: PackageSlotRow[],
): Promise<{ ok: boolean }> {
  if (!isValidLockedPackageDraft(bonusRows, bumpRows)) return { ok: false };

  const bonusItems: WizardTitleItem[] = bonusRows.map((row) => ({ title: row.title, locked: false }));
  const bumpItems: WizardTitleItem[] = bumpRows.map((row) => ({ title: row.title, locked: false }));

  const bonusOk = await applyTypeSlots(projectId, "bonus", bonusRows);
  if (!bonusOk) return { ok: false };

  const bumpOk = await applyTypeSlots(projectId, "order_bump", bumpRows);
  if (!bumpOk) return { ok: false };

  const { error: projectError } = await supabase
    .from("projects")
    .update({
      bonus_count: bonusRows.length,
      bump_count: bumpRows.length,
      bonus_items: bonusItems,
      bump_items: bumpItems,
    })
    .eq("id", projectId);

  if (projectError) return { ok: false };
  return { ok: true };
}

/** Updates bonus ebooks + project bonus fields only; leaves bump rows and counts as provided. */
export async function applyLockedBonusSlotsOnly(
  projectId: string,
  bonusRows: PackageSlotRow[],
  bumpCount: number,
  bumpItems: WizardTitleItem[],
): Promise<{ ok: boolean }> {
  if (!isValidBonusDraftOnly(bonusRows)) return { ok: false };
  if (bumpCount < 0 || bumpCount > 2) return { ok: false };

  const bonusOk = await applyTypeSlots(projectId, "bonus", bonusRows);
  if (!bonusOk) return { ok: false };

  const bonusItems: WizardTitleItem[] = bonusRows.map((row) => ({ title: row.title, locked: false }));
  const { error } = await supabase
    .from("projects")
    .update({
      bonus_count: bonusRows.length,
      bonus_items: bonusItems,
      bump_count: bumpCount,
      bump_items: bumpItems,
    })
    .eq("id", projectId);

  if (error) return { ok: false };
  return { ok: true };
}

/** Updates order bump ebooks + project bump fields only; leaves bonus rows and counts as provided. */
export async function applyLockedBumpSlotsOnly(
  projectId: string,
  bumpRows: PackageSlotRow[],
  bonusCount: number,
  bonusItems: WizardTitleItem[],
): Promise<{ ok: boolean }> {
  if (!isValidBumpDraftOnly(bumpRows)) return { ok: false };
  if (bonusCount < 0 || bonusCount > 5) return { ok: false };

  const bumpOk = await applyTypeSlots(projectId, "order_bump", bumpRows);
  if (!bumpOk) return { ok: false };

  const bumpItems: WizardTitleItem[] = bumpRows.map((row) => ({ title: row.title, locked: false }));
  const { error } = await supabase
    .from("projects")
    .update({
      bonus_count: bonusCount,
      bonus_items: bonusItems,
      bump_count: bumpRows.length,
      bump_items: bumpItems,
    })
    .eq("id", projectId);

  if (error) return { ok: false };
  return { ok: true };
}
