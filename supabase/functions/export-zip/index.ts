import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import JSZip from "https://deno.land/x/jszip@0.11.0/mod.ts";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { rewriteStorageSignedUrlForPublicAccess } from "../_shared/storageSignedUrl.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

/**
 * Exports all ebook artifacts for a project as a single ZIP archive.
 *
 * ## Design
 * - Generates PDFs for all ebooks (main + bonuses + bumps) in parallel.
 * - Aborts entirely if any PDF fails (atomic semantics per spec #66).
 * - Uses the same HTML/CSS rendering contract as export-pdf and PreviewDocument.tsx.
 * - ZIP filenames are stable slugs without dates: main.pdf, bonus-1.pdf, bump-1.pdf.
 * - Export does NOT consume AI credits (compute-only per spec).
 *
 * ## Timeout
 * - Hard total timeout: 55 seconds (Supabase Edge limit is 60s).
 * - PDFs are generated in parallel; wall-clock time ≈ max(single ebook PDF time).
 *
 * ## Security
 * - JWT validated via SUPABASE_ANON_KEY + auth.getUser inside handler.
 * - PUPPETEER_EXECUTABLE_PATH and SUPABASE_SERVICE_ROLE_KEY never reach client.
 * - No manuscript content is logged.
 *
 * POST body: { projectId: string }
 */

const json = corsJson;
const PDF_MAX_BYTES = 50 * 1024 * 1024;
const TIMEOUT_MS = 55_000;

const PAGE_SIZES: Record<string, { width: string; height: string }> = {
  a4: { width: "210mm", height: "297mm" },
  letter: { width: "215.9mm", height: "279.4mm" },
};

