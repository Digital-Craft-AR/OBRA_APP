# assemble-document-html — Ensambla el documento HTML completo de un artefacto del paquete

**Ruta:** `prompts/content/assemble-document-html.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `assembleDocumentHtmlPrompt()`  
**Feature PRD:** `features/wizard-preview/wizard-preview.md` — §HTML rendering pipeline  
**Estado:** `draft`  
**Última revisión:** 2026-04-17

---

## 1. Objetivo

Ensambla un documento HTML **completo y auto-contenido** (`<!DOCTYPE html>` … `</html>`) a partir de capítulos HTML ya generados y la configuración del design system del proyecto. El output sirve como entrada directa a Puppeteer (PDF export) o como documento portátil para preview. Se llama una vez por artefacto (bonus o order bump), **después** de que todos los capítulos del artefacto están aprobados.

**Cuándo usar este prompt vs. `buildDocumentHtml()` (programático):**

| Criterio | `assembleDocumentHtmlPrompt` | `buildDocumentHtml()` |
|----------|-----------------------------|-----------------------|
| Artefacto corto (≤ 4 capítulos, ≤ ~4 000 palabras) | ✅ Recomendado | Válido |
| Ebook principal (6–12 capítulos) | ⚠️ Supera límite de output (~8 192 tokens) | ✅ Recomendado |
| Necesita CSS personalizado / navegación anchor | ✅ | Requiere código adicional |
| Pipeline crítico con SLA de latencia < 5 s | ⚠️ Latencia de LLM | ✅ Síncrono instantáneo |

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del proyecto — determina atributo `lang` del HTML y textos de estructura (TOC heading, etc.) |
| `{artifact_type}` | `"main_ebook" \| "bonus" \| "bump"` | ✅ | Tipo de artefacto; afecta sección de portada y etiqueta del TOC |
| `{title}` | `string` | ✅ | Título del artefacto (`ebooks.title`) |
| `{author}` | `string \| null` | ❌ | Nombre del autor o marca; omitir del HTML si es null |
| `{chapters}` | `string` (JSON serializado) | ✅ | Array `[{ number: number, title: string, content: string }]` — `content` es el HTML del capítulo ya aprobado tal como está en `chapters.content` |
| `{palette}` | `string` (JSON serializado) | ✅ | `{ primary: string, secondary: string, accent: string }` — colores CSS hexadecimales del design system |
| `{fonts}` | `string` (JSON serializado) | ✅ | `{ heading: string, body: string }` — nombres de fuentes de Google Fonts (e.g. `"Fraunces"`, `"Plus Jakarta Sans"`) |
| `{page}` | `string` (JSON serializado) | ✅ | `{ size: "a4" \| "letter", orientation: "portrait" \| "landscape" }` — dimensiones para `@page` CSS |
| `{cover_image_url}` | `string \| null` | ❌ | URL firmada de la imagen de portada (`project_images.storage_path` firmado); null si no existe |

**Conectividad de pipeline:**

- Se llama **después** de `generate-bonus-chapter` o `generate-bump-chapter`, con todos los capítulos aprobados (`approved_at IS NOT NULL`).
- El output se puede almacenar en `ebooks.assembled_html` (campo futuro) o pasarse directamente a Puppeteer sin persistencia.
- Los capítulos en `{chapters}` deben enviarse en orden `sort_order` ascendente.
- Si algún capítulo tiene `content: null`, reemplazar por `<p>—</p>` antes de enviar (no pasar null al modelo).
- Para el ebook principal con más de 4 capítulos, usar `buildDocumentHtml()` en `export-pdf/index.ts`.

---

## 3. Output esperado

### Formato y tipo

**Tipo de output:** JSON con campo `html` que contiene el documento HTML completo como string.

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.
```

### Schema con ejemplo real

