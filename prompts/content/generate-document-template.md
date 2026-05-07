# generate-document-template — Genera el HTML editorial del documento

**Implementación:** `supabase/functions/_shared/prompts.ts` → `generateDocumentHeaderPrompt()` + `generateChapterHtmlPrompt()`  
**Edge Function:** `supabase/functions/generate-document-template/index.ts`  
**Feature PRD:** `features/wizard-preview/wizard-preview.md` — §HTML rendering pipeline  
**Estado:** `active`  
**Última revisión:** 2026-05-04

---

## 1. Objetivo

Genera el HTML editorial completo de un artefacto de Obra (ebook principal, bonus, order bump) con el design system del proyecto aplicado. El output incluye portada, TOC, chapter openers y body con el **contenido de los capítulos ya embebido** — no hay placeholders.

El mismo HTML se usa para el **preview en browser** (paso 3) y la **exportación PDF** (Puppeteer).

---

## 2. Arquitectura de generación — dos fases

La generación está dividida en dos tipos de llamadas para evitar límites de output tokens:

| Fase | Función | Modelo | Output |
|------|---------|--------|--------|
| **1 — Header** | `generateDocumentHeaderPrompt()` | Sonnet | CSS toolkit + portada + TOC, envuelto en `<obra-header>…</obra-header>` |
| **2 — Capítulos** | `generateChapterHtmlPrompt()` | Haiku | Un opener + body por capítulo, en paralelo. Cada uno en `<obra-chapter>…</obra-chapter>` |

La Edge Function ensambla: `header + chapter_1 + … + chapter_N + </body></html>`.

El HTML resultante se guarda en `ebooks.html_shell`. La respuesta es **streaming NDJSON** para evitar el timeout de 150s de Supabase.

---

## 3. Inputs

### Phase 1 — `generateDocumentHeaderPrompt`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `content_locale` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | Controla `lang` del HTML y textos estructurales (TOC heading, chapter label) |
| `artifact_type` | `"main_ebook" \| "bonus" \| "bump"` | Tipo de artefacto |
| `title` | `string` | Título del ebook (`ebooks.title`) |
| `author` | `string \| null` | Nombre del autor; omitido del HTML si es `null` |
| `chapter_titles` | `string[]` | Títulos en orden `sort_order` — para el TOC |
| `palette` | `{ primary, secondary, accent }` | Colores hex del design system (60/30/10) |
| `fonts` | `{ heading, body }` | Nombres de Google Fonts |
| `page` | `{ size: "a4"\|"letter", orientation: "portrait"\|"landscape" }` | Tamaño y orientación |

### Phase 2 — `generateChapterHtmlPrompt`

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `content_locale` | `ContentLocale` | Para etiquetas estructurales |
| `chapter_number` | `number` | 1-based |
| `chapter_total` | `number` | Total de capítulos del artefacto |
| `chapter_title` | `string` | Título del capítulo |
| `chapter_content` | `string` | HTML sanitizado de Tiptap (`chapters.content`) |
| `palette` | `{ primary, secondary, accent }` | Design system |
| `fonts` | `{ heading, body }` | Fuentes |

---

## 4. Output

### Estructura ensamblada

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <!-- Google Fonts link -->
  <style>
    /* CSS toolkit completo — ver §5 */
  </style>
</head>
<body>

  <!-- Phase 1 output (obra-header) -->
  <div class="obra-page obra-cover"> … </div>
  <div class="obra-page obra-toc"> … </div>

  <!-- Phase 2 output (obra-chapter × N) -->
  <div class="obra-page obra-chapter-opener" id="chapter-1"> … </div>
  <div class="obra-page obra-body"> … contenido real del cap 1 … </div>

  <div class="obra-page obra-chapter-opener" id="chapter-2"> … </div>
  <div class="obra-page obra-body"> … contenido real del cap 2 … </div>

  <!-- capítulos largos pueden tener múltiples .obra-body consecutivos -->

