import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";
import { corsJson, corsOptions } from "../_shared/cors.ts";
import { injectAll } from "../_shared/prompts.ts";
import { rewriteStorageSignedUrlForPublicAccess } from "../_shared/storageSignedUrl.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimiter.ts";

/**
 * Renders a single ebook artifact as PDF using Puppeteer.
 *
 * ## Design
 * - Fetches project + ebook + chapters from DB (service role, RLS bypass).
 * - Builds the same HTML/CSS structure as PreviewDocument.tsx (shared layout
 *   catalog contract: @page size, CSS vars from design_config).
 * - Runs Puppeteer (requires PUPPETEER_EXECUTABLE_PATH in Supabase secrets,
 *   or falls back to the bundled Chromium via puppeteer-core).
 * - Uploads the resulting PDF to Storage bucket `project-pdfs`.
 * - Returns a signed URL (1-hour expiry).
 *
 * ## Print pagination
 * - @page: size from design_config.page (A4 or letter, portrait or landscape).
 * - Margin: 20mm all sides.
 * - Each .preview-page has break-after: page.
 * - Font render hinting: disabled for crisp text output.
 *
 * ## Timeout + size limits (documented per #65 AC)
 * - Hard timeout: 55 seconds (Supabase Edge Function limit is 60s per request).
 * - Max ebook size: 60 chapters × ~20 KB HTML = ~1.2 MB rendered HTML.
 *   PDFs above ~50 MB are rejected with 413 before upload.
 *
 * ## Security
 * - JWT validated via SUPABASE_ANON_KEY + auth.getUser inside handler.
 * - PUPPETEER_EXECUTABLE_PATH and SUPABASE_SERVICE_ROLE_KEY never reach client.
 * - No manuscript content is logged (per #70).
 *
 * POST body: { projectId: string, ebookId: string }
 */

