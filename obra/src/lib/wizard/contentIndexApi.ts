import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
import { contentNavTargetToKey } from "@/lib/wizard/contentNav";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";

export const MAIN_TOC_MIN_CHAPTERS = 1;
export const MAIN_TOC_MAX_CHAPTERS = 60;

export type ContentWorkspacePayload = {
  main_ebook_id: string;
  current_phase: string;
  main_index_frozen_at: string | null;
  updated_at: string;
};

export type GenerateIndexResponse = {
  ok?: boolean;
  stub?: boolean;
  chapters?: { title: string }[];
  credits_balance_after?: number;
  error?: string;
};

export type ChapterDraftRow = {
  id: string;
  title: string;
  sort_order: number;
  content: string | null;
  approved_at: string | null;
};

export type GenerateChapterContentResponse = {
  ok?: boolean;
  stub?: boolean;
  content?: string;
  credits_balance_after?: number;
  error?: string;
};

export function validateMainTocForConfirm(rows: { title: string }[]): "ok" | "too_few" | "too_many" | "empty_title" {
  if (rows.length < MAIN_TOC_MIN_CHAPTERS) return "too_few";
  if (rows.length > MAIN_TOC_MAX_CHAPTERS) return "too_many";
  for (const r of rows) {
    if (!r.title.trim()) return "empty_title";
  }
  return "ok";
}

function normalizeUpdatedAt(value: unknown): string | null {
  if (typeof value === "string" && value.length > 0) return value;
  return null;
}

function buildWorkspacePayload(
  mainEbookId: string,
  prog: {
    current_phase: string;
    main_index_frozen_at: string | null;
    updated_at: unknown;
  },
): ContentWorkspacePayload | null {
  const updatedAt = normalizeUpdatedAt(prog.updated_at);
  if (!updatedAt) return null;
  return {
    main_ebook_id: mainEbookId,
    current_phase: prog.current_phase,
    main_index_frozen_at: prog.main_index_frozen_at,
    updated_at: updatedAt,
  };
}

function readTitleFromJsonArray(items: unknown, index: number): string {
  if (!Array.isArray(items)) return "";
  const o = items[index] as { title?: unknown } | undefined;
  return typeof o?.title === "string" ? o.title : "";
}

/**
 * Maps `bonus:0` / `bump:1` nav keys to `ebooks.id` for the project.
 * `bumpIndexFrozenAt` is only set for `bump:n` keys (`ebooks.index_frozen_at`).
 */
export async function fetchPackageEbookIdMap(
  projectId: string,
): Promise<
  { ok: true; map: Record<string, string>; bumpIndexFrozenAt: Record<string, string | null> } | { ok: false }
> {
  const { data, error } = await supabase
    .from("ebooks")
    .select("id, type, package_ordinal, index_frozen_at")
    .eq("project_id", projectId)
    .in("type", ["bonus", "order_bump"]);

  if (error || !data) return { ok: false };
  const map: Record<string, string> = {};
  const bumpIndexFrozenAt: Record<string, string | null> = {};
  for (const row of data) {
    const ord = Number(row.package_ordinal);
    if (!Number.isInteger(ord) || ord < 0) continue;
    if (row.type === "bonus") {
      map[contentNavTargetToKey({ kind: "bonus", index: ord })] = row.id as string;
    } else if (row.type === "order_bump") {
      const key = contentNavTargetToKey({ kind: "bump", index: ord });
      map[key] = row.id as string;
      bumpIndexFrozenAt[key] = (row.index_frozen_at as string | null) ?? null;
    }
  }
  return { ok: true, map, bumpIndexFrozenAt };
}

/**
 * Ensures `project_content_progress`, main `ebooks` row, and one `ebooks` row per bonus / order bump slot.
 */
export async function ensureContentWorkspace(projectId: string): Promise<
  { ok: true; data: ContentWorkspacePayload } | { ok: false; code: string }