</body>
</html>
```

### Streaming NDJSON (Edge Function → cliente)

```jsonc
{ "type": "ping", "phase": 1 }                          // después del header
{ "type": "ping", "chapters_done": 3, "total": 8 }      // keepalive periódico
{ "type": "done", "htmlShell": "…", "shellMeta": { … } } // final
{ "type": "error", "error": "…", "status": 502 }        // si falla
```

---

## 5. CSS — reglas obligatorias de paginación

Estas reglas se incluyen **verbatim** en el system prompt. No delegarlas a Claude.

```css
/* ── Page setup — cero @page margin; márgenes via padding en wrappers ── */
@page { size: {page_dimensions}; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* ── Page breaks ── */
.obra-page { break-after: page; page-break-after: always; }
.obra-page:last-child { break-after: avoid; page-break-after: avoid; }

/* ── Full-bleed pages: altura fija, overflow hidden ── */
.obra-cover,
.obra-chapter-opener {
  position: relative; overflow: hidden;
  height: {page_height}; min-height: {page_height};
  break-inside: avoid; page-break-inside: avoid;
}

/* ── Content pages: padding ES el margen ── */
.obra-body,
.obra-toc {
  padding: 15mm;
  background: var(--page-bg);   /* secondary color — siempre el más claro */
  box-sizing: border-box;
}

/* ── Break rules — previene cortes feos ── */
.obra-body h2,
.obra-body h3 { break-after: avoid; page-break-after: avoid; }

/* heading pegado al elemento que lo sigue */
.obra-body h2 + *,
.obra-body h3 + * { break-before: avoid; page-break-before: avoid; }

.obra-body p { orphans: 4; widows: 4; }

/* todos los contenedores editoriales: nunca partirlos entre páginas */
.obra-callout,
.obra-pull-quote,
figure, table, blockquote,
.obra-image-slot--chapter { break-inside: avoid; page-break-inside: avoid; }

.obra-body li { break-inside: avoid; page-break-inside: avoid; orphans: 3; widows: 3; }

/* ── Screen preview ── */
@media screen {
  html { zoom: 0.75; }
  body { background: #c8d0dc; padding: 32px 16px; }
  .obra-page { width: {page_width}; margin: 0 auto 32px; box-shadow: 0 4px 28px rgba(0,0,0,0.18); }
  .obra-toc, .obra-body { min-height: {page_height}; }
}
```

**Por qué `@page { margin: 0 }` en vez de named pages:**  
Los named pages (`@page obra-full-bleed`) son más complejos y su soporte en Puppeteer es inconsistente. El approach de `margin: 0` + `padding` en los wrappers produce el mismo resultado visual con comportamiento más predecible.

**Por qué `break-inside: avoid` en todos los contenedores editoriales:**  
En la versión anterior solo se aplicaba a `li` y `blockquote`. Callouts y pull-quotes se cortaban a mitad. La regla ahora cubre todos los elementos que Claude puede generar. Limitación: si un callout supera una página de alto, igual se cortará — por eso el prompt instruye mantenerlos en ≤ 4 líneas.

---

## 6. CSS variables y color de página

```css
:root {
  --color-primary:   [hex del primary];
  --color-secondary: [hex del secondary];
  --color-accent:    [hex del accent];
  --font-heading:    "[Heading Font]", Georgia, serif;
  --font-body:       "[Body Font]", system-ui, sans-serif;

  /* --page-bg es SIEMPRE el secondary — el neutro claro que rellena las páginas de contenido */
  --page-bg: var(--color-secondary);
}
```

El 60/30/10 de Obra garantiza que secondary es siempre el color más claro y neutral. Usarlo como `--page-bg` da al documento un fondo coherente con la paleta del proyecto.

---

## 7. Toolkit editorial — clases definidas en Phase 1

Todas estas clases las define el CSS del header. Los capítulos (Phase 2) las usan sin redefinirlas.

| Clase | Uso | Regla de break |
|-------|-----|----------------|
| `.obra-callout` | Conceptos clave, tips, advertencias | `break-inside: avoid` — mantener ≤ 4 líneas |
| `.obra-pull-quote` | 1–2 frases con énfasis visual | `break-inside: avoid` — una sola oración |
| `.obra-section-divider` | Línea decorativa entre secciones | — |
| `.obra-highlight` | Términos clave inline | — |
| `.obra-styled-list` | Listas con bullets → accent | `li: break-inside: avoid` |
| `.obra-two-col` | Prose densa o listas de ≥ 6 items | — |
| `h2`, `h3` | Headings de sección | `break-after: avoid` |
| `table` | Datos comparativos | `break-inside: avoid` |
| `.obra-image-slot--chapter` | (Clase CSS definida, reservada para uso futuro inline en body) | `break-inside: avoid` |

---

## 8. Parámetros de modelo

| Fase | Modelo | Temperatura | max_tokens | Razón |
|------|--------|:-----------:|:----------:|-------|
| Header (CSS + cover + TOC) | `claude-sonnet-4-6` | `0.3` | `8192` | CSS con reglas no negociables; necesita consistencia alta |
| Capítulos (opener + body) | Haiku (`getClaudeChapterModel()`) | `0.4` | `8192` | N llamadas en paralelo; temperatura levemente mayor para variedad de diseño de openers |

---

## 9. Interpolación de dimensiones

| `page.size` | `page.orientation` | `{page_width}` | `{page_height}` | `{page_dimensions}` |
|-------------|-------------------|----------------|-----------------|---------------------|
| `a4` | `portrait` | `210mm` | `297mm` | `210mm 297mm` |
| `a4` | `landscape` | `297mm` | `210mm` | `297mm 210mm` |
| `letter` | `portrait` | `215.9mm` | `279.4mm` | `215.9mm 279.4mm` |
| `letter` | `landscape` | `279.4mm` | `215.9mm` | `279.4mm 215.9mm` |

---

## 10. Image slots

### Portada

Generado en Phase 1 por el header prompt. Slot `data-slot-key="cover"`, full-bleed (z-index 1), con overlay CSS `::after` para legibilidad del texto.

### Chapter openers (uno por capítulo)

Generado en Phase 2 por el chapter prompt. Cada opener incluye un slot full-bleed:

```html
<div class="obra-image-slot"
     data-slot-key="chapter-N-image-1"
     data-slot-type="chapter"
     style="position:absolute;inset:0;width:100%;height:100%;z-index:2;overflow:hidden;background:transparent">
</div>
```

- `background:transparent` → cuando vacío, el fondo de color primario (z-index 0) se ve a través.
- Cuando se inyecta una imagen, el slot se convierte en full-bleed image sobre el opener.
- El texto del opener (z-index 3) queda siempre encima.

### Inyección de URLs

Después de recibir el `htmlShell`, el cliente llama a `injectAll()` para reemplazar los image slots con URLs firmadas:

```typescript
// obra/src/lib/preview/injectAll.ts
injectAll(htmlShell, { images: { "cover": signedUrl, "chapter-1-image-1": signedUrl2 } })
```

`injectAll` busca `<div ... data-slot-key="{key}" ...></div>` e inserta `<img src="...">` dentro. El slot key en el estado del cliente tiene el formato compuesto `{ebookId}:{slotKey}` y se mapea a la key del HTML al armar `imageUrls`.

---

## 11. Casos límite

| Caso | Comportamiento |
|------|----------------|
| `chapter_content` vacío o null | Phase 2 usa `<p>—</p>` como fallback |
| `author: null` | Portada sin nombre de autor |
| `chapter_titles` vacío | Edge Function retorna `{ error: "no_chapters" }` antes de llamar a Claude |
| Capítulo muy largo | Phase 2 abre múltiples `<div class="obra-page obra-body">` consecutivos |
| Callout > 1 página | Se corta igual — limitación de CSS. El prompt instruye mantenerlos cortos |
| Fuente sin Google Fonts (e.g. "Georgia") | El `<link>` la incluye igual; funciona como system font fallback |
| PDF sin internet (Puppeteer sin acceso a fonts.googleapis.com) | El PDF sale con fallbacks serif/sans-serif |

---

## 12. Notas de iteración

### Historial

| Fecha | Versión | Cambio |
|-------|---------|--------|
| 2026-04-17 | v1.0 | Approach de placeholders `{{CHAPTER_N_CONTENT}}` + single call |
| 2026-04-28 | v2.0 | Refactor a dos fases (header + chapters en paralelo); contenido embebido; streaming NDJSON |
| 2026-05-04 | v2.1 | `@page { margin: 0 }` reemplaza named pages; `break-inside: avoid` en todos los contenedores editoriales; `--page-bg: var(--color-secondary)`; instrucciones de diseño de portada y TOC mucho más ricas |

### Decisiones tomadas

- **`@page { margin: 0 }` + padding en wrappers:** Los named pages (`@page obra-full-bleed`) son complejos y su soporte en Puppeteer es inconsistente entre versiones. El approach de margin-cero + padding reproduce el mismo resultado con comportamiento predecible. Es también el patrón que usan los ejemplos de referencia del proyecto.

- **`break-inside: avoid` en todos los contenedores editoriales:** La versión anterior solo lo aplicaba a `li` y `blockquote`. Los callouts y pull-quotes se cortaban. Ahora la regla cubre todos los elementos que Claude puede generar. La limitación (elementos > 1 página igual se cortan) se documenta y el prompt instruye mantenerlos cortos.

- **`--page-bg: var(--color-secondary)` como fondo de hoja:** En el sistema 60/30/10 de Obra, el secondary siempre es el color más claro y neutral. Usarlo como fondo da coherencia visual entre el design system del proyecto y el documento generado.

- **`h2 + * { break-before: avoid }`:** Mantiene el heading pegado al párrafo o elemento que lo sigue. Sin esta regla un heading podía quedar al final de la página sin nada después.

- **Contenido embebido (no placeholders):** La v1.0 usaba `{{CHAPTER_N_CONTENT}}`. El approach actual pasa el contenido directamente a Phase 2, lo que permite que Claude aplique clases editoriales (`obra-callout`, `obra-pull-quote`, etc.) al contenido real. Los placeholders impedían cualquier tratamiento editorial del body.

- **Dos fases en paralelo:** El header (CSS + cover + TOC) es una llamada a Sonnet. Los capítulos son N llamadas paralelas a Haiku. Esto reduce el wall-clock time en documentos con muchos capítulos y evita el límite de output tokens.

### Decisiones descartadas

- **Named pages CSS (`@page obra-full-bleed`):** Descartado en v2.1 — comportamiento inconsistente en Puppeteer; reemplazado por `@page { margin: 0 }` + padding.
- **Single call con todo el contenido:** Supera límite de tokens para ebooks de 8+ capítulos.
- **Placeholders + inyección de string:** Impedía el tratamiento editorial del contenido. Reemplazado por contenido embebido en Phase 2.
- **`display: table` como workaround de `break-inside`:** Altera el modelo de layout. Innecesario en Puppeteer moderno (Chrome-based) que respeta `break-inside: avoid`.

### Próximos experimentos

- [ ] Verificar si `break-inside: avoid` en `.obra-body > *` (todos los hijos directos) mejora paginación sin generar gaps excesivos
- [ ] Testear temperatura 0.2 para el header — reducir errores de CSS malformado
- [ ] Medir si la latencia mejora pre-generando el header en background cuando el usuario entra a Preview
- [ ] Evaluar agregar `column-fill: balance` para capítulos muy cortos con mucho espacio en blanco

### Problemas conocidos

- **Elementos muy altos partidos:** Callouts o pull-quotes con demasiado texto se cortan aunque tengan `break-inside: avoid`. La regla solo funciona si el elemento cabe en una página. Mitigación: el prompt instruye mantener callouts en ≤ 4 líneas.
- **Overflow preview vs. PDF:** Capítulos largos expanden el `.obra-body` en screen mode (sin altura fija). En PDF, Puppeteer genera múltiples páginas automáticamente. La discrepancia es aceptable en MVP.
- **Google Fonts en Puppeteer:** Requiere conectividad a `fonts.googleapis.com`. Sin acceso, el PDF usa fallbacks.