function buildPageCss(page: { size: string; orientation: string }): string {
  const dims = PAGE_SIZES[page.size] ?? PAGE_SIZES.a4;
  const [w, h] =
    page.orientation === "landscape"
      ? [dims.height, dims.width]
      : [dims.width, dims.height];
  return `@page { size: ${w} ${h}; margin: 20mm; }`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildDocumentHtml(opts: {
  title: string;
  author: string | null;
  chapters: Array<{ title: string; content: string | null }>;
  palette: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
  page: { size: string; orientation: string };
  coverImageUrl: string | null;
}): string {
  const { title, author, chapters, palette, fonts, page, coverImageUrl } = opts;
  const fontFamilies = [
    `${encodeURIComponent(fonts.heading)}:wght@400;600;700`,
    `${encodeURIComponent(fonts.body)}:wght@400;600;700`,
  ].join("&family=");
  const googleFontsUrl = `https://fonts.googleapis.com/css2?family=${fontFamilies}&display=swap`;
  const pageCss = buildPageCss(page);

  const chaptersHtml = chapters
    .map(
      (ch, idx) => `
    <section class="preview-page preview-chapter-opener">
      <div class="preview-chapter-opener__accent"></div>
      <p class="preview-chapter-opener__number">${String(idx + 1).padStart(2, "0")}</p>
      <h2 class="preview-chapter-opener__title">${escHtml(ch.title)}</h2>
    </section>
    <section class="preview-page preview-body">
      <div class="preview-body__content">${ch.content ?? "<p>—</p>"}</div>
    </section>`,
    )
    .join("\n");

  const tocHtml = chapters.length > 0
    ? `<section class="preview-page preview-toc">
        <h2 class="preview-toc__heading">Índice</h2>
        <p class="preview-toc__ebook-title">${escHtml(title)}</p>
        <ol class="preview-toc__list">
          ${chapters.map((ch) => `<li class="preview-toc__entry"><span class="preview-toc__entry-title">${escHtml(ch.title)}</span></li>`).join("")}
        </ol>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="${googleFontsUrl}" />
  <style>
    ${pageCss}
    :root {
      --preview-color-primary: ${palette.primary};
      --preview-color-secondary: ${palette.secondary};
      --preview-color-accent: ${palette.accent};
      --preview-font-heading: "${fonts.heading}", serif;
      --preview-font-body: "${fonts.body}", sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: var(--preview-font-body); color: #1a1a1a; background: white; }
    .preview-page { width: 100%; min-height: 100vh; padding: 2rem; break-after: page; page-break-after: always; }
    .preview-cover { display: flex; flex-direction: column; justify-content: flex-end; background-color: var(--preview-color-primary); position: relative; overflow: hidden; }
    .preview-cover__art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }
    .preview-cover__text { position: relative; padding: 2.5rem; color: white; }
    .preview-cover__title { font-family: var(--preview-font-heading); font-size: 2.25rem; font-weight: 700; line-height: 1.15; margin-bottom: 0.5rem; text-shadow: 0 1px 3px rgba(0,0,0,0.4); }
    .preview-cover__author { font-size: 1rem; opacity: 0.85; }
    .preview-toc__heading { font-family: var(--preview-font-heading); font-size: 1.25rem; font-weight: 600; margin-bottom: 0.25rem; color: var(--preview-color-primary); }
    .preview-toc__ebook-title { font-size: 0.875rem; color: #666; margin-bottom: 1.25rem; }
    .preview-toc__list { list-style: none; }
    .preview-toc__entry { display: flex; justify-content: space-between; font-size: 0.9375rem; border-bottom: 1px dotted #ddd; padding-bottom: 0.375rem; margin-bottom: 0.375rem; }
    .preview-chapter-opener { display: flex; flex-direction: column; justify-content: center; background: var(--preview-color-secondary); }
    .preview-chapter-opener__accent { width: 3rem; height: 4px; border-radius: 2px; background: var(--preview-color-accent); margin-bottom: 1rem; }
    .preview-chapter-opener__number { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--preview-color-primary); margin-bottom: 0.5rem; opacity: 0.7; }
    .preview-chapter-opener__title { font-family: var(--preview-font-heading); font-size: 1.75rem; font-weight: 700; line-height: 1.2; color: var(--preview-color-primary); }
    .preview-body__content { font-size: 0.9375rem; line-height: 1.7; }
    .preview-body__content h2 { font-family: var(--preview-font-heading); font-size: 1.2rem; font-weight: 600; margin: 1.25em 0 0.5em; color: var(--preview-color-primary); }
    .preview-body__content h3 { font-size: 1.05rem; font-weight: 600; margin: 1em 0 0.4em; color: var(--preview-color-primary); }
    .preview-body__content p { margin-bottom: 0.875em; }
    .preview-body__content ul, .preview-body__content ol { margin: 0 0 0.875em 1.5rem; }
    .preview-body__content li { margin-bottom: 0.25em; }
    .preview-body__content blockquote { margin: 0.75em 0; padding: 0.5rem 1rem; border-left: 3px solid var(--preview-color-accent); }
    .preview-body__content strong { font-weight: 600; }
  </style>
</head>
<body>
  <section class="preview-page preview-cover">
    ${coverImageUrl ? `<img class="preview-cover__art" src="${escHtml(coverImageUrl)}" alt="" />` : ""}
    <div class="preview-cover__text">
      <h1 class="preview-cover__title">${escHtml(title)}</h1>
      ${author ? `<p class="preview-cover__author">${escHtml(author)}</p>` : ""}
    </div>
  </section>
  ${tocHtml}
  ${chaptersHtml}
</body>
</html>`;
}

async function renderPdf(html: string): Promise<Uint8Array | null> {
  // deno-lint-ignore no-explicit-any
  let puppeteer: any;
  try {
    puppeteer = await import("https://deno.land/x/puppeteer@16.2.0/mod.ts");
  } catch {
    console.error("puppeteer_import_failed");
    return null;
  }

  const executablePath = Deno.env.get("PUPPETEER_EXECUTABLE_PATH") ?? undefined;
  // deno-lint-ignore no-explicit-any
  const browser = await (puppeteer as any).launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none", "--disable-gpu"],
    ...(executablePath ? { executablePath } : {}),
  });

  try {
    // deno-lint-ignore no-explicit-any
    const pageObj = await (browser as any).newPage();
    await pageObj.setContent(html, { waitUntil: "networkidle0", timeout: 30_000 });
    const pdfBuffer = await pageObj.pdf({ format: "A4", printBackground: true });
    return pdfBuffer as Uint8Array;
  } finally {
    await browser.close();
  }
}

