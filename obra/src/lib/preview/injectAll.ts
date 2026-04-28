/** Avoid breaking HTML `src="..."` when signed URLs include `&` query separators. */
function escapeSrcForHtmlAttribute(url: string): string {
  return url.replace(/&/g, "&amp;");
}

/**
 * Client-side mirror of the server-side injectAll() in _shared/prompts.ts.
 *
 * Hydrates an HTML shell produced by generate-document-template with:
 *   - {{TOC_ENTRIES}}       → <li> elements for each chapter
 *   - {{CHAPTER_N_TITLE}}   → chapter title strings
 *   - {{CHAPTER_N_CONTENT}} → approved chapter HTML
 *   - .obra-image-slot      → <img src> when a URL is available + interactive UI
 *
 * Image slots get a CSS+JS layer injected into the shell that shows:
 *   - A visible placeholder when empty (dashed bg + camera icon)
 *   - On hover: overlay with "Subir imagen" / "Generar con IA" / "Eliminar"
 *   - Actions post messages to window.parent so React handles them
 */

/**
 * Injected after Claude's <style> blocks to guarantee chapter openers fill the
 * page with the primary color and center their content — same flex approach
 * Claude uses for .obra-title-page.
 */
const SLOT_UI_CSS = `
<style id="obra-slot-ui">
.obra-image-slot {
  overflow: hidden !important;
  cursor: pointer !important;
}
.obra-image-slot:not(.obra-image-slot--cover) {
  position: relative !important;
}
/* Cover: ensure position:relative on the page so the abs-pos slot renders correctly
   even when the shell's own rule was accidentally scoped inside @media screen. */
.obra-page.obra-cover {
  position: relative !important;
  overflow: hidden !important;
}
.obra-image-slot--cover {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  display: block !important;
  overflow: hidden !important;
}
.obra-image-slot--cover img {
  position: absolute !important;
  inset: 0 !important;
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
}
.obra-slot-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 10px,
    rgba(0,0,0,0.025) 10px,
    rgba(0,0,0,0.025) 20px
  );
  color: #94a3b8;
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  font-weight: 500;
  pointer-events: none;
  user-select: none;
}
.obra-slot-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.62);
  backdrop-filter: blur(3px);
  -webkit-backdrop-filter: blur(3px);
  opacity: 0;
  transition: opacity 0.18s ease;
  z-index: 10;
  padding: 16px;
}
.obra-image-slot:hover > .obra-slot-overlay { opacity: 1; }
.obra-slot-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 9999px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  font-family: system-ui, -apple-system, sans-serif;
  letter-spacing: 0.01em;
  transition: transform 0.1s ease, background 0.15s;
  white-space: nowrap;
}
.obra-slot-btn:hover { transform: scale(1.04); }
.obra-slot-btn--upload  { background: #ffffff; color: #0f172a; }
.obra-slot-btn--generate { background: #c8e62b; color: #0f172a; }
.obra-slot-btn--remove  { background: rgba(255,255,255,0.12); color: #ffffff; border: 1px solid rgba(255,255,255,0.28); }
</style>`;

