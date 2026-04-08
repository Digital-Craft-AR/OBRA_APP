import { supabase } from "@/lib/supabaseClient";

type AiOptimizeBaseResponse = {
  ok?: boolean;
  error?: string;
  stub?: boolean;
  field?: string;
  intent?: string;
};

type AiImproveResponse = AiOptimizeBaseResponse & {
  optimized?: string;
};

type AiSuggestResponse = AiOptimizeBaseResponse & {
  suggestions?: string[];
  titles?: string[];
  options?: string[];
};

export type ImproveField = "topic" | "target_avatar" | "problem";

export async function improveWizardText(args: {
  field: ImproveField;
  rawText: string;
  language: string;
}) {
  const { data, error } = await supabase.functions.invoke<AiImproveResponse>("ai-optimize", {
    method: "POST",
    body: {
      field: args.field,
      intent: "improve",
      raw_text: args.rawText,
      language: args.language,
    },
  });

  if (error || data?.error) {
    return { ok: false as const };
  }

  if (typeof data?.optimized === "string" && data.optimized.trim()) {
    return { ok: true as const, optimized: data.optimized };
  }

  return { ok: true as const, optimized: null };
}

export async function suggestWizardTitles(args: {
  topic: string;
  problem: string;
  avatar: string;
  contentLocale: string | null;
  language: string;
  count: number;
}) {
  const { data, error } = await supabase.functions.invoke<AiSuggestResponse>("ai-optimize", {
    method: "POST",
    body: {
      field: "main_title",
      intent: "suggest",
      topic: args.topic,
      problem: args.problem,
      avatar: args.avatar,
      content_locale: args.contentLocale,
      language: args.language,
      count: args.count,
    },
  });

  if (error || data?.error) {
    return { ok: false as const, suggestions: [] as string[] };
  }

  const incoming =
    (Array.isArray(data?.suggestions) ? data.suggestions : undefined) ??
    (Array.isArray(data?.titles) ? data.titles : undefined) ??
    (Array.isArray(data?.options) ? data.options : undefined) ??
    [];
  const suggestions = incoming
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean)
    .slice(0, args.count);

  return { ok: true as const, suggestions };
}

export async function suggestSingleWizardTitle(args: {
  field: "bonus_title" | "bump_title";
  topic: string;
  problem: string;
  avatar: string;
  language: string;
}) {
  const { data, error } = await supabase.functions.invoke<AiSuggestResponse>("ai-optimize", {
    method: "POST",
    body: {
      field: args.field,
      intent: "suggest",
      topic: args.topic,
      problem: args.problem,
      avatar: args.avatar,
      language: args.language,
      count: 1,
    },
  });

  if (error || data?.error) {
    return { ok: false as const, suggestion: null as string | null };
  }

  const incoming =
    (Array.isArray(data?.suggestions) ? data.suggestions : undefined) ??
    (Array.isArray(data?.titles) ? data.titles : undefined) ??
    (Array.isArray(data?.options) ? data.options : undefined) ??
    [];
  const suggestion = incoming
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .find(Boolean);

  return { ok: true as const, suggestion: suggestion ?? null };
}
