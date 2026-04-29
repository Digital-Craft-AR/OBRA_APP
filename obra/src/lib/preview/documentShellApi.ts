import { supabase } from "@/lib/supabaseClient";

function shellTemplateInvokeErrorCode(data: unknown): string | undefined {
  if (data && typeof data === "object" && "error" in data) {
    const e = (data as Record<string, unknown>).error;
    return typeof e === "string" ? e : undefined;
  }
  return undefined;
}

/**
 * On non-2xx, `functions.invoke` sets `data` to null and `error` to `FunctionsHttpError`
 * whose `context` is the fetch `Response` — the JSON body must be read from there.
 */
async function resolveShellTemplateInvokeErrorCode(data: unknown, error: unknown): Promise<string> {
  const fromData = shellTemplateInvokeErrorCode(data);
  if (fromData) return fromData;

  if (
    error &&
    typeof error === "object" &&
    "name" in error &&
    (error as { name: string }).name === "FunctionsHttpError" &&
    "context" in error &&
    (error as { context: unknown }).context instanceof Response
  ) {
    const res = (error as { context: Response }).context;
    try {
      const body: unknown = await res.json();
      const fromBody = shellTemplateInvokeErrorCode(body);
      if (fromBody) return fromBody;
    } catch {
      /* response may not be JSON */
    }
    if (res.status === 409) return "generation_in_progress";
  }

  return "invoke_failed";
}

export type ShellMeta = {
  chapter_count: number;
  page_size: string;
  page_orientation: string;
  content_hash: string;
  generated_at: string;
};

export type FetchShellResult =
  | { ok: true; htmlShell: string; shellMeta: ShellMeta; cached: boolean; stale: boolean }
  | { ok: false; error: string };

export type ShellProgress = { current: number; total: number };

/** djb2 hash over all chapter titles and content for staleness detection. */
export function hashChapters(
  chapters: Array<{ title: string; content: string | null }>,
): string {
  const str = chapters.map((c) => `${c.title}|||${c.content ?? ""}`).join("^^^");
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash | 0;
  }
  return (hash >>> 0).toString(16);
}

/** Returns true when the cached shell_meta no longer matches current document params. */
export function isShellMetaStale(
  meta: ShellMeta | null,
  chapterCount: number,
  pageSize: string,
  orientation: string,
  contentHash: string,
): boolean {
  if (!meta) return true;
  return (
    meta.chapter_count !== chapterCount ||
    meta.page_size !== pageSize ||
    meta.page_orientation !== orientation ||
    meta.content_hash !== contentHash
  );
}

/**
 * Returns the HTML document for an ebook, using the cached version when valid,
 * regenerating via generate-document-template otherwise.
 *
 * Stale if: chapter count, page config, OR content hash changed.
 */
export async function fetchOrGenerateShell(opts: {
  projectId: string;
  ebookId: string;
  currentChapterCount: number;
  currentPageSize: string;
  currentPageOrientation: string;
  currentContentHash: string;
  onProgress?: (progress: ShellProgress) => void;
}): Promise<FetchShellResult> {
  const {
    projectId,
    ebookId,
    currentChapterCount,
    currentPageSize,
    currentPageOrientation,
    currentContentHash,
    onProgress,
  } = opts;

  const { data: ebookRow } = await supabase
    .from("ebooks")
    .select("html_shell, shell_meta")
    .eq("id", ebookId)
    .maybeSingle();

  const cached = ebookRow as { html_shell: string | null; shell_meta: ShellMeta | null } | null;
  const htmlShell = cached?.html_shell?.trim() ?? null;

  if (htmlShell && cached?.shell_meta) {
    const stale = isShellMetaStale(
      cached.shell_meta,
      currentChapterCount,
      currentPageSize,
      currentPageOrientation,
      currentContentHash,
    );

    if (!stale) {
      return { ok: true, htmlShell, shellMeta: cached.shell_meta, cached: true, stale: false };
    }
  }

  return _invokeGenerate(projectId, ebookId, onProgress);
}

/**
 * Forces regeneration of the shell regardless of cache state.
 */
export async function regenerateShell(opts: {
  projectId: string;
  ebookId: string;
  onProgress?: (progress: ShellProgress) => void;
}): Promise<FetchShellResult> {
  return _invokeGenerate(opts.projectId, opts.ebookId, opts.onProgress);
}

async function _invokeGenerate(
  projectId: string,
  ebookId: string,
  onProgress?: (progress: ShellProgress) => void,
): Promise<FetchShellResult> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "unauthorized" };

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/functions/v1/generate-document-template`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ projectId, ebookId }),
    });
  } catch {
    return { ok: false, error: "invoke_failed" };
  }

  if (!res.ok || !res.body) {
    try {
      const errBody: unknown = await res.json();
      return { ok: false, error: shellTemplateInvokeErrorCode(errBody) ?? "invoke_failed" };
    } catch {
      return { ok: false, error: "invoke_failed" };
    }
  }

  // Read streaming NDJSON — each line is a JSON chunk:
  //   { type: "ping" }          keepalive, ignored
  //   { type: "done", ... }     final result
  //   { type: "error", ... }    generation error
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk: Record<string, unknown>;
        try { chunk = JSON.parse(line) as Record<string, unknown>; }
        catch { continue; }
        if (chunk.type === "ping" && typeof chunk.chapters_done === "number" && typeof chunk.total === "number") {
          onProgress?.({ current: chunk.chapters_done as number, total: chunk.total as number });
        }
        if (chunk.type === "done") {
          return {
            ok: true,
            htmlShell: chunk.htmlShell as string,
            shellMeta: chunk.shellMeta as ShellMeta,
            cached: false,
            stale: false,
          };
        }
        if (chunk.type === "error") {
          return { ok: false, error: (chunk.error as string) ?? "generation_failed" };
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return { ok: false, error: "stream_ended_unexpectedly" };
}