const SLOT_UI_JS = `
<script id="obra-slot-ui-js">
(function() {
  var UPLOAD_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>';
  var CAM_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="14" rx="2" ry="2"/><circle cx="12" cy="13" r="3"/><path d="M9 6l1.5-2.5h3L15 6"/></svg>';

  function enhanceSlots() {
    document.querySelectorAll('.obra-image-slot').forEach(function(slot) {
      if (slot.dataset.slotEnhanced) return;
      slot.dataset.slotEnhanced = '1';

      var key = slot.dataset.slotKey;
      if (!key) return;
      var hasImg = !!slot.querySelector('img');

      // Placeholder when no image
      if (!hasImg) {
        var ph = document.createElement('div');
        ph.className = 'obra-slot-placeholder';
        ph.innerHTML = CAM_ICON + '<span>Sin imagen</span>';
        slot.appendChild(ph);
      }

      // Overlay
      var overlay = document.createElement('div');
      overlay.className = 'obra-slot-overlay';

      // Hidden file input
      var fi = document.createElement('input');
      fi.type = 'file';
      fi.accept = 'image/jpeg,image/png,image/webp';
      fi.style.display = 'none';
      fi.addEventListener('change', function() {
        var file = fi.files && fi.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          window.parent.postMessage({
            type: 'obra:slot:file',
            slotKey: key,
            dataUrl: ev.target.result,
            fileName: file.name,
            mimeType: file.type
          }, '*');
        };
        reader.readAsDataURL(file);
        fi.value = '';
      });
      overlay.appendChild(fi);

      var uploadBtn = document.createElement('button');
      uploadBtn.className = 'obra-slot-btn obra-slot-btn--upload';
      uploadBtn.innerHTML = UPLOAD_ICON + ' Subir imagen';
      uploadBtn.addEventListener('click', function(e) { e.stopPropagation(); fi.click(); });
      overlay.appendChild(uploadBtn);

      var genBtn = document.createElement('button');
      genBtn.className = 'obra-slot-btn obra-slot-btn--generate';
      genBtn.innerHTML = '✦ Generar con IA';
      genBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        window.parent.postMessage({ type: 'obra:slot:generate', slotKey: key }, '*');
      });
      overlay.appendChild(genBtn);

      if (hasImg) {
        var removeBtn = document.createElement('button');
        removeBtn.className = 'obra-slot-btn obra-slot-btn--remove';
        removeBtn.innerHTML = '✕ Eliminar';
        removeBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          window.parent.postMessage({ type: 'obra:slot:remove', slotKey: key }, '*');
        });
        overlay.appendChild(removeBtn);
      }

      slot.appendChild(overlay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', enhanceSlots);
  } else {
    enhanceSlots();
  }
})();
</script>`;

export type SlotMessage =
  | { type: "obra:slot:file"; slotKey: string; dataUrl: string; fileName: string; mimeType: string }
  | { type: "obra:slot:generate"; slotKey: string }
  | { type: "obra:slot:remove"; slotKey: string };

export function isSlotMessage(data: unknown): data is SlotMessage {
  if (!data || typeof data !== "object") return false;
  const t = (data as Record<string, unknown>).type;
  return (
    t === "obra:slot:file" ||
    t === "obra:slot:generate" ||
    t === "obra:slot:remove"
  );
}

export function injectAll(
  htmlShell: string,
  opts: {
    chapters: Array<{ sort_order: number; title: string; content: string | null }>;
    /** slot-key → signed image URL (use "cover" for cover slot) */
    images?: Record<string, string>;
  },
): string {
  const sorted = [...opts.chapters].sort((a, b) => a.sort_order - b.sort_order);
  let html = htmlShell;

  // 1. TOC entries
  const tocHtml = sorted
    .map((ch, idx) => {
      const n = idx + 1;
      const title = ch.title?.trim() || `Capítulo ${n}`;
      return `<li class="obra-toc__entry"><a href="#chapter-${n}">${title}</a></li>`;
    })
    .join("\n        ");
  html = html.replace("{{TOC_ENTRIES}}", tocHtml);

  // 2. Chapter titles + content
  sorted.forEach((ch, idx) => {
    const n = idx + 1;
    const title = ch.title?.trim() || `Capítulo ${n}`;
    const content = ch.content?.trim() || "<p>—</p>";
    html = html.replace(`{{CHAPTER_${n}_TITLE}}`, title);
    html = html.replace(`{{CHAPTER_${n}_CONTENT}}`, content);
  });

  // 3. Image injection — inject <img> into slots that have a URL
  if (opts.images) {
    for (const [slotKey, url] of Object.entries(opts.images)) {
      if (!url) continue;
      const slotRe = new RegExp(
        `(<div[^>]*data-slot-key="${slotKey}"[^>]*>)\\s*(<\\/div>)`,
        "i",
      );
      html = html.replace(
        slotRe,
        `$1<img src="${escapeSrcForHtmlAttribute(url)}" alt="" loading="lazy" />$2`,
      );
    }
  }

  // 5. Inject override CSS + slot UI (both go into </head>, order: override first so slot UI can add on top)
  html = html.replace("</head>", SLOT_UI_CSS + "\n</head>");
  html = html.replace("</body>", SLOT_UI_JS + "\n</body>");

  return html;
}
