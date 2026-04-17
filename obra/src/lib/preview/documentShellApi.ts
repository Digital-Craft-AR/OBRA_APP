import { supabase } from "@/lib/supabaseClient";

export type ShellMeta = {
  chapter_count: number;
  page_size: string;
  page_orientation: string;
  generated_at: string;
};

export type FetchShellResult =
  | { ok: true; htmlShell: string; shellMeta: ShellMeta; cached: boolean }
  | { ok: false; error: string };

/**
 * Returns the HTML shell for an ebook, using the cached version in
 * ebooks.html_shell when it's still valid, regenerating via the
 * generate-document-template Edge Function otherwise.
 *
 * Staleness is detected by comparing chapter count and page config
 * in shell_meta against the current chapters array.
 */
export async function fetchOrGenerateShell(opts: {
  projectId: string;
  ebookId: string;
  currentChapterCount: number;
  currentPageSize: string;
  currentPageOrientation: string;
}): Promise<FetchShellResult> {
  const { projectId, ebookId, currentChapterCount, currentPageSize, currentPageOrientation } = opts;

  // Try cached shell first
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
      meta.page_orientation !== currentPageOrientation;

    if (!isStale) {
      return { ok: true, htmlShell: cached.html_shell, shellMeta: meta, cached: true };
    }
  }

  // Generate fresh shell
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
  };
}
