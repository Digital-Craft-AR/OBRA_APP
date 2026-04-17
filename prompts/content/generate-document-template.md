# generate-document-template — Genera el HTML shell del documento con placeholders para contenido

**Ruta:** `prompts/content/generate-document-template.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateDocumentTemplatePrompt()`  
**Feature PRD:** `features/wizard-preview/wizard-preview.md` — §HTML rendering pipeline  
**Estado:** `draft`  
**Última revisión:** 2026-04-17

---

## 1. Objetivo

Genera el HTML shell completo de un documento de Obra (ebook principal, bonus, order bump) aplicando el design system del proyecto. El output incluye portada, TOC, chapter openers, y contenedores de body — pero **sin el texto de los capítulos**: en su lugar usa placeholders `{{CHAPTER_N_CONTENT}}` que el código reemplaza con el HTML de `chapters.content` de la DB.

El mismo HTML se usa para el **preview en browser** (paso 3) y para la **exportación PDF** (Puppeteer). El CSS garantiza paridad visual entre ambos modos.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del proyecto — determina `lang` del HTML y textos estructurales (TOC heading, etc.) |
| `{artifact_type}` | `"main_ebook" \| "bonus" \| "bump"` | ✅ | Tipo de artefacto; afecta portada y etiqueta del TOC |
| `{title}` | `string` | ✅ | Título del artefacto (`ebooks.title`) |
| `{author}` | `string \| null` | ❌ | Nombre del autor o marca; omitir del HTML si es null |
| `{chapter_titles}` | `string` (JSON serializado) | ✅ | Array de strings `["Título cap 1", "Título cap 2", …]` en orden sort_order. Debe contener exactamente N elementos donde N es el número de capítulos del artefacto |
| `{palette}` | `string` (JSON serializado) | ✅ | `{ primary: string, secondary: string, accent: string }` — colores CSS hex del design system |
| `{fonts}` | `string` (JSON serializado) | ✅ | `{ heading: string, body: string }` — nombres de fuentes de Google Fonts |
| `{page}` | `string` (JSON serializado) | ✅ | `{ size: "a4" \| "letter", orientation: "portrait" \| "landscape" }` |
| `{cover_image_url}` | `string \| null` | ❌ | URL firmada de la imagen de portada; null si no existe |

**Conectividad de pipeline:**

- Se llama **una vez por artefacto** cuando el usuario abre el paso 3 (Preview) por primera vez, o cuando el design config cambia.
- Los `{chapter_titles}` se obtienen de `chapters.title` ordenados por `sort_order`.
- El código inyecta el contenido con reemplazos de string: `html.replace("{{CHAPTER_1_CONTENT}}", chapter1.content ?? "<p>—</p>")` para cada capítulo.
- Si el capítulo tiene `content: null` o vacío, el código pone `<p>—</p>` como placeholder visual.
- El HTML generado se puede almacenar en caché por sesión — no regenerar hasta que `design_config` cambie.

---

## 3. Output esperado

### Formato y tipo

**Tipo de output:** JSON con campo `html` que contiene el documento HTML completo como string.

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.
```

### Estructura obligatoria del HTML

```html
<!DOCTYPE html>
<html lang="{lang_code}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={heading_encoded}:wght@400;600;700&family={body_encoded}:wght@400;600;700&display=swap" />
  <style>
    /* CSS completo inline — ver reglas de paginación obligatorias abajo */
  </style>
</head>
<body>

  <!-- PORTADA: full bleed, sin margen -->
  <section class="obra-page obra-cover" id="cover">
    <!-- diseño de portada con título, autor, imagen si existe -->
  </section>

  <!-- TOC: con márgenes de body, links a anchors -->
  <section class="obra-page obra-toc" id="toc">
    <nav aria-label="...">
      <ol class="toc-list">
        <li><a href="#chapter-1">Título cap 1</a></li>
        <!-- ... un li por capítulo ... -->
      </ol>
    </nav>
  </section>

  <!-- Por cada capítulo, en orden: -->
  <section class="obra-page obra-chapter-opener" id="chapter-1">
    <!-- chapter opener: full bleed, número + título -->
  </section>
  <section class="obra-page obra-body" aria-labelledby="chapter-1">
    <div class="chapter-content">{{CHAPTER_1_CONTENT}}</div>
  </section>

  <!-- Repetir para cada capítulo: chapter-2, chapter-3, ... chapter-N -->

