import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";

// ── Split proposal ────────────────────────────────────────────────────────────

export type SplitProposalChapter = {
  order: number;
  title: string;
  start_heading: string;
};

export type AiSplitProposalOk = {
  ok: true;
  chapters: SplitProposalChapter[];
  warnings: string[];
};

export type AiSplitProposalErr = {
  ok: false;
  code: string;
};

type SplitProposalResponse = {
  chapters?: unknown[];
  warnings?: unknown[];
  error?: string;
};

/**
 * Upload path: asks Claude to analyze the extracted manuscript text and propose
 * a chapter structure (titles + verbatim start_heading markers).
 * Does not consume credits — credit deduction is deferred to approve-alignment.
 */
export async function invokeAiSplitProposal(
  projectId: string,
): Promise<AiSplitProposalOk | AiSplitProposalErr> {
  const { data, error } = await supabase.functions.invoke<SplitProposalResponse>(
    "ai-split-proposal",
    { body: { project_id: projectId } },
  );

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }

  if (typeof data?.error === "string") {
    return { ok: false, code: data.error };
  }

  if (!Array.isArray(data?.chapters) || data.chapters.length === 0) {
    return { ok: false, code: "empty_chapters" };
  }

  const chapters: SplitProposalChapter[] = [];
  for (const c of data.chapters) {
    if (typeof c !== "object" || c === null) return { ok: false, code: "bad_response" };
    const row = c as Record<string, unknown>;
    const order = typeof row.order === "number" ? row.order : Number(row.order);
    const title = typeof row.title === "string" ? row.title.trim() : "";
    const start_heading = typeof row.start_heading === "string" ? row.start_heading.trim() : "";
    if (!Number.isFinite(order) || !title || !start_heading) return { ok: false, code: "bad_response" };
    chapters.push({ order, title, start_heading });
  }

  const warnings: string[] = Array.isArray(data.warnings)
    ? data.warnings.filter((w): w is string => typeof w === "string")
    : [];

  return { ok: true, chapters, warnings };
}

// ── Approve alignment ─────────────────────────────────────────────────────────

export type ApproveAlignmentOk = {
  ok: true;
  chapter_count: number;
  first_chapter_id: string;
};

export type ApproveAlignmentErr = {
  ok: false;
  code: string;
};

type ApproveAlignmentResponse = {
  ok?: boolean;
  chapter_count?: number;
  first_chapter_id?: string;
  error?: string;
};

/**
 * Upload path: sends the user-approved chapter list to the edge function, which
 * slices the manuscript text by start_heading markers, converts to HTML,
 * persists chapters, and advances the phase to main_chapter.
 */
export async function invokeApproveAlignment(
  projectId: string,
  chapters: SplitProposalChapter[],
): Promise<ApproveAlignmentOk | ApproveAlignmentErr> {
  const { data, error } = await supabase.functions.invoke<ApproveAlignmentResponse>(
    "approve-alignment",
    { body: { project_id: projectId, chapters } },
  );

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }

  if (typeof data?.error === "string") {
    return { ok: false, code: data.error };
  }

  if (
    !data?.ok ||
    typeof data.chapter_count !== "number" ||
    typeof data.first_chapter_id !== "string"
  ) {
    return { ok: false, code: "bad_response" };
  }

  return {
    ok: true,
    chapter_count: data.chapter_count,
    first_chapter_id: data.first_chapter_id,
  };
}