```json
{
  "html": "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n  <link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap\" />\n  <style>\n    @page { size: 210mm 297mm; margin: 20mm; }\n    :root {\n      --color-primary: #204970;\n      --color-secondary: #e8f0f7;\n      --color-accent: #c8e62b;\n      --font-heading: \"Fraunces\", serif;\n      --font-body: \"Plus Jakarta Sans\", sans-serif;\n    }\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n    body { font-family: var(--font-body); color: #1a1a1a; background: white; }\n    .page { break-after: page; page-break-after: always; padding: 2rem; }\n    /* … estilos completos … */\n  </style>\n</head>\n<body>\n  <section id=\"cover\" class=\"page page-cover\">\n    <div class=\"cover-text\">\n      <h1 class=\"cover-title\">Checklist: Los 5 pasos antes de fijar tu precio</h1>\n      <p class=\"cover-author\">Paula Reyes</p>\n    </div>\n  </section>\n  <section id=\"toc\" class=\"page page-toc\">\n    <h2 class=\"toc-heading\">Índice</h2>\n    <ol class=\"toc-list\">\n      <li><a href=\"#chapter-1\">Capítulo 1 — El costo real</a></li>\n      <li><a href=\"#chapter-2\">Capítulo 2 — Tu precio mínimo viable</a></li>\n      <li><a href=\"#chapter-3\">Capítulo 3 — Comunicar el valor</a></li>\n    </ol>\n  </section>\n  <section id=\"chapter-1\" class=\"page page-chapter-opener\">\n    <p class=\"chapter-number\">01</p>\n    <h2 class=\"chapter-title\">El costo real</h2>\n  </section>\n  <section class=\"page page-body\" aria-labelledby=\"chapter-1\">\n    <div class=\"chapter-content\"><p>Antes de calcular cualquier precio…</p></div>\n  </section>\n  <!-- capítulos 2 y 3 … -->\n</body>\n</html>"
}
```

**Estructura obligatoria del documento HTML:**

```
<!DOCTYPE html>
<html lang="{lang_code}">           ← Derivado de content_locale: es→"es", pt-BR→"pt-BR", en-US→"en", en-GB→"en"
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" … />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family={heading_encoded}:wght@400;600;700&family={body_encoded}:wght@400;600;700&display=swap" />
  <style>
    @page { size: {page_dimensions}; margin: 20mm; }
    :root {
      --color-primary: {palette.primary};
      --color-secondary: {palette.secondary};
      --color-accent: {palette.accent};
      --font-heading: "{fonts.heading}", serif;
      --font-body: "{fonts.body}", sans-serif;
    }
    /* CSS completo inline — sin archivos externos adicionales */
  </style>
</head>
<body>
  <section id="cover" class="page page-cover"> … </section>
  <section id="toc" class="page page-toc">
    <nav aria-label="Tabla de contenidos">
      <ol class="toc-list">
        <li><a href="#chapter-1">Título capítulo 1</a></li>
        <!-- un <li> por capítulo -->
      </ol>
    </nav>
  </section>

  <!-- Por cada capítulo en el array, en orden: -->
  <section id="chapter-{N}" class="page page-chapter-opener">
    <p class="chapter-number">{NN}</p>
    <h2 class="chapter-title">{chapter.title}</h2>
  </section>
  <section class="page page-body" aria-labelledby="chapter-{N}">
    <div class="chapter-content">
      {chapter.content verbatim — no modificar}
    </div>
  </section>
</body>
</html>
```

**Reglas de IDs y anchors (no negociables):**

1. La portada usa `id="cover"`.
2. El TOC usa `id="toc"`.
3. Cada chapter opener usa `id="chapter-{N}"` donde N es el número de capítulo (1, 2, 3…).
4. Los links del TOC apuntan a `href="#chapter-{N}"`.
5. El contenido de cada capítulo (`chapter.content`) se inserta **verbatim** dentro de `<div class="chapter-content">` — sin modificar, truncar ni reescribir el HTML.

**Reglas de CSS (no negociables):**