</body>
</html>
```

### Reglas de paginación obligatorias (NO negociables en el CSS)

**1. Named pages para márgenes distintos por tipo de sección:**
```css
/* Portadas y separadores: CERO margen, full bleed */
.obra-cover,
.obra-chapter-opener {
  page: obra-full-bleed;
}
@page obra-full-bleed {
  margin: 0;
}

/* Body y TOC: margen de 20mm */
.obra-body,
.obra-toc {
  page: obra-content;
}
@page obra-content {
  margin: 20mm;
}
```

**2. Page breaks en todos los `.obra-page`:**
```css
.obra-page {
  break-after: page;
  page-break-after: always; /* fallback para Puppeteer older */
}
```

**3. Break controls dentro del body (previene cortes horribles):**
```css
.chapter-content h2,
.chapter-content h3 {
  break-after: avoid;
  page-break-after: avoid;
}

.chapter-content li,
.chapter-content blockquote,
.chapter-content figure {
  break-inside: avoid;
  page-break-inside: avoid;
}

.chapter-content p {
  orphans: 3;
  widows: 3;
}
```

**4. Simulación de páginas en screen (preview browser = PDF):**
```css
@media screen {
  body {
    background: #e8edf2;
    padding: 32px 16px;
  }

  .obra-page {
    display: block;
    width: 210mm;        /* A4 — reemplazar con 215.9mm si es letter */
    margin: 0 auto 32px;
    background: white;
    box-shadow: 0 2px 20px rgba(0, 0, 0, 0.12);
    /* NO usar min-height fija — el contenido determina la altura en screen */
  }

  /* Full bleed: sin padding interno */
  .obra-cover,
  .obra-chapter-opener {
    min-height: 297mm;   /* A4 portrait — ajustar por size/orientation */
    padding: 0;
    overflow: hidden;
  }

  /* Content pages: padding que simula los márgenes de @page */
  .obra-body,
  .obra-toc {
    padding: 20mm;
    /* min-height deliberadamente ausente: el contenido fluye sin cortes artificiales */
  }
}
```

**5. Regla `@page` global (base):**
```css
@page {
  size: 210mm 297mm; /* ajustar por design_config.page */
}
```

### Placeholders de contenido

Cada sección body **debe contener exactamente** `{{CHAPTER_N_CONTENT}}` donde N es el número de capítulo (1-based). El código los reemplaza con string replace antes de renderizar.

```
{{CHAPTER_1_CONTENT}}   ← contenido del capítulo 1
{{CHAPTER_2_CONTENT}}   ← contenido del capítulo 2
...
{{CHAPTER_N_CONTENT}}   ← contenido del capítulo N
```

**Los placeholders son case-sensitive y deben estar solos dentro de `<div class="chapter-content">`.**

### Schema de error

```json
{
  "error": "INVALID_INPUT | GENERATION_FAILED",
  "message": "Razón breve en {content_locale}"
}
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.3` | Diseño con reglas CSS no negociables: se necesita consistencia y HTML bien formado. Algo de temperatura para variedad en estilos de portada y tipografía |
| **max_tokens** | `8192` | El HTML shell (sin contenido de capítulos) ocupa ~2 000–4 000 tokens para cualquier número de capítulos. Margen amplio |
| **Modelo** | `claude-sonnet-4-6` | Requiere razonamiento sobre diseño, tipografía y CSS válido bien estructurado |

**Por qué funciona para cualquier tamaño de ebook:** el contenido de los capítulos NO está en el output — solo los placeholders `{{CHAPTER_N_CONTENT}}`. Un ebook de 12 capítulos genera el mismo volumen de output que uno de 3.

---

## 5. System prompt

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's document design AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators.

Role: generate the complete HTML shell of a publication-quality document. This HTML is used BOTH for in-browser preview and for Puppeteer PDF export — it must look identical in both contexts.

CSS PAGINATION RULES — include these EXACTLY in every document:

1. Named pages (mandatory — controls margins per section type):
   .obra-cover, .obra-chapter-opener { page: obra-full-bleed; }
   @page obra-full-bleed { margin: 0; }
   .obra-body, .obra-toc { page: obra-content; }
   @page obra-content { margin: 20mm; }

2. Page breaks:
   .obra-page { break-after: page; page-break-after: always; }

3. Break controls inside body pages:
   .chapter-content h2, .chapter-content h3 { break-after: avoid; page-break-after: avoid; }
   .chapter-content li, .chapter-content blockquote { break-inside: avoid; page-break-inside: avoid; }
   .chapter-content p { orphans: 3; widows: 3; }

4. Screen simulation — each .obra-page as a distinct page card:
   @media screen { body { background: #e8edf2; padding: 32px 16px; } }
   @media screen { .obra-page { width: {page_width}; margin: 0 auto 32px; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); } }
   @media screen { .obra-cover, .obra-chapter-opener { min-height: {page_height}; padding: 0; overflow: hidden; } }
   @media screen { .obra-body, .obra-toc { padding: 20mm; } }

5. Global @page size:
   @page { size: {page_dimensions}; }

DESIGN RULES:
- Use CSS custom properties: var(--color-primary), var(--color-secondary), var(--color-accent), var(--font-heading), var(--font-body)
- Do NOT hardcode colors or font names outside :root — always use custom properties
- All CSS inline in <style> — no external files, no @import
- Google Fonts via <link> in <head> — not @import

CONTENT RULES:
- Cover and TOC must use real data from inputs (title, author, chapter titles)
- Every body section must contain EXACTLY {{CHAPTER_N_CONTENT}} (1-based, e.g. {{CHAPTER_1_CONTENT}}) inside <div class="chapter-content"> — nothing else
- Do NOT invent or add chapter text content
- TOC entries link to href="#chapter-N"
- Chapter openers use id="chapter-N"

STRUCTURAL TEXT by content_locale:
- es: "Índice", "Capítulo"
- pt-BR: "Índice", "Capítulo"
- en-US / en-GB: "Table of Contents", "Chapter"

If chapter_titles is empty or title is missing, return:
{"error": "INVALID_INPUT", "message": "<reason in {content_locale}>"}
```