const json = corsJson;
const PDF_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
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

    body {
      font-family: var(--preview-font-body);
      color: #1a1a1a;
      background: white;
    }

    .preview-page {
      width: 100%;
      min-height: 100vh;
      padding: 2rem;
      break-after: page;
      page-break-after: always;
    }

    /* Cover */
    .preview-cover {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      background-color: var(--preview-color-primary);
      position: relative;
      overflow: hidden;
    }
    .preview-cover__art {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.6;
    }
    .preview-cover__text {
      position: relative;
      padding: 2.5rem;
      color: white;
    }
    .preview-cover__title {
      font-family: var(--preview-font-heading);
      font-size: 2.25rem;
      font-weight: 700;
      line-height: 1.15;
      margin-bottom: 0.5rem;
      text-shadow: 0 1px 3px rgba(0,0,0,0.4);
    }
    .preview-cover__author {
      font-size: 1rem;
      opacity: 0.85;
    }

    /* TOC */
    .preview-toc__heading {
      font-family: var(--preview-font-heading);
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 0.25rem;
      color: var(--preview-color-primary);
    }
    .preview-toc__ebook-title {
      font-size: 0.875rem;
      color: #666;
      margin-bottom: 1.25rem;
    }
    .preview-toc__list { list-style: none; }
    .preview-toc__entry {
      display: flex;
      justify-content: space-between;
      font-size: 0.9375rem;
      border-bottom: 1px dotted #ddd;
      padding-bottom: 0.375rem;
      margin-bottom: 0.375rem;
    }

    /* Chapter opener */
    .preview-chapter-opener {
      display: flex;
      flex-direction: column;
      justify-content: center;
      background: var(--preview-color-secondary);
    }
    .preview-chapter-opener__accent {
      width: 3rem;
      height: 4px;
      border-radius: 2px;
      background: var(--preview-color-accent);
      margin-bottom: 1rem;
    }
    .preview-chapter-opener__number {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--preview-color-primary);
      margin-bottom: 0.5rem;
      opacity: 0.7;
    }
    .preview-chapter-opener__title {
      font-family: var(--preview-font-heading);
      font-size: 1.75rem;
      font-weight: 700;
      line-height: 1.2;
      color: var(--preview-color-primary);
    }

    /* Body */
    .preview-body__content { font-size: 0.9375rem; line-height: 1.7; }
    .preview-body__content h2 {
      font-family: var(--preview-font-heading);
      font-size: 1.2rem;
      font-weight: 600;
      margin: 1.25em 0 0.5em;
      color: var(--preview-color-primary);
    }
    .preview-body__content h3 {
      font-size: 1.05rem;
      font-weight: 600;
      margin: 1em 0 0.4em;
      color: var(--preview-color-primary);
    }
    .preview-body__content p { margin-bottom: 0.875em; }
    .preview-body__content ul,
    .preview-body__content ol { margin: 0 0 0.875em 1.5rem; }
    .preview-body__content li { margin-bottom: 0.25em; }
    .preview-body__content blockquote {
      margin: 0.75em 0;
      padding: 0.5rem 1rem;
      border-left: 3px solid var(--preview-color-accent);
    }
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
  // Dynamic import of puppeteer-core available in the Supabase Edge Runtime.
  // Requires PUPPETEER_EXECUTABLE_PATH Supabase secret pointing to a bundled
  // Chromium binary (or the Supabase-provided Deno Puppeteer layer).
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
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--font-render-hinting=none",
      "--disable-gpu",
    ],
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return corsOptions();
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Validate JWT inside handler
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
  const ebookId = typeof body.ebookId === "string" ? body.ebookId : null;
  if (!projectId || !ebookId) {
    return json({ error: "missing_params", detail: "projectId + ebookId required" }, 400);
  }

  const admin = createClient(url, serviceKey);

  const rl = await checkRateLimit(admin, userId, "export-pdf");
  if (!rl.allowed) return rateLimitResponse(rl);

  // Load project — verify ownership; no manuscript content logged
  const { data: project, error: projErr } = await admin
    .from("projects")
    .select("id, user_id, main_title, author, design_config")
    .eq("id", projectId)
    .maybeSingle();

  if (projErr || !project) return json({ error: "not_found" }, 404);
  if (project.user_id !== userId) return json({ error: "forbidden" }, 403);

  // Load ebook (including html_shell if available)
  const { data: ebook, error: ebookErr } = await admin
    .from("ebooks")
    .select("id, title, type, html_shell")
    .eq("id", ebookId)
    .eq("project_id", projectId)
    .maybeSingle();

  if (ebookErr || !ebook) return json({ error: "ebook_not_found" }, 404);

  // Load chapters — content not logged
  const { data: chaptersData, error: chaptersErr } = await admin
    .from("chapters")
    .select("id, title, sort_order, content")
    .eq("ebook_id", ebookId)
    .order("sort_order", { ascending: true });

  if (chaptersErr) return json({ error: "db_error" }, 500);

  const chapters = (chaptersData ?? []).map((ch) => ({
    id: typeof ch.id === "string" ? ch.id : "",
    title: typeof ch.title === "string" ? ch.title : "",
    sort_order: typeof ch.sort_order === "number" ? ch.sort_order : 0,
    content: typeof ch.content === "string" ? ch.content : null,
  }));

  // Load project images: cover (project-level) + hero rows for this ebook (match preview injectAll keys)
  const { data: imageRows } = await admin
    .from("project_images")
    .select("slot_key, ebook_id, chapter_id, storage_path, status")
    .eq("project_id", projectId)
    .eq("status", "done");

  const imageUrls: Record<string, string> = {};
  for (const row of (imageRows ?? []) as Array<{
    slot_key: string;
    ebook_id: string | null;
    chapter_id: string | null;
    storage_path: string | null;
  }>) {
    if (!row.storage_path) continue;
    const { data: signed } = await admin.storage
      .from("project-images")
      .createSignedUrl(row.storage_path, 3600);
    if (!signed?.signedUrl) continue;
    const signedUrl = rewriteStorageSignedUrlForPublicAccess(signed.signedUrl, url) ?? signed.signedUrl;

    if (row.slot_key === "cover_art" && row.ebook_id == null && row.chapter_id == null) {
      imageUrls["cover"] = signedUrl;
      continue;
    }
    if (row.slot_key === "hero" && row.ebook_id === ebookId && row.chapter_id) {
      const idx = chapters.findIndex((c) => c.id === row.chapter_id);
      if (idx >= 0) {
        imageUrls[`chapter-${idx + 1}-image-1`] = signedUrl;
      }
      continue;
    }
    if (/^chapter-\d+-image-1$/.test(row.slot_key)) {
      imageUrls[row.slot_key] = signedUrl;
    }
  }

  // ── Build HTML ──
  // Preferred: use the Claude-generated html_shell (same as preview).
  // Fallback: programmatic buildDocumentHtml() for ebooks without a shell yet.

  let html: string;
  const htmlShell = typeof ebook.html_shell === "string" ? ebook.html_shell : null;

  if (htmlShell) {
    // Strip the interactive slot UI JS/CSS injected for the browser preview —
    // Puppeteer doesn't need hover overlays or postMessage handlers.
    let shell = htmlShell
      .replace(/<style id="obra-slot-ui">[\s\S]*?<\/style>/i, "")
      .replace(/<script id="obra-slot-ui-js">[\s\S]*?<\/script>/i, "");

    html = injectAll(shell, { images: imageUrls });
  } else {
    // Legacy fallback — no shell generated yet
    const dc = (project.design_config ?? {}) as Record<string, unknown>;
    const palette = (dc.palette as { primary: string; secondary: string; accent: string } | null) ?? {
      primary: "#204970", secondary: "#e8f0f7", accent: "#c8e62b",
    };
    const fonts = (dc.fonts as { heading: string; body: string } | null) ?? {
      heading: "Fraunces", body: "Plus Jakarta Sans",
    };
    const page = (dc.page as { size: string; orientation: string } | null) ?? {
      size: "a4", orientation: "portrait",
    };
    html = buildDocumentHtml({
      title: typeof project.main_title === "string"
        ? project.main_title
        : (ebook.title as string | null) ?? "Ebook",
      author: typeof project.author === "string" ? project.author : null,
      chapters,
      palette,
      fonts,
      page,
      coverImageUrl: imageUrls["cover"] ?? null,
    });
  }

  // Render PDF with hard timeout
  const pdfPromise = renderPdf(html);
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), TIMEOUT_MS),
  );

  const pdfResult = await Promise.race([pdfPromise, timeoutPromise]);
  if (pdfResult === null) {
    return json({ error: "pdf_timeout", detail: "exceeded_55s" }, 504);
  }

  if (!pdfResult || pdfResult.length === 0) {
    return json({ error: "pdf_render_failed" }, 502);
  }

  if (pdfResult.length > PDF_MAX_BYTES) {
    return json({ error: "pdf_too_large", maxBytes: PDF_MAX_BYTES }, 413);
  }

  // Upload to Storage bucket `project-pdfs`
  const storagePath = `${projectId}/${ebookId}.pdf`;
  const { error: uploadErr } = await admin.storage
    .from("project-pdfs")
    .upload(storagePath, pdfResult, { contentType: "application/pdf", upsert: true });

  if (uploadErr) {
    console.error("pdf_storage_upload", uploadErr.message ?? uploadErr);
    return json({ error: "storage_upload_failed" }, 500);
  }

  // Return signed URL (1-hour expiry)
  const { data: signedData } = await admin.storage
    .from("project-pdfs")
    .createSignedUrl(storagePath, 3600);

  return json({
    ok: true,
    signedUrl: rewriteStorageSignedUrlForPublicAccess(signedData?.signedUrl ?? null, url),
    storagePath,
    sizeBytes: pdfResult.length,
  });
});
