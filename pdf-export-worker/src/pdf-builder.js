import puppeteer from "puppeteer";
import { createLogger } from "./logger.js";

const logger = createLogger("pdf-builder");

const PUPPETEER_EXECUTABLE_PATH = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";

/**
 * Build PDF from ebook data using Puppeteer
 *
 * Steps:
 * 1. Launch Chromium browser
 * 2. Render HTML with design system applied
 * 3. Export to PDF with proper formatting
 * 4. Return PDF buffer
 *
 * Note: This is a simplified version. Full buildDocumentHtml logic from frontend
 * would be replicated here, including:
 * - CSS variables from design_config
 * - Typography (Google Fonts)
 * - Layout assignments
 * - Cover image (if main ebook)
 * - Page breaks, margins, etc.
 *
 * @param {Object} options
 * @param {Object} options.project - Project data (design_config, etc.)
 * @param {Object} options.ebook - Ebook data (title, type, etc.)
 * @param {Array} options.chapters - Chapter array [{id, title, content}, ...]
 * @param {string} options.coverImageUrl - Signed URL to cover image (optional)
 * @param {number} options.timeout - Puppeteer timeout in ms
 *
 * @returns {Promise<Buffer>} PDF file buffer
 * @throws {Error} If rendering or PDF generation fails
 */
export async function buildPdfFromEbook({
  project,
  ebook,
  chapters,
  coverImageUrl,
  timeout = 55000,
}) {
  let browser = null;

  try {
    logger.debug("Launching Puppeteer browser");

    // Launch browser
    browser = await puppeteer.launch({
      executablePath: PUPPETEER_EXECUTABLE_PATH,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage", // Disable /dev/shm use (limited in containers)
      ],
      headless: "new",
      timeout,
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(timeout);
    page.setDefaultNavigationTimeout(timeout);

    // Build HTML content
    const html = buildDocumentHtml({
      project,
      ebook,
      chapters,
      coverImageUrl,
    });

    logger.debug("Setting page content");

    // Set viewport and content
    await page.setViewport({ width: 1000, height: 1414 }); // A4 at 96 DPI
    await page.setContent(html, { waitUntil: "networkidle2" });

    logger.debug("Rendering PDF");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: project.design_config?.page?.size || "a4",
      landscape: project.design_config?.page?.orientation === "landscape",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });

    logger.debug(`PDF generated: ${pdfBuffer.length} bytes`);

    return pdfBuffer;
  } catch (err) {
    logger.error("Error building PDF:", err);
    throw err;
  } finally {
    if (browser) {
      try {
        await browser.close();
        logger.debug("Browser closed");
      } catch (err) {
        logger.warn("Error closing browser:", err);
      }
    }
  }
}

/**
 * Build HTML document from ebook data
 *
 * This replicates the frontend buildDocumentHtml function to ensure
 * print and PDF output matches the preview.
 *
 * TODO: Sync this with obra/src/lib/preview/PreviewDocument (or import shared version)
 *
 * @param {Object} options
 * @returns {string} HTML string
 */
function buildDocumentHtml({ project, ebook, chapters, coverImageUrl }) {
  const designConfig = project.design_config || {};
  const palette = designConfig.palette || {};
  const fonts = designConfig.fonts || {};

  // Extract colors with fallbacks
  const primaryColor = palette.primary || "#204970";
  const secondaryColor = palette.secondary || "#000000";
  const accentColor = palette.accent || "#C8E62B";

  // Font families (should come from design_config)
  const displayFont = fonts.display || '"Fraunces", serif';
  const bodyFont = fonts.body || '"Plus Jakarta Sans", sans-serif';

  // Build CSS variables for design system
  const cssVariables = `
    --color-primary: ${primaryColor};
    --color-secondary: ${secondaryColor};
    --color-accent: ${accentColor};
    --font-display: ${displayFont};
    --font-body: ${bodyFont};
  `;

  // Build chapters HTML
  const chaptersHtml = chapters
    .map(
      (chapter) => `
    <section class="chapter">
      <h2 class="chapter-title">${escapeHtml(chapter.title || "Untitled")}</h2>
      <div class="chapter-content">
        ${chapter.content || "<p>No content</p>"}
      </div>
      <div class="page-break"></div>
    </section>
  `
    )
    .join("");

  // Build cover HTML if main ebook and cover image exists
  const coverHtml =
    ebook.type === "main" && coverImageUrl
      ? `
    <div class="cover-page">
      <img src="${coverImageUrl}" alt="Cover" class="cover-image" />
      <div class="cover-overlay">
        <h1 class="cover-title">${escapeHtml(ebook.title || "Untitled")}</h1>
        ${
          project.author
            ? `<p class="cover-author">by ${escapeHtml(project.author)}</p>`
            : ""
        }
      </div>
    </div>
    <div class="page-break"></div>
  `
      : "";

  // Complete HTML document
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(ebook.title || "Ebook")}</title>
  <style>
    :root {
      ${cssVariables}
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: var(--font-body);
      line-height: 1.6;
      color: var(--color-secondary);
      font-size: 14px;
    }

    @page {
      size: ${designConfig.page?.size || "a4"} ${
    designConfig.page?.orientation || "portrait"
  };
      margin: 20mm;
    }

    .page-break {
      page-break-after: always;
    }

    .cover-page {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      height: 100vh;
      position: relative;
      background: var(--color-primary);
    }

    .cover-image {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.8;
    }

    .cover-overlay {
      position: relative;
      z-index: 10;
      color: white;
    }

    .cover-title {
      font-family: var(--font-display);
      font-size: 48px;
      margin-bottom: 1rem;
    }

    .cover-author {
      font-size: 18px;
      opacity: 0.9;
    }

    .chapter {
      page-break-after: always;
      padding: 2rem 0;
    }

    .chapter-title {
      font-family: var(--font-display);
      font-size: 32px;
      margin-bottom: 1.5rem;
      color: var(--color-primary);
    }

    .chapter-content {
      font-size: 14px;
      line-height: 1.8;
    }

    .chapter-content p {
      margin-bottom: 1rem;
    }

    .chapter-content h3 {
      font-family: var(--font-display);
      font-size: 20px;
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .chapter-content ul,
    .chapter-content ol {
      margin-left: 1.5rem;
      margin-bottom: 1rem;
    }

    .chapter-content li {
      margin-bottom: 0.5rem;
    }

    /* Ensure images don't overflow */
    img {
      max-width: 100%;
      height: auto;
    }

    /* Remove links styling for print */
    a {
      color: inherit;
      text-decoration: none;
    }
  </style>
</head>
<body>
  ${coverHtml}
  ${chaptersHtml}
</body>
</html>
  `;

  return html;
}

/**
 * Escape HTML special characters
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}