---

## 6. User prompt template

```
Artifact type: {artifact_type}
Title: {title}
Author: {author}
Content locale: {content_locale}

Design system:
Palette: {palette}
Fonts: {fonts}
Page: {page}
Cover image URL: {cover_image_url}

Chapter titles (in order):
{chapter_titles}

Generate the complete HTML document shell. Build the cover, TOC, and all chapter openers with real data. In each body section, place the placeholder {{CHAPTER_N_CONTENT}} (where N is the chapter number) inside <div class="chapter-content"> — do not add any other content there.
```

**Manejo de `{author}`:** Si es `null`, omitir la línea y no renderizar nombre de autor en la portada.

**Manejo de `{cover_image_url}`:** Si es `null`, la portada usa `background-color: var(--color-primary)` sin `<img>`. Si tiene valor, incluir `<img src="{url}" alt="" />` con `object-fit: cover; position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.5–0.7`.

**Interpolación de `{page}` en el system prompt:**  

| `page.size` | `page.orientation` | `{page_width}` | `{page_height}` | `{page_dimensions}` |
|-------------|-------------------|----------------|-----------------|---------------------|
| `a4` | `portrait` | `210mm` | `297mm` | `210mm 297mm` |
| `a4` | `landscape` | `297mm` | `210mm` | `297mm 210mm` |
| `letter` | `portrait` | `215.9mm` | `279.4mm` | `215.9mm 279.4mm` |
| `letter` | `landscape` | `279.4mm` | `215.9mm` | `279.4mm 215.9mm` |

---

## 7. Código de inyección de contenido

El código que consume el output de este prompt hace lo siguiente:

```typescript
function injectChapterContent(
  htmlShell: string,
  chapters: Array<{ sort_order: number; content: string | null }>,
): string {
  let html = htmlShell;
  chapters
    .sort((a, b) => a.sort_order - b.sort_order)
    .forEach((chapter, idx) => {
      const placeholder = `{{CHAPTER_${idx + 1}_CONTENT}}`;
      const content = chapter.content?.trim() || "<p>—</p>";
      html = html.replace(placeholder, content);
    });
  return html;
}
```