1. Todo el CSS va inline en `<style>` — sin archivos externos ni `@import`.
2. Usar `var(--color-primary)`, `var(--color-secondary)`, `var(--color-accent)`, `var(--font-heading)`, `var(--font-body)` — nunca hardcodear colores ni fuentes.
3. Cada `.page` tiene `break-after: page` y `page-break-after: always` (compatibilidad).
4. No usar `!important`.
5. No aplicar estilos a selectores de elemento global (`h1`, `p`, `ul`, etc.) fuera de `.chapter-content` y la portada — el scope es `.page-*`.

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
| **Temperatura** | `0.2` | Ensamblado determinista: CSS correcto, IDs consistentes, HTML bien formado > creatividad |
| **max_tokens** | `8192` | Límite máximo de claude-sonnet-4-6. Cubre documentos de hasta ~4 capítulos (~4 000 palabras de contenido) + CSS + estructura |
| **Modelo** | `claude-sonnet-4-6` | Capacidad de razonamiento necesaria para HTML bien estructurado y CSS válido inline |

**Límite práctico de artefacto:** con `max_tokens: 8192`, el prompt funciona correctamente para:
- **Bonuses** (3 capítulos × ~800 palabras): ✅ ~4 500 tokens de output
- **Order bumps** (4 capítulos × ~400 palabras): ✅ ~3 500 tokens de output
- **Ebook principal corto** (≤ 4 capítulos × ~1 200 palabras): ⚠️ Límite ajustado — monitorear
- **Ebook principal estándar** (6–12 capítulos): ❌ Usar `buildDocumentHtml()` programático

---

## 5. System prompt

*`{content_locale}` y `{artifact_type}` se interpolan en `_shared/prompts.ts` antes de enviar al modelo.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's document assembly AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators.

Role: assemble a complete, self-contained HTML document from pre-generated chapter HTML fragments and a design system config. The output is used directly by Puppeteer for PDF export and as a portable preview document.

Output language for structural text (TOC heading, cover labels): {content_locale}.

HTML ASSEMBLY RULES (non-negotiable):
1. Insert each chapter's content VERBATIM inside its <div class="chapter-content">. Do NOT modify, rewrite, summarize, or truncate chapter content.
2. Every chapter opener section MUST have id="chapter-{N}" where N matches chapter.number.
3. TOC links must use href="#chapter-{N}". TOC must list all chapters in order.
4. All CSS goes inline in <style> — no external files, no @import.
5. Use CSS custom properties for all design values: var(--color-primary), var(--color-secondary), var(--color-accent), var(--font-heading), var(--font-body).
6. Every .page element must have break-after: page and page-break-after: always.
7. @page rule must reflect the page size/orientation received in inputs.
8. Google Fonts: load heading and body fonts via a single <link> in <head> using URL-encoded family names.
9. Do NOT add style or class attributes to elements inside chapter.content — those are already correct HTML fragments.
10. Document must be valid, well-formed HTML5.

STRUCTURAL TEXT LOCALIZATION by content_locale:
- es: "Índice", "Bonus", "Contenido adicional"
- pt-BR: "Índice", "Bônus", "Conteúdo adicional"
- en-US / en-GB: "Table of Contents", "Bonus", "Additional Content"

If chapters array is empty or all content is null, return:
{"error": "INVALID_INPUT", "message": "<brief reason in {content_locale}>"}
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

Chapters (in order, content is approved HTML):
{chapters}