> {
  const { data: proj, error: projErr } = await supabase
    .from("projects")
    .select(
      "id, structure_completed_at, content_source, main_title, bonus_count, bump_count, bonus_items, bump_items",
    )
    .eq("id", projectId)
    .maybeSingle();

  if (projErr) return { ok: false, code: "db_error" };
  if (!proj?.id) return { ok: false, code: "forbidden" };
  if (!proj.structure_completed_at) return { ok: false, code: "structure_not_complete" };

  const phase = proj.content_source === "upload" ? "upload_alignment" : "main_index";

  const { error: progInsertErr } = await supabase.from("project_content_progress").insert({
    project_id: projectId,
    current_phase: phase,
  });
  if (progInsertErr && progInsertErr.code !== "23505") {
    return { ok: false, code: "db_error" };
  }

  const { data: existingMain } = await supabase
    .from("ebooks")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "main")
    .maybeSingle();

  if (!existingMain) {
    const title = typeof proj.main_title === "string" ? proj.main_title : "";
    const { error: ebookInsErr } = await supabase.from("ebooks").insert({
      project_id: projectId,
      type: "main",
      package_ordinal: 0,
      title,
    });
    if (ebookInsErr && ebookInsErr.code !== "23505") {
      return { ok: false, code: "db_error" };
    }
  }

  const bonusCount = Math.max(0, Math.floor(Number(proj.bonus_count) || 0));
  const bumpCount = Math.max(0, Math.floor(Number(proj.bump_count) || 0));

  const bonusUpserts = Array.from({ length: bonusCount }, (_, i) => ({
    project_id: projectId,
    type: "bonus" as const,
    package_ordinal: i,
    title: readTitleFromJsonArray(proj.bonus_items, i).trim() || null,
  }));
  if (bonusUpserts.length > 0) {
    const { error: bErr } = await supabase.from("ebooks").upsert(bonusUpserts, {
      onConflict: "project_id,type,package_ordinal",
    });
    if (bErr) return { ok: false, code: "db_error" };
  }

  const bumpUpserts = Array.from({ length: bumpCount }, (_, i) => ({
    project_id: projectId,
    type: "order_bump" as const,
    package_ordinal: i,
    title: readTitleFromJsonArray(proj.bump_items, i).trim() || null,
  }));
  if (bumpUpserts.length > 0) {
    const { error: uErr } = await supabase.from("ebooks").upsert(bumpUpserts, {
      onConflict: "project_id,type,package_ordinal",
    });
    if (uErr) return { ok: false, code: "db_error" };
  }

  const { data: ebookRow, error: ebookErr } = await supabase
    .from("ebooks")
    .select("id")
    .eq("project_id", projectId)
    .eq("type", "main")
    .maybeSingle();

  if (ebookErr || !ebookRow?.id) return { ok: false, code: "db_error" };

  const { data: progRow, error: progSelErr } = await supabase
    .from("project_content_progress")
    .select("current_phase, main_index_frozen_at, updated_at")
    .eq("project_id", projectId)
    .maybeSingle();

  if (progSelErr || !progRow?.current_phase) return { ok: false, code: "db_error" };

  const payload = buildWorkspacePayload(ebookRow.id as string, {
    current_phase: progRow.current_phase as string,
    main_index_frozen_at: (progRow.main_index_frozen_at as string | null) ?? null,
    updated_at: progRow.updated_at,
  });
  if (!payload) return { ok: false, code: "db_error" };
  return { ok: true, data: payload };
}

export async function loadEbookChapters(
  ebookId: string,
): Promise<{ ok: true; rows: TocChapterRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, sort_order")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return { ok: false };
  const rows: TocChapterRow[] = data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
  }));
  return { ok: true, rows };
}

export async function loadEbookChaptersDraft(
  ebookId: string,
): Promise<{ ok: true; rows: ChapterDraftRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, sort_order, content, approved_at")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return { ok: false };
  const rows: ChapterDraftRow[] = data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    sort_order: Number(row.sort_order) || 0,
    content: (row.content as string | null) ?? null,
    approved_at: (row.approved_at as string | null) ?? null,
  }));
  return { ok: true, rows };
}

export async function updateChapterDraftContent(
  chapterId: string,
  content: string,
): Promise<{ ok: true } | { ok: false }> {
  const { error } = await supabase
    .from("chapters")
    .update({ content, approved_at: null })
    .eq("id", chapterId);

  if (error) return { ok: false };
  return { ok: true };
}

export async function approveChapterBody(chapterId: string): Promise<{ ok: true } | { ok: false }> {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("chapters")
    .update({ approved_at: now })
    .eq("id", chapterId);

  if (error) return { ok: false };
  return { ok: true };
}

/** @deprecated Use `loadEbookChapters` */
export const loadMainEbookChapters = loadEbookChapters;