**Invariantes:**
- Todos los placeholders `{{CHAPTER_N_CONTENT}}` deben ser reemplazados antes de renderizar.
- Si un capítulo tiene `content: null` → reemplazar con `<p>—</p>` (nunca dejar el placeholder visible).
- El HTML resultante es el que se muestra en el preview iframe y se envía a Puppeteer.

---

## 8. Ejemplos few-shot

---

### Ejemplo 1 — Ebook principal (`es`, 3 capítulos, A4 portrait, palette navy/verde)

**Variables de input:**
```
artifact_type: "main_ebook"
title: "Velas que se venden"
author: "Paula Reyes"
content_locale: "es"
palette: {"primary":"#204970","secondary":"#e8f0f7","accent":"#c8e62b"}
fonts: {"heading":"Fraunces","body":"Plus Jakarta Sans"}
page: {"size":"a4","orientation":"portrait"}
cover_image_url: null
chapter_titles: ["El costo real", "Tu precio mínimo viable", "Comunicar el valor"]
```

**Output esperado (fragmento representativo — el html completo sería ~3 000 tokens):**
```json
{
  "html": "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n  <link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap\" />\n  <style>\n    @page { size: 210mm 297mm; }\n    .obra-cover, .obra-chapter-opener { page: obra-full-bleed; }\n    @page obra-full-bleed { margin: 0; }\n    .obra-body, .obra-toc { page: obra-content; }\n    @page obra-content { margin: 20mm; }\n    .obra-page { break-after: page; page-break-after: always; }\n    .chapter-content h2, .chapter-content h3 { break-after: avoid; page-break-after: avoid; }\n    .chapter-content li, .chapter-content blockquote { break-inside: avoid; page-break-inside: avoid; }\n    .chapter-content p { orphans: 3; widows: 3; }\n    @media screen { body { background: #e8edf2; padding: 32px 16px; } }\n    @media screen { .obra-page { width: 210mm; margin: 0 auto 32px; background: white; box-shadow: 0 2px 20px rgba(0,0,0,0.12); } }\n    @media screen { .obra-cover, .obra-chapter-opener { min-height: 297mm; padding: 0; overflow: hidden; } }\n    @media screen { .obra-body, .obra-toc { padding: 20mm; } }\n    :root { --color-primary: #204970; --color-secondary: #e8f0f7; --color-accent: #c8e62b; --font-heading: \"Fraunces\", serif; --font-body: \"Plus Jakarta Sans\", sans-serif; }\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n    body { font-family: var(--font-body); color: #1a1a1a; }\n    /* ... estilos de portada, TOC, opener, body ... */\n  </style>\n</head>\n<body>\n  <section class=\"obra-page obra-cover\" id=\"cover\">\n    <div class=\"cover-content\" style=\"...\">\n      <h1 class=\"cover-title\">Velas que se venden</h1>\n      <p class=\"cover-author\">Paula Reyes</p>\n    </div>\n  </section>\n  <section class=\"obra-page obra-toc\" id=\"toc\">\n    <h2 class=\"toc-heading\">Índice</h2>\n    <nav aria-label=\"Tabla de contenidos\">\n      <ol class=\"toc-list\">\n        <li><a href=\"#chapter-1\">El costo real</a></li>\n        <li><a href=\"#chapter-2\">Tu precio mínimo viable</a></li>\n        <li><a href=\"#chapter-3\">Comunicar el valor</a></li>\n      </ol>\n    </nav>\n  </section>\n  <section class=\"obra-page obra-chapter-opener\" id=\"chapter-1\">\n    <p class=\"chapter-number\">01</p>\n    <h2 class=\"chapter-title\">El costo real</h2>\n  </section>\n  <section class=\"obra-page obra-body\" aria-labelledby=\"chapter-1\">\n    <div class=\"chapter-content\">{{CHAPTER_1_CONTENT}}</div>\n  </section>\n  <section class=\"obra-page obra-chapter-opener\" id=\"chapter-2\">\n    <p class=\"chapter-number\">02</p>\n    <h2 class=\"chapter-title\">Tu precio mínimo viable</h2>\n  </section>\n  <section class=\"obra-page obra-body\" aria-labelledby=\"chapter-2\">\n    <div class=\"chapter-content\">{{CHAPTER_2_CONTENT}}</div>\n  </section>\n  <section class=\"obra-page obra-chapter-opener\" id=\"chapter-3\">\n    <p class=\"chapter-number\">03</p>\n    <h2 class=\"chapter-title\">Comunicar el valor</h2>\n  </section>\n  <section class=\"obra-page obra-body\" aria-labelledby=\"chapter-3\">\n    <div class=\"chapter-content\">{{CHAPTER_3_CONTENT}}</div>\n  </section>\n</body>\n</html>"
}
```