Assemble the complete HTML document. Insert each chapter's content verbatim. Apply the design system via CSS custom properties. Use id="chapter-{N}" on each chapter opener. Link TOC entries to #chapter-{N} anchors.
```

**Manejo de `{author}`:** Si es `null`, omitir la línea `Author:` del user template y no renderizar el nombre de autor en la portada.

**Manejo de `{cover_image_url}`:** Si es `null`, omitir la línea y renderizar la portada solo con color de fondo (`background-color: var(--color-primary)`). Si tiene valor, incluir `<img class="cover-art" src="{url}" alt="" />` con `object-fit: cover; position: absolute; inset: 0; opacity: 0.6`.

**Manejo de `{chapters}`:** Serializar como `JSON.stringify(chapters)` antes de enviar. El array ya debe tener los capítulos en orden `sort_order` ascendente. Reemplazar `content: null` por `content: "<p>—</p>"` antes de serializar.

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Bonus de 3 capítulos (`es`, palette navy/verde, A4 portrait)

**Variables de input:**
```
artifact_type: "bonus"
title: "Checklist: Los 5 pasos antes de fijar tu precio"
author: "Paula Reyes"
content_locale: "es"
palette: {"primary":"#204970","secondary":"#e8f0f7","accent":"#c8e62b"}
fonts: {"heading":"Fraunces","body":"Plus Jakarta Sans"}
page: {"size":"a4","orientation":"portrait"}
cover_image_url: null
chapters: [
  {"number":1,"title":"El costo real","content":"<p>Antes de calcular cualquier precio, necesitás saber con exactitud cuánto te cuesta hacer cada unidad.</p><h2>Los cuatro componentes</h2><ul><li><strong>Materiales directos</strong></li><li><strong>Tiempo de producción</strong></li><li><strong>Costos fijos prorrateados</strong></li><li><strong>Margen de error</strong></li></ul>"},
  {"number":2,"title":"Tu precio mínimo viable","content":"<p>El precio mínimo viable es el piso por debajo del cual perdés dinero.</p><h2>Cómo calcularlo</h2><p>Sumá todos los costos del capítulo anterior y dividí por el volumen mensual esperado.</p>"},
  {"number":3,"title":"Comunicar el valor","content":"<p>Un precio justo no se justifica — se comunica.</p><h2>El lenguaje del valor</h2><p>Hablá de resultados, no de insumos. «Esta vela dura 60 horas» comunica valor; «uso cera de soja importada» es un insumo.</p>"}
]
```

**Output esperado (fragmento representativo):**
```json
{
  "html": "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n  <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />\n  <link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap\" />\n  <style>\n    @page { size: 210mm 297mm; margin: 20mm; }\n    :root {\n      --color-primary: #204970;\n      --color-secondary: #e8f0f7;\n      --color-accent: #c8e62b;\n      --font-heading: \"Fraunces\", serif;\n      --font-body: \"Plus Jakarta Sans\", sans-serif;\n    }\n    * { box-sizing: border-box; margin: 0; padding: 0; }\n    body { font-family: var(--font-body); color: #1a1a1a; background: white; }\n    .page { break-after: page; page-break-after: always; padding: 2rem; }\n    .page-cover { display: flex; flex-direction: column; justify-content: flex-end; background-color: var(--color-primary); min-height: 100vh; }\n    .cover-text { color: white; padding: 2.5rem; }\n    .cover-title { font-family: var(--font-heading); font-size: 2rem; font-weight: 700; line-height: 1.2; margin-bottom: 0.5rem; }\n    .cover-author { font-size: 1rem; opacity: 0.85; }\n    .page-toc { }\n    .toc-heading { font-family: var(--font-heading); font-size: 1.25rem; font-weight: 600; color: var(--color-primary); margin-bottom: 1.25rem; }\n    .toc-list { list-style: none; }\n    .toc-list li { border-bottom: 1px dotted #ddd; padding: 0.375rem 0; }\n    .toc-list a { color: var(--color-primary); text-decoration: none; font-size: 0.9375rem; }\n    .page-chapter-opener { display: flex; flex-direction: column; justify-content: center; background-color: var(--color-secondary); }\n    .chapter-number { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--color-primary); opacity: 0.7; margin-bottom: 0.5rem; }\n    .chapter-title { font-family: var(--font-heading); font-size: 1.75rem; font-weight: 700; color: var(--color-primary); line-height: 1.2; }\n    .page-chapter-opener::before { content: ''; display: block; width: 3rem; height: 4px; border-radius: 2px; background: var(--color-accent); margin-bottom: 1rem; }\n    .page-body { }\n    .chapter-content { font-size: 0.9375rem; line-height: 1.7; }\n    .chapter-content h2 { font-family: var(--font-heading); font-size: 1.2rem; font-weight: 600; color: var(--color-primary); margin: 1.25em 0 0.5em; }\n    .chapter-content h3 { font-size: 1.05rem; font-weight: 600; color: var(--color-primary); margin: 1em 0 0.4em; }\n    .chapter-content p { margin-bottom: 0.875em; }\n    .chapter-content ul, .chapter-content ol { margin: 0 0 0.875em 1.5rem; }\n    .chapter-content li { margin-bottom: 0.25em; }\n    .chapter-content blockquote { margin: 0.75em 0; padding: 0.5rem 1rem; border-left: 3px solid var(--color-accent); }\n    .chapter-content strong { font-weight: 600; }\n  </style>\n</head>\n<body>\n  <section id=\"cover\" class=\"page page-cover\">\n    <div class=\"cover-text\">\n      <h1 class=\"cover-title\">Checklist: Los 5 pasos antes de fijar tu precio</h1>\n      <p class=\"cover-author\">Paula Reyes</p>\n    </div>\n  </section>\n  <section id=\"toc\" class=\"page page-toc\">\n    <h2 class=\"toc-heading\">Índice</h2>\n    <nav aria-label=\"Tabla de contenidos\">\n      <ol class=\"toc-list\">\n        <li><a href=\"#chapter-1\">El costo real</a></li>\n        <li><a href=\"#chapter-2\">Tu precio mínimo viable</a></li>\n        <li><a href=\"#chapter-3\">Comunicar el valor</a></li>\n      </ol>\n    </nav>\n  </section>\n  <section id=\"chapter-1\" class=\"page page-chapter-opener\">\n    <p class=\"chapter-number\">01</p>\n    <h2 class=\"chapter-title\">El costo real</h2>\n  </section>\n  <section class=\"page page-body\" aria-labelledby=\"chapter-1\">\n    <div class=\"chapter-content\"><p>Antes de calcular cualquier precio, necesitás saber con exactitud cuánto te cuesta hacer cada unidad.</p><h2>Los cuatro componentes</h2><ul><li><strong>Materiales directos</strong></li><li><strong>Tiempo de producción</strong></li><li><strong>Costos fijos prorrateados</strong></li><li><strong>Margen de error</strong></li></ul></div>\n  </section>\n  <section id=\"chapter-2\" class=\"page page-chapter-opener\">\n    <p class=\"chapter-number\">02</p>\n    <h2 class=\"chapter-title\">Tu precio mínimo viable</h2>\n  </section>\n  <section class=\"page page-body\" aria-labelledby=\"chapter-2\">\n    <div class=\"chapter-content\"><p>El precio mínimo viable es el piso por debajo del cual perdés dinero.</p><h2>Cómo calcularlo</h2><p>Sumá todos los costos del capítulo anterior y dividí por el volumen mensual esperado.</p></div>\n  </section>\n  <section id=\"chapter-3\" class=\"page page-chapter-opener\">\n    <p class=\"chapter-number\">03</p>\n    <h2 class=\"chapter-title\">Comunicar el valor</h2>\n  </section>\n  <section class=\"page page-body\" aria-labelledby=\"chapter-3\">\n    <div class=\"chapter-content\"><p>Un precio justo no se justifica — se comunica.</p><h2>El lenguaje del valor</h2><p>Hablá de resultados, no de insumos. «Esta vela dura 60 horas» comunica valor; «uso cera de soja importada» es un insumo.</p></div>\n  </section>\n</body>\n</html>"
}
```

**Por qué es el caso típico:** Bonus de 3 capítulos cortos en español con palette Obra default. Verifica que los IDs `chapter-1/2/3` están presentes, los links del TOC son correctos, el contenido de capítulos se inserta verbatim, y el CSS usa custom properties.

---

### Ejemplo 2 — Order bump (`pt-BR`, con imagen de portada, letter landscape)

**Variables de input:**
```
artifact_type: "bump"
title: "Mini-guia: Precificação em 48 horas"
author: null
content_locale: "pt-BR"
palette: {"primary":"#8b2fc9","secondary":"#f3e8ff","accent":"#f59e0b"}
fonts: {"heading":"Playfair Display","body":"Inter"}
page: {"size":"letter","orientation":"landscape"}
cover_image_url: "https://example.supabase.co/storage/v1/object/sign/project-images/abc/cover.webp?token=xyz"
chapters: [
  {"number":1,"title":"O diagnóstico rápido","content":"<p>Antes de precificar, você precisa saber onde está agora.</p>"},
  {"number":2,"title":"A fórmula dos 3 fatores","content":"<p>Custo real + valor percebido + posicionamento = preço certo.</p>"},
  {"number":3,"title":"Comunique e teste","content":"<p>Preço sem comunicação é só um número. Aprenda a apresentar o valor antes de revelar o preço.</p>"},
  {"number":4,"title":"Próximos 30 dias","content":"<p>Um plano simples para implementar o novo preço sem perder clientes atuais.</p>"}
]
```

**Output esperado (fragmento):**
```json
{
  "html": "<!DOCTYPE html>\n<html lang=\"pt-BR\">\n<head>\n  ...\n  <style>\n    @page { size: 279.4mm 215.9mm; margin: 20mm; }\n    :root {\n      --color-primary: #8b2fc9;\n      --color-secondary: #f3e8ff;\n      --color-accent: #f59e0b;\n      --font-heading: \"Playfair Display\", serif;\n      --font-body: \"Inter\", sans-serif;\n    }\n    ...\n    .page-cover { position: relative; overflow: hidden; background-color: var(--color-primary); }\n    .cover-art { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: 0.6; }\n    ...\n  </style>\n</head>\n<body>\n  <section id=\"cover\" class=\"page page-cover\">\n    <img class=\"cover-art\" src=\"https://example.supabase.co/...\" alt=\"\" />\n    <div class=\"cover-text\">\n      <h1 class=\"cover-title\">Mini-guia: Precificação em 48 horas</h1>\n    </div>\n  </section>\n  <section id=\"toc\" class=\"page page-toc\">\n    <h2 class=\"toc-heading\">Índice</h2>\n    <nav aria-label=\"Índice\">\n      <ol class=\"toc-list\">\n        <li><a href=\"#chapter-1\">O diagnóstico rápido</a></li>\n        <li><a href=\"#chapter-2\">A fórmula dos 3 fatores</a></li>\n        <li><a href=\"#chapter-3\">Comunique e teste</a></li>\n        <li><a href=\"#chapter-4\">Próximos 30 dias</a></li>\n      </ol>\n    </nav>\n  </section>\n  <!-- chapter 1–4 opener + body sections … -->\n</body>\n</html>"
}
```

**Por qué es útil:** Verifica locale `pt-BR` (texto estructural en portugués, `lang="pt-BR"`), page size `letter` en landscape (`@page { size: 279.4mm 215.9mm }`), imagen de portada con `object-fit: cover` + `opacity: 0.6`, autor omitido en portada, y palette personalizada.

---

### Ejemplo 3 — Error: chapters vacíos

**Variables de input:**
```
content_locale: "es"
artifact_type: "bonus"
title: "Mi bonus"
chapters: []
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "message": "El artefacto no tiene capítulos para ensamblar. Generá el contenido del bonus antes de exportar."
}
```

---

### Ejemplo 4 — Error: input malformado

**Variables de input:**
```
content_locale: "es"
chapters: [{"number":1,"title":"Cap 1","content":{"error":"GENERATION_FAILED"}}]
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "message": "El contenido del capítulo 1 contiene un error de generación. Regenerá el capítulo antes de exportar."
}
```

---

## 8. Casos límite

| Caso | Descripción del input | Output esperado |
|------|-----------------------|-----------------|
| **`chapters` vacío** | `chapters: []` | `{"error": "INVALID_INPUT", "message": "..."}` |
| **`content` null en algún capítulo** | `{"number":2,"content":null}` | Reemplazar con `<p>—</p>` antes de enviar — el prompt no debería recibir null |
| **`content` con objeto error** | `{"error":"..."}` en lugar de HTML | `{"error": "INVALID_INPUT", "message": "Capítulo N contiene error..."}` |
| **`cover_image_url` null** | Sin imagen | Portada solo con `background-color: var(--color-primary)`, sin `<img>` |
| **`author` null** | Sin autor | Omitir elemento `<p class="cover-author">` en portada |
| **Artefacto muy largo** | > 4 capítulos × 1 200 palabras | Output truncado al límite de 8 192 tokens — usar `buildDocumentHtml()` para ebooks principales |
| **Fuente no disponible en Google Fonts** | `fonts.heading: "Arial"` | Generar el documento con la fuente; el CSS CSS la aplica igual aunque no haya `<link>` para system fonts |
| **Locale no soportado** | `content_locale: "fr"` | `{"error": "INVALID_INPUT", "message": "Locale 'fr' not supported..."}` |
| **Caracteres especiales en título** | `title: "Velas & precios <especiales>"` | Escapar con `&amp;`, `&lt;`, `&gt;` en los atributos y texto HTML de portada y TOC |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-17 | v1.0 | Versión inicial | Issue #164 — prompt para generar HTML completo desde Claude |

### Decisiones tomadas

- **JSON wrapper `{"html": "..."}` en lugar de HTML plano:** Mantiene consistencia con el patrón de todos los prompts de Obra (output estructurado, parseable). El trade-off es el JSON-encoding del HTML (escape de `"` y `\n`), que se acepta porque el documento ensamblado es corto (< 8 192 tokens).
- **Temperatura 0.2:** El ensamblado es una tarea determinista: CSS correcto, IDs consistentes, HTML válido. La creatividad no aplica; el riesgo de HTML malformado aumenta con temperatura alta.
- **Contenido verbatim:** El prompt NO debe reescribir ni resumir el `chapter.content`. El contenido ya fue aprobado por el usuario. La restricción está explícita en el system prompt y en las reglas HTML.
- **Delegación a `buildDocumentHtml()` para ebooks largos:** El límite de 8 192 tokens hace inviable el ensamblado de ebooks principales (6–12 capítulos) vía Claude. La función programática cubre ese caso con CSS y estructura equivalentes.
- **Google Fonts via `<link>` en lugar de `@import`:** `@import` bloquea el render y no es compatible con Puppeteer en modo `networkidle0`. `<link>` en `<head>` carga de forma más predecible.