export async function replaceEbookDraftChapters(
  ebookId: string,
  titles: string[],
): Promise<{ ok: true } | { ok: false }> {
  const { error: delError } = await supabase
    .from("chapters")
    .delete()
    .eq("ebook_id", ebookId)
    .is("approved_at", null);

  if (delError) return { ok: false };

  if (titles.length === 0) return { ok: true };

  const inserts = titles.map((title, index) => ({
    ebook_id: ebookId,
    sort_order: index + 1,
    title: title.trim() || " ",
  }));

  const { error: insError } = await supabase.from("chapters").insert(inserts);
  if (insError) return { ok: false };
  return { ok: true };
}

/** @deprecated Use `replaceEbookDraftChapters` */
export const replaceMainEbookDraftChapters = replaceEbookDraftChapters;

export async function upsertEbookDraftChaptersFromRows(
  ebookId: string,
  rows: TocChapterRow[],
): Promise<{ ok: true; rows: TocChapterRow[] } | { ok: false }> {
  const titles = rows.map((r) => r.title);
  const okReplace = await replaceEbookDraftChapters(ebookId, titles);
  if (!okReplace.ok) return { ok: false };
  const loaded = await loadEbookChapters(ebookId);
  if (!loaded.ok) return { ok: false };
  return { ok: true, rows: loaded.rows };
}

/** @deprecated Use `upsertEbookDraftChaptersFromRows` */
export const upsertMainEbookDraftChaptersFromRows = upsertEbookDraftChaptersFromRows;

/** Freezes the order-bump TOC (draft chapter titles become read-only in the index step). */
export async function confirmOrderBumpIndex(ebookId: string): Promise<
  { ok: true; frozen_at: string } | { ok: false; code: "update_failed" | "wrong_state" }
> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ebooks")
    .update({ index_frozen_at: now, updated_at: now })
    .eq("id", ebookId)
    .eq("type", "order_bump")
    .is("index_frozen_at", null)
    .select("index_frozen_at")
    .maybeSingle();

  if (error) return { ok: false, code: "update_failed" };
  if (!data?.index_frozen_at) return { ok: false, code: "wrong_state" };
  return { ok: true, frozen_at: data.index_frozen_at as string };
}

export async function confirmMainIndex(projectId: string): Promise<
  { ok: true } | { ok: false; code: "wrong_phase" | "update_failed" }
> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("project_content_progress")
    .update({
      main_index_frozen_at: now,
      current_phase: "main_chapter",
      updated_at: now,
    })
    .eq("project_id", projectId)
    .eq("current_phase", "main_index")
    .is("main_index_frozen_at", null)
    .select("project_id")
    .maybeSingle();

  if (error) return { ok: false, code: "update_failed" };
  if (!data) return { ok: false, code: "wrong_phase" };
  return { ok: true };
}

export async function invokeGenerateIndex(
  projectId: string,
  clientRequestId: string,
  options?: { targetEbookId?: string },
): Promise<
  | { ok: true; titles: string[]; creditsBalanceAfter?: number }
  | { ok: false; code: string }
> {
  const body: Record<string, string> = {
    project_id: projectId,
    client_request_id: clientRequestId,
  };
  if (options?.targetEbookId) {
    body.target_ebook_id = options.targetEbookId;
  }
  const { data, error } = await supabase.functions.invoke<GenerateIndexResponse>("ai-generate-index", {
    body,
  });

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }
  if (!data?.ok || !Array.isArray(data.chapters)) {
    const err = typeof data?.error === "string" ? data.error : "bad_response";
    return { ok: false, code: err };
  }
  const titles = data.chapters.map((c) => (typeof c.title === "string" ? c.title : "")).filter(Boolean);
  if (titles.length === 0) return { ok: false, code: "empty_chapters" };
  return {
    ok: true,
    titles,
    creditsBalanceAfter: data.credits_balance_after,
  };
}

export async function invokeGenerateChapterContent(
  projectId: string,
  chapterId: string,
  clientRequestId: string,
): Promise<
  | { ok: true; content: string; creditsBalanceAfter?: number }
  | { ok: false; code: string }
> {
  const { data, error } = await supabase.functions.invoke<GenerateChapterContentResponse>("ai-generate-content", {
    body: {
      project_id: projectId,
      chapter_id: chapterId,
      client_request_id: clientRequestId,
    },
  });

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }
  if (!data?.ok || typeof data.content !== "string" || !data.content.trim()) {
    const err = typeof data?.error === "string" ? data.error : "bad_response";
    return { ok: false, code: err };
  }
  return {
    ok: true,
    content: data.content,
    creditsBalanceAfter: data.credits_balance_after,
  };
}