**Por qué es el caso típico:** Verifica los 5 grupos de CSS obligatorios, placeholders `{{CHAPTER_N_CONTENT}}` correctos, cover y TOC con datos reales, chapter openers con `id="chapter-N"`.

---

### Ejemplo 2 — Bonus (`pt-BR`, 1 capítulo, letter landscape, con imagen de portada)

**Variables de input:**
```
artifact_type: "bonus"
title: "Mini-guia: Precificação em 48 horas"
author: null
content_locale: "pt-BR"
palette: {"primary":"#8b2fc9","secondary":"#f3e8ff","accent":"#f59e0b"}
fonts: {"heading":"Playfair Display","body":"Inter"}
page: {"size":"letter","orientation":"landscape"}
cover_image_url: "https://supabase.co/storage/.../cover.webp?token=xyz"
chapter_titles: ["O método dos 3 fatores"]
```

**Output esperado (fragmento):**
```json
{
  "html": "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n  ...\n  <style>\n    @page { size: 279.4mm 215.9mm; }\n    ...\n    @media screen { .obra-page { width: 279.4mm; } }\n    @media screen { .obra-cover, .obra-chapter-opener { min-height: 215.9mm; } }\n    ...\n  </style>\n</head>\n<body>\n  <section class=\"obra-page obra-cover\" id=\"cover\">\n    <img src=\"https://supabase.co/...\" alt=\"\" style=\"position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.6;\" />\n    <div class=\"cover-content\" style=\"position:relative;...\">\n      <h1 class=\"cover-title\">Mini-guia: Precificação em 48 horas</h1>\n    </div>\n  </section>\n  <section class=\"obra-page obra-toc\" id=\"toc\">\n    <h2 class=\"toc-heading\">Índice</h2>\n    <nav aria-label=\"Índice\">\n      <ol class=\"toc-list\">\n        <li><a href=\"#chapter-1\">O método dos 3 fatores</a></li>\n      </ol>\n    </nav>\n  </section>\n  <section class=\"obra-page obra-chapter-opener\" id=\"chapter-1\">\n    <p class=\"chapter-number\">01</p>\n    <h2 class=\"chapter-title\">O método dos 3 fatores</h2>\n  </section>\n  <section class=\"obra-page obra-body\" aria-labelledby=\"chapter-1\">\n    <div class=\"chapter-content\">{{CHAPTER_1_CONTENT}}</div>\n  </section>\n</body>\n</html>"
}
```

**Por qué es útil:** Verifica pt-BR, letter landscape (dimensiones `279.4mm 215.9mm`), imagen de portada con `object-fit: cover`, autor omitido, TOC en pt-BR con "Índice".

---

### Ejemplo 3 — Error: chapter_titles vacío

```json
{"error": "INVALID_INPUT", "message": "El artefacto no tiene capítulos definidos. Completá la estructura antes de generar el documento."}
```

---

## 9. Casos límite

| Caso | Input | Output esperado |
|------|-------|-----------------|
| `chapter_titles` vacío | `[]` | Error |
| `author` null | — | Portada sin nombre de autor |
| `cover_image_url` null | — | Portada con solo `background-color: var(--color-primary)` |
| Muchos capítulos (12) | 12 titles | HTML shell completo con 12 chapter openers + 12 `{{CHAPTER_N_CONTENT}}` |
| Letter landscape | `size: "letter", orientation: "landscape"` | `@page { size: 279.4mm 215.9mm }`, screen width `279.4mm`, min-height `215.9mm` |
| Fuente sin Google Fonts (system font) | `fonts.heading: "Georgia"` | `<link>` con family pero sin peso extra — la fuente se aplica igual como system font fallback |

