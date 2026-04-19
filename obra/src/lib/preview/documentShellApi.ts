import { supabase } from "@/lib/supabaseClient";

export type ShellMeta = {
  chapter_count: number;
  page_size: string;
  page_orientation: string;
  generated_at: string;
};

export type FetchShellResult =
  | { ok: true; htmlShell: string; shellMeta: ShellMeta; cached: boolean; stale: boolean }
  | { ok: false; error: string };

/** Placeholder meta when `html_shell` exists but `shell_meta` is missing (treated as stale). */
const MISSING_META_PLACEHOLDER: ShellMeta = {
  chapter_count: -1,
  page_size: "",
  page_orientation: "",
  generated_at: "1970-01-01T00:00:00.000Z",
};

/**
 * Returns true when saved shell_meta does not match current structure / page config.
 */
export function isShellMetaStale(
  meta: ShellMeta | null,
  currentChapterCount: number,
  currentPageSize: string,
  currentPageOrientation: string,
): boolean {
  if (!meta) return true;
  return (
    meta.chapter_count !== currentChapterCount ||
    meta.page_size !== currentPageSize ||
    meta.page_orientation !== currentPageOrientation
  );
}

/**
 * Returns the HTML shell for an ebook. Reads `ebooks.html_shell` when present;
 * only invokes `generate-document-template` when there is no stored shell.
 *
 * `stale` is true when `shell_meta` is missing or does not match the current
 * chapter count and page settings — the caller may still render the cached HTML
 * and prompt the user before calling `regenerateShell()`.
 */
export async function fetchOrGenerateShell(opts: {
  projectId: string;
  ebookId: string;
  currentChapterCount: number;
  currentPageSize: string;
  currentPageOrientation: string;
}): Promise<FetchShellResult> {
  const { projectId, ebookId, currentChapterCount, currentPageSize, currentPageOrientation } = opts;

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
    const stale = isShellMetaStale(meta, currentChapterCount, currentPageSize, currentPageOrientation);
    return { ok: true, htmlShell: rawShell, shellMeta, cached: true, stale };
  }

  const { data, error } = await supabase.functions.invoke("generate-document-template", {
    body: { projectId, ebookId },
  });

  if (error || !data?.ok || typeof data?.htmlShell !== "string") {
    const code = (data?.error as string | undefined) ?? "invoke_failed";
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
    const code = (data?.error as string | undefined) ?? "invoke_failed";
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
