import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
import { supabase } from "@/lib/supabaseClient";

type AiOptimizeBaseResponse = {
  ok?: boolean;
  error?: string;
  stub?: boolean;
  field?: string;
  intent?: string;
  reason?: string;
};

type AiImproveResponse = AiOptimizeBaseResponse & {
  optimized?: string;
  topic_framing?: {
    optimized_title?: string;
    description?: string;
    niche?: string;
    angle?: string;
  };
  avatar_profile?: Record<string, unknown>;
  problem_framing?: Record<string, unknown>;
};

type AiSuggestResponse = AiOptimizeBaseResponse & {
  suggestions?: string[];
  titles?: string[];
  options?: string[];
};

export type ImproveField = "topic" | "target_avatar" | "problem";

function newClientRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export type ImproveWizardTextResult =
  | {
      ok: true;
      optimized: string | null;
      topicFraming?: AiImproveResponse["topic_framing"];
      avatarProfile?: Record<string, unknown>;
      problemFraming?: Record<string, unknown>;
    }
  | { ok: false; code: string | null };

export async function improveWizardText(args: {
  projectId: string;
  field: ImproveField;
  rawText: string;
  language: string;
  /** Optional: topic / avatar / problem context when not yet loaded on the server row */
  topic?: string;
  avatar?: string;
  problem?: string;
}): Promise<ImproveWizardTextResult> {
  const { data, error } = await supabase.functions.invoke<AiImproveResponse>("ai-optimize", {
    method: "POST",
    body: {
      project_id: args.projectId,
      client_request_id: newClientRequestId(),
      field: args.field,
      intent: "improve",
      raw_text: args.rawText,
      language: args.language,
      ...(args.topic !== undefined ? { topic: args.topic } : {}),
      ...(args.avatar !== undefined ? { avatar: args.avatar } : {}),
      ...(args.problem !== undefined ? { problem: args.problem } : {}),
    },
  });

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }
  if (!data) {
    return { ok: false, code: null };
  }
  if (data.ok === false) {
    return { ok: false, code: typeof data.error === "string" ? data.error : "bad_response" };
  }
  if (
    data.error &&
    !(typeof data.optimized === "string" && data.optimized.trim())
  ) {
    return { ok: false, code: typeof data.error === "string" ? data.error : "bad_response" };
  }

  if (typeof data.optimized === "string" && data.optimized.trim()) {
    return {
      ok: true,
      optimized: data.optimized,
      topicFraming: data.topic_framing,
      avatarProfile: data.avatar_profile,
      problemFraming: data.problem_framing,
    };
  }

  return { ok: true, optimized: null };
}

export type SuggestWizardTitlesResult =
  | { ok: true; suggestions: string[] }
  | { ok: false; suggestions: []; code: string | null };

export async function suggestWizardTitles(args: {
  projectId: string;
  topic: string;
  problem: string;
  avatar: string;
  contentLocale: string | null;
  language: string;
  count: number;
  lockedTitles?: string[];
  previousTitles?: string[];
}): Promise<SuggestWizardTitlesResult> {
  const { data, error } = await supabase.functions.invoke<AiSuggestResponse>("ai-optimize", {
    method: "POST",
    body: {
      project_id: args.projectId,
      client_request_id: newClientRequestId(),
      field: "main_title",
      intent: "suggest",
      topic: args.topic,
      problem: args.problem,
      avatar: args.avatar,
      content_locale: args.contentLocale,
      language: args.language,
      count: args.count,
      locked_titles: args.lockedTitles ?? [],
      previous_titles: args.previousTitles ?? [],
    },
  });

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, suggestions: [], code: code ?? "invoke_failed" };
  }
  if (!data || data.ok === false) {
    const c = data && typeof data.error === "string" ? data.error : null;
    return { ok: false, suggestions: [], code: c ?? "bad_response" };
  }

  const incoming =
    (Array.isArray(data.suggestions) ? data.suggestions : undefined) ??
    (Array.isArray(data.titles) ? data.titles : undefined) ??
    (Array.isArray(data.options) ? data.options : undefined) ??
    [];
  const suggestions = incoming
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, args.count);

  return { ok: true, suggestions };
}

export type SuggestSingleWizardTitleResult =
  | { ok: true; suggestion: string | null }
  | { ok: false; suggestion: null; code: string | null };

export async function suggestSingleWizardTitle(args: {
  projectId: string;
  field: "bonus_title" | "bump_title";
  topic: string;
  problem: string;
  avatar: string;
  language: string;
  contentLocale: string | null;
  ebookTitle: string;
  count?: number;
  lockedTitles?: string[];
  previousTitles?: string[];
}): Promise<SuggestSingleWizardTitleResult> {
  const { data, error } = await supabase.functions.invoke<AiSuggestResponse>("ai-optimize", {
    method: "POST",
    body: {
      project_id: args.projectId,
      client_request_id: newClientRequestId(),
      field: args.field,
      intent: "suggest",
      topic: args.topic,
      problem: args.problem,
      avatar: args.avatar,
      language: args.language,
      content_locale: args.contentLocale,
      ebook_title: args.ebookTitle,
      count: args.count ?? 1,
      locked_titles: args.lockedTitles ?? [],
      previous_titles: args.previousTitles ?? [],
    },
  });

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, suggestion: null, code: code ?? "invoke_failed" };
  }
  if (!data || data.ok === false) {
    const c = data && typeof data.error === "string" ? data.error : null;
    return { ok: false, suggestion: null, code: c ?? "bad_response" };
  }

  const incoming =
    (Array.isArray(data.suggestions) ? data.suggestions : undefined) ??
    (Array.isArray(data.titles) ? data.titles : undefined) ??
    (Array.isArray(data.options) ? data.options : undefined) ??
    [];
  const suggestion = incoming
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .find(Boolean);

  return { ok: true, suggestion: suggestion ?? null };
}