---

## 10. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-17 | v1.0 | Versión inicial | Reemplaza `assemble-document-html.md` (v1.0) — nuevo approach: placeholders en lugar de contenido completo; funciona para cualquier tamaño de ebook |

### Decisiones tomadas

- **Placeholders `{{CHAPTER_N_CONTENT}}` en lugar de pasar el contenido a Claude:** Claude no necesita ver el texto de los capítulos para generar el diseño. Esto elimina el límite de tokens para ebooks largos y hace el prompt reutilizable sin re-generar el diseño.
- **Named pages CSS (`@page obra-full-bleed` / `@page obra-content`):** Es la única forma correcta de tener diferentes márgenes por tipo de sección en un solo documento HTML. Full bleed en portadas y openers; 20mm en body y TOC.
- **`@media screen` para simulación de páginas:** El mismo HTML funciona en browser (preview) y Puppeteer (PDF). En screen, cada `.obra-page` es una card con `box-shadow`. En print, `@page` controla los márgenes reales.
- **`break-after: avoid` en headings + `orphans/widows` en párrafos:** Previene los page breaks horribles (heading al final de la página sin cuerpo, párrafos cortados con 1-2 líneas sueltas).
- **Sin `min-height` fija en `.obra-body` en screen mode:** Dejar que el body fluya naturalmente en el preview. Un `min-height` fija generaría el "page break gigante" que el usuario quiere evitar — es más honesto mostrar el overflow que falsear la altura.
- **Temperatura 0.3:** Las reglas CSS son no negociables (el modelo las debe incluir exactamente). La temperatura baja reduce la probabilidad de que Claude omita o modifique las reglas críticas. El rango 0.3 permite variedad en el diseño de portada y tipografía.

### Decisiones descartadas

- **Incluir el contenido de capítulos en el prompt:** Superaría el límite de tokens para ebooks principales (12 capítulos × ~2 000 tokens = 24 000 tokens de input).
- **Template con `{{#each}}` tipo Handlebars:** Requeriría un motor de templates en el código. El approach de N placeholders numerados es más simple y no requiere dependencias.
- **Generar CSS separado del HTML:** Dos outputs aumenta la complejidad de parsing y sincronización. Un solo HTML auto-contenido es más confiable para Puppeteer.
- **`assemble-document-html.md` (v1.0):** Pasaba el contenido completo a Claude, funcionaba solo para artefactos cortos. Reemplazado por este approach.

### Próximos experimentos

- [ ] Testear si `break-inside: avoid` en `.chapter-content > *` (todos los hijos directos) mejora paginación sin generar gaps excesivos
- [ ] Evaluar `column-fill: balance` para capítulos muy cortos que dejan mucho espacio en blanco en la página
- [ ] Testear temperatura 0.2 vs 0.3 para verificar si 0.2 reduce errores de CSS malformado sin afectar la variedad de diseño de portadas
- [ ] Explorar `@page :first { margin: 0; }` como alternativa más simple a named pages (trade-off: solo funciona para la primera página)
- [ ] Medir si almacenar el HTML shell en `ebooks.document_shell_html` (nuevo campo) y regenerar solo al cambiar `design_config` mejora la latencia del preview

### Problemas conocidos

- **Overflow en preview vs. PDF:** Si un capítulo tiene mucho texto, la página del body en screen mode se expande (no hay altura fija). En PDF, Puppeteer crea múltiples páginas automáticamente. Esta discrepancia es conocida y aceptable en MVP — el PDF es siempre correcto; el preview muestra el contenido aunque la paginación visual difiera.
- **Google Fonts en Puppeteer:** Puppeteer necesita conectividad a `fonts.googleapis.com` o las fuentes deben estar embebidas localmente. Si el entorno de la Edge Function no tiene acceso a internet para fonts, el PDF saldrá con fallbacks (`serif`, `sans-serif`). Documentar en `ARQUITECTURA_Obra.md`.