/** Stable slug for the PDF filename inside the ZIP. */
function ebookFilename(type: string, packageOrdinal: number): string {
  if (type === "main") return "main.pdf";
  if (type === "bonus") return `bonus-${packageOrdinal}.pdf`;
  return `bump-${packageOrdinal}.pdf`;
}

type EbookRow = {
  id: string;
  title: string | null;
  type: string;
  package_ordinal: number;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const userClient = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData?.user?.id) {
    return json({ error: "unauthorized" }, 401);
  }
  const userId = userData.user.id;

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const projectId = typeof body.projectId === "string" ? body.projectId : null;
  if (!projectId) {
    return json({ error: "missing_params", detail: "projectId required" }, 400);
  }

  const admin = createClient(url, serviceKey);

  const rl = await checkRateLimit(admin, userId, "export-zip");
  if (!rl.allowed) return rateLimitResponse(rl);

  // Load project — verify ownership
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, main_title, author, design_config")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr || !project) return json({ error: "not_found" }, 404);
  if (project.user_id !== userId) return json({ error: "forbidden" }, 403);

  // Load all ebooks ordered by type then package_ordinal
  const { data: ebooksData, error: ebooksErr } = await admin
    .from("ebooks")
    .select("id, title, type, package_ordinal")
    .eq("project_id", projectId)
    .order("package_ordinal", { ascending: true });

  if (ebooksErr || !ebooksData || ebooksData.length === 0) {
    return json({ error: "no_ebooks" }, 404);
  }

  const typeOrder: Record<string, number> = { main: 0, bonus: 1, order_bump: 2 };
  const ebooks = (ebooksData as EbookRow[]).sort(
    (a, b) =>
      (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9) ||
      a.package_ordinal - b.package_ordinal,
  );

  // Parse design_config once (shared across all ebooks)
  const dc = (project.design_config ?? {}) as Record<string, unknown>;
  const palette = (dc.palette as { primary: string; secondary: string; accent: string } | null) ?? {
    primary: "#204970",
    secondary: "#e8f0f7",
    accent: "#c8e62b",
  };
  const fonts = (dc.fonts as { heading: string; body: string } | null) ?? {
    heading: "Fraunces",
    body: "Plus Jakarta Sans",
  };
  const page = (dc.page as { size: string; orientation: string } | null) ?? {
    size: "a4",
    orientation: "portrait",
  };

  // Load cover image once (shared for main ebook only)
  let coverImageUrl: string | null = null;
  const { data: coverImage } = await admin
    .from("project_images")
    .select("storage_path, status")
    .eq("project_id", projectId)
    .eq("slot_key", "cover_art")
    .is("ebook_id", null)
    .maybeSingle();

  if (coverImage?.status === "done" && coverImage?.storage_path) {
    const { data: signed } = await admin.storage
      .from("project-images")
      .createSignedUrl(coverImage.storage_path as string, 3600);
    coverImageUrl = rewriteStorageSignedUrlForPublicAccess(signed?.signedUrl ?? null, url);
  }

  // Generate all PDFs in parallel, abort if any fails
  const generatePdf = async (ebook: EbookRow): Promise<{ filename: string; data: Uint8Array }> => {
    const { data: chaptersData } = await admin
      .from("chapters")
      .select("title, sort_order, content")
      .eq("ebook_id", ebook.id)
      .order("sort_order", { ascending: true });

    const chapters = (chaptersData ?? []).map((ch) => ({
      title: typeof ch.title === "string" ? ch.title : "",
      content: typeof ch.content === "string" ? ch.content : null,
    }));

    const title =
      ebook.type === "main" && typeof project.main_title === "string"
        ? project.main_title
        : (ebook.title ?? "Ebook");

    const html = buildDocumentHtml({
      title,
      author: typeof project.author === "string" ? project.author : null,
      chapters,
      palette,
      fonts,
      page,
      coverImageUrl: ebook.type === "main" ? coverImageUrl : null,
    });

    const pdfData = await renderPdf(html);
    if (!pdfData || pdfData.length === 0) {
      throw new Error(`pdf_render_failed:${ebook.id}`);
    }
    if (pdfData.length > PDF_MAX_BYTES) {
      throw new Error(`pdf_too_large:${ebook.id}`);
    }

    return { filename: ebookFilename(ebook.type, ebook.package_ordinal), data: pdfData };
  };

  // Race all PDF generation against a hard timeout
  const allPdfsPromise = Promise.all(ebooks.map(generatePdf));
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), TIMEOUT_MS),
  );

  let pdfFiles: Array<{ filename: string; data: Uint8Array }>;
  try {
    const result = await Promise.race([allPdfsPromise, timeoutPromise]);
    if (result === null) {
      return json({ error: "zip_timeout", detail: "exceeded_55s" }, 504);
    }
    pdfFiles = result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("pdf_generation_error", msg);
    // Abort entire ZIP if any PDF fails
    return json({ error: "pdf_failed", detail: msg }, 502);
  }

  // Build ZIP archive
  const zip = new JSZip();
  for (const { filename, data } of pdfFiles) {
    zip.addFile(filename, data as unknown as Uint8Array);
  }

  let zipData: Uint8Array;
  try {
    zipData = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  } catch (err) {
    console.error("zip_build_error", err instanceof Error ? err.message : String(err));
    return json({ error: "zip_build_failed" }, 500);
  }

  // Upload to Storage bucket `project-zips`
  const projectSlug = typeof project.main_title === "string"
    ? project.main_title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")
    : "project";
  const storagePath = `${projectId}/${projectSlug}.zip`;

  // List existing ZIPs for this project so we can remove stale ones after upload.
  // The slug changes when the project title changes, leaving orphan files.
  const { data: existingFiles } = await admin.storage
    .from("project-zips")
    .list(projectId);
  const staleZipPaths = (existingFiles ?? [])
    .filter((f) => f.name !== `${projectSlug}.zip`)
    .map((f) => `${projectId}/${f.name}`);

  const { error: uploadErr } = await admin.storage
    .from("project-zips")
    .upload(storagePath, zipData, {
      contentType: "application/zip",
      upsert: true,
    });

  if (uploadErr) {
    console.error("zip_storage_upload", uploadErr.message ?? uploadErr);
    return json({ error: "storage_upload_failed" }, 500);
  }

  // Delete stale ZIP files — only after the new one is confirmed written.
  if (staleZipPaths.length > 0) {
    const { error: removeErr } = await admin.storage
      .from("project-zips")
      .remove(staleZipPaths);
    if (removeErr) {
      console.warn("zip_stale_cleanup_failed", removeErr.message ?? removeErr);
    }
  }

  // Return signed URL (1-hour expiry) + mark project as published
  const { data: signedData } = await admin.storage
    .from("project-zips")
    .createSignedUrl(storagePath, 3600);

  // Update publish_status → published (first export or re-export after modified)
  await admin
    .from("projects")
    .update({ publish_status: "published" })
    .eq("id", projectId);

  const filename = `${projectSlug}.zip`;
  return json({
    ok: true,
    signedUrl: rewriteStorageSignedUrlForPublicAccess(signedData?.signedUrl ?? null, url),
    storagePath,
    filename,
    fileCount: pdfFiles.length,
    sizeBytes: zipData.length,
  });
});
