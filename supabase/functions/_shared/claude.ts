/**
 * Anthropic Messages API helper for Edge Functions. Never log full prompts or user content.
 */

const ANTHROPIC_VERSION = "2023-06-01";

export type ClaudeResult =
  | { ok: true; text: string }
  | { ok: false; error: "anthropic_not_configured" | "anthropic_http_error" | "anthropic_empty_response" };

type AnthropicContentBlock = { type: string; text?: string };

type AnthropicMessageResponse = {
  content?: AnthropicContentBlock[];
  error?: { message?: string };
};

function getApiKey(): string | null {
  const k = Deno.env.get("ANTHROPIC_API_KEY");
  return k && k.trim() ? k.trim() : null;
}

export function getClaudeModel(): string {
  const m = Deno.env.get("CLAUDE_MODEL");
  return m && m.trim() ? m.trim() : "claude-sonnet-4-20250514";
}

export function getClaudeChapterModel(): string {
  const m = Deno.env.get("CLAUDE_CHAPTER_MODEL");
  return m && m.trim() ? m.trim() : "claude-haiku-4-5-20251001";
}

export async function callClaudeJsonText(args: {
  system: string;
  user: string;
  maxTokens: number;
  temperature?: number;
  model?: string;
}): Promise<ClaudeResult> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, error: "anthropic_not_configured" };
  }

  const model = args.model ?? getClaudeModel();
  const controller = new AbortController();
  const timeoutMs = Number(Deno.env.get("CLAUDE_REQUEST_TIMEOUT_MS") ?? "120000");
  const tid = setTimeout(() => controller.abort(), Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 120_000);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": ANTHROPIC_VERSION,
        "anthropic-beta": "prompt-caching-2024-07-31",
      },
      body: JSON.stringify({
        model,
        max_tokens: args.maxTokens,
        ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
        system: [{ type: "text", text: args.system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: args.user }],
      }),
    });

    const raw = await res.text();
    let parsed: AnthropicMessageResponse;
    try {
      parsed = JSON.parse(raw) as AnthropicMessageResponse;
    } catch {
      console.error("anthropic_parse_failed", res.status);
      return { ok: false, error: "anthropic_http_error" };
    }

    if (!res.ok) {
      console.error("anthropic_api_error", res.status, parsed?.error?.message ?? "unknown");
      return { ok: false, error: "anthropic_http_error" };
    }

    const blocks = parsed.content;
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return { ok: false, error: "anthropic_empty_response" };
    }

    const texts = blocks
      .filter((b) => b.type === "text" && typeof b.text === "string")
      .map((b) => b.text as string);
    const text = texts.join("").trim();
    if (!text) {
      return { ok: false, error: "anthropic_empty_response" };
    }

    return { ok: true, text };
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      console.error("anthropic_request_aborted");
    } else {
      console.error("anthropic_request_failed", (e as Error)?.message ?? e);
    }
    return { ok: false, error: "anthropic_http_error" };
  } finally {
    clearTimeout(tid);
  }
}

/** Strip optional markdown fences; extract outermost JSON object. */
export function parseJsonObject(text: string): { ok: true; value: Record<string, unknown> } | { ok: false } {
  let s = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/im.exec(s);
  if (fence?.[1]) s = fence[1].trim();

  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start === -1 || end <= start) return { ok: false };
  const slice = s.slice(start, end + 1);
  try {
    const value = JSON.parse(slice) as unknown;
    if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      return { ok: true, value: value as Record<string, unknown> };
    }
  } catch {
    /* ignore */
  }
  return { ok: false };
}

/** Strip optional markdown fences; extract outermost JSON array. */
export function parseJsonArray(text: string): { ok: true; value: unknown[] } | { ok: false } {
  let s = text.trim();
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/im.exec(s);
  if (fence?.[1]) s = fence[1].trim();

  const start = s.indexOf("[");
  const end = s.lastIndexOf("]");
  if (start === -1 || end <= start) return { ok: false };
  const slice = s.slice(start, end + 1);
  try {
    const value = JSON.parse(slice) as unknown;
    if (Array.isArray(value)) return { ok: true, value };
  } catch {
    /* ignore */
  }
  return { ok: false };
}
