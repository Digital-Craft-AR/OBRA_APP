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

/** Placeholder meta when `html_shell` exists but `shell_meta` is missing (treated as stale). */
const MISSING_META_PLACEHOLDER: ShellMeta = {
  chapter_count: -1,
  page_size: "",
  page_orientation: "",
  content_hash: "",
  generated_at: "1970-01-01T00:00:00.000Z",
};

/**
 * Returns true when saved shell_meta does not match current structure / page config / content.
 */
export function isShellMetaStale(
  meta: ShellMeta | null,
  currentChapterCount: number,
  currentPageSize: string,
  currentPageOrientation: string,
  currentContentHash?: string,
): boolean {
  if (!meta) return true;
  return (
    meta.chapter_count !== currentChapterCount ||
    meta.page_size !== currentPageSize ||
    meta.page_orientation !== currentPageOrientation ||
    (currentContentHash !== undefined && meta.content_hash !== currentContentHash)
  );
}

/**
 * Returns the HTML shell for an ebook. Reads `ebooks.html_shell` when present;
 * only invokes `generate-document-template` when there is no stored shell.
 *
 * `stale` is true when `shell_meta` is missing or does not match the current
 * chapter count, page settings, or content hash — the caller may still render
 * the cached HTML and prompt the user before calling `regenerateShell()`.
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

  const rawShell = cached?.html_shell;
  const hasShell = typeof rawShell === "string" && rawShell.trim().length > 0;
  if (hasShell) {
    const meta = cached?.shell_meta ?? null;
    const shellMeta = meta ?? MISSING_META_PLACEHOLDER;
    const stale = isShellMetaStale(meta, currentChapterCount, currentPageSize, currentPageOrientation, currentContentHash);
    return { ok: true, htmlShell: rawShell, shellMeta, cached: true, stale };
  }

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

/**
 * Forces regeneration of the shell regardless of cache state.
 */
export async function regenerateShell(opts: {
  projectId: string;
  ebookId: string;
}): Promise<FetchShellResult> {
  const { data, error } = await supabase.functions.invoke("generate-document-template", {
    body: { projectId: opts.projectId, ebookId: opts.ebookId },
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