### Decisiones descartadas

- **Output como HTML plano (sin JSON wrapper):** Rompería el contrato de todos los prompts de Obra. El parsing en `_shared/prompts.ts` asume JSON.
- **Generar también el contenido de capítulos desde este prompt:** Supera los límites de tokens y duplica la responsabilidad de `generate-chapter`, `generate-bonus-chapter` y `generate-bump-chapter`. Este prompt es solo de ensamblado, no de generación.
- **Chunking automático para ebooks largos:** Agrega complejidad (join, head/body split) sin beneficio claro sobre `buildDocumentHtml()`. Descartado para v1.0.

### Próximos experimentos

- [ ] Testear temperatura 0.1 vs 0.2 para verificar si 0.1 reduce errores de HTML mal formado sin perder variedad en la estructura CSS generada
- [ ] Evaluar si `claude-haiku-4-5` es suficiente para ensamblado puro (ahorro de costo significativo dado que es tarea de layout, no de razonamiento profundo)
- [ ] Medir latencia promedio para bonus de 3 capítulos vs. `buildDocumentHtml()` programático — decidir si Claude agrega valor o solo latencia
- [ ] Explorar versión "template-only": Claude genera solo el CSS + shell HTML (sin contenido), código inyecta `chapter.content` con string replace — habilitaría ebooks de cualquier tamaño

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
