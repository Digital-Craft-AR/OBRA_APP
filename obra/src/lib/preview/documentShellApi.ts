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
}): Promise<FetchShellResult> {
  const {
    projectId,
    ebookId,
    currentChapterCount,
    currentPageSize,
    currentPageOrientation,
    currentContentHash,
  } = opts;

  const { data: ebookRow } = await supabase
    .from("ebooks")
    .select("html_shell, shell_meta")
    .eq("id", ebookId)
    .maybeSingle();

  const cached = ebookRow as { html_shell: string | null; shell_meta: ShellMeta | null } | null;

  if (cached?.html_shell && cached.shell_meta) {
    const meta = cached.shell_meta;
    const isStale =
      meta.chapter_count !== currentChapterCount ||
      meta.page_size !== currentPageSize ||
      meta.page_orientation !== currentPageOrientation ||
      meta.content_hash !== currentContentHash;

    if (!isStale) {
      return { ok: true, htmlShell: cached.html_shell, shellMeta: meta, cached: true, stale: false };
    }
  }

  return _invokeGenerate(projectId, ebookId);
}

/**
 * Forces regeneration of the shell regardless of cache state.
 */
export async function regenerateShell(opts: {
  projectId: string;
  ebookId: string;
}): Promise<FetchShellResult> {
  return _invokeGenerate(opts.projectId, opts.ebookId);
}

async function _invokeGenerate(projectId: string, ebookId: string): Promise<FetchShellResult> {
  const { data, error } = await supabase.functions.invoke("generate-document-template", {
    body: { projectId, ebookId },
  });

  if (error || !data?.ok || typeof data?.htmlShell !== "string") {
    const code = await resolveShellTemplateInvokeErrorCode(data, error);
    return { ok: false, error: code };
  }

  return {
    ok: true,
    htmlShell: data.htmlShell as string,
    shellMeta: data.shellMeta as ShellMeta,
    cached: false,
    stale: false,
  };
}
