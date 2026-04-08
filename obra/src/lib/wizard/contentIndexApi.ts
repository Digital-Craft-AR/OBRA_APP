import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
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

export function validateMainTocForConfirm(rows: { title: string }[]): "ok" | "too_few" | "too_many" | "empty_title" {
  if (rows.length < MAIN_TOC_MIN_CHAPTERS) return "too_few";
  if (rows.length > MAIN_TOC_MAX_CHAPTERS) return "too_many";
  for (const r of rows) {
    if (!r.title.trim()) return "empty_title";
  }
  return "ok";
}

function parseWorkspacePayload(raw: unknown): ContentWorkspacePayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const mainEbookId = typeof o.main_ebook_id === "string" ? o.main_ebook_id : null;
  const currentPhase = typeof o.current_phase === "string" ? o.current_phase : null;
  const updatedAt = typeof o.updated_at === "string" ? o.updated_at : null;
  if (!mainEbookId || !currentPhase || !updatedAt) return null;
  const frozen = o.main_index_frozen_at;
  const main_index_frozen_at =
    frozen === null || typeof frozen === "string" ? (frozen as string | null) : null;
  return {
    main_ebook_id: mainEbookId,
    current_phase: currentPhase,
    main_index_frozen_at,
    updated_at: updatedAt,
  };
}

export async function ensureContentWorkspace(projectId: string): Promise<
  { ok: true; data: ContentWorkspacePayload } | { ok: false; code: string }
> {
  const { data, error } = await supabase.rpc("obra_ensure_content_workspace", {
    p_project_id: projectId,
  });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("structure_not_complete")) return { ok: false, code: "structure_not_complete" };
    if (msg.includes("forbidden") || msg.includes("project_not_found")) return { ok: false, code: "forbidden" };
    return { ok: false, code: "rpc_error" };
  }
  const parsed = parseWorkspacePayload(data);
  if (!parsed) return { ok: false, code: "invalid_payload" };
  return { ok: true, data: parsed };
}

export async function loadMainEbookChapters(
  mainEbookId: string,
): Promise<{ ok: true; rows: TocChapterRow[] } | { ok: false }> {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, title, sort_order")
    .eq("ebook_id", mainEbookId)
    .order("sort_order", { ascending: true });

  if (error || !data) return { ok: false };
  const rows: TocChapterRow[] = data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
  }));
  return { ok: true, rows };
}

export async function replaceMainEbookDraftChapters(
  mainEbookId: string,
  titles: string[],
): Promise<{ ok: true } | { ok: false }> {
  const { error: delError } = await supabase
    .from("chapters")
    .delete()
    .eq("ebook_id", mainEbookId)
    .is("approved_at", null);

  if (delError) return { ok: false };

  if (titles.length === 0) return { ok: true };

  const inserts = titles.map((title, index) => ({
    ebook_id: mainEbookId,
    sort_order: index + 1,
    title: title.trim() || " ",
  }));

  const { error: insError } = await supabase.from("chapters").insert(inserts);
  if (insError) return { ok: false };
  return { ok: true };
}

export async function upsertMainEbookDraftChaptersFromRows(
  mainEbookId: string,
  rows: TocChapterRow[],
): Promise<{ ok: true; rows: TocChapterRow[] } | { ok: false }> {
  const titles = rows.map((r) => r.title);
  const okReplace = await replaceMainEbookDraftChapters(mainEbookId, titles);
  if (!okReplace.ok) return { ok: false };
  const loaded = await loadMainEbookChapters(mainEbookId);
  if (!loaded.ok) return { ok: false };
  return { ok: true, rows: loaded.rows };
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
): Promise<
  | { ok: true; titles: string[]; creditsBalanceAfter?: number }
  | { ok: false; code: string }
> {
  const { data, error } = await supabase.functions.invoke<GenerateIndexResponse>("ai-generate-index", {
    body: { project_id: projectId, client_request_id: clientRequestId },
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
