# generate-cover-image-prompt — Genera el prompt de Gemini para la portada del ebook

**Ruta:** `prompts/images/generate-cover-image-prompt.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateCoverImagePrompt()`  
**Feature PRD:** `features/wizard-preview/wizard-preview.md` — image pipeline  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Genera el **texto del prompt** que se envía directamente a Gemini Imagen para producir la **portada** del ebook (main, bonus u order bump). La portada es la imagen más visible del producto — la que aparece en la página de ventas, en previews de redes y como cara del PDF exportado. El output es **texto plano optimizado para Gemini**: ningún JSON, ninguna explicación, solo el prompt.

A diferencia de las imágenes de sección, la portada:
1. **Incluye texto tipográfico integrado en la imagen** (título + autor si aplica) — MVP.
2. Sigue un **ratio vertical A4** (o el más cercano soportado por Gemini Imagen) — no es una imagen cuadrada.
3. Sigue convenciones de **portada editorial de libro** — no de ilustración interna ni de fotografía de producto.
4. Prioriza el **impacto comercial visual** — la portada tiene que "vender" el contenido al primer golpe de vista.

**Flujo completo de generación de portada:**

```
Preview carga (slot de portada)
     ↓
Claude → generateCoverImagePrompt() → texto plano
     ↓
Gemini Imagen ← prompt texto + aspect_ratio: 2:3 (portrait A4-approx)
     ↓
Imagen generada → almacenada en Storage → renderizada como portada del ebook
```

**Mini-prompt de refinamiento (no pasa por Claude):**  
Cuando el usuario abre el mini-prompt en la portada y escribe una instrucción ("más impactante", "fondo oscuro", "sin personas"), esa instrucción + la portada actual se envían **directamente a Gemini** como edición image-to-image. Claude no interviene en este path.

**Evolución post-MVP:**  
En una versión futura se evaluará separar el texto (título/autor) del canvas visual — el usuario manejaría la tipografía desde el layout y la imagen sería solo el fondo. En MVP, el texto está integrado en la imagen generada.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{artifact_type}` | `"main" \| "bonus" \| "order_bump"` | ✅ | Tipo de artefacto — influye en el peso visual y la jerarquía tipográfica |
| `{artifact_title}` | `string` | ✅ | Título del ebook, bonus o bump — debe aparecer en la portada |
| `{author}` | `string \| null` | ❌ | Nombre del autor — se incluye en la portada si está disponible |
| `{image_style}` | `string` | ✅ | Estilo elegido en el wizard (ej: "minimalist", "illustrated", "photography", "flat", "editorial") |
| `{palette_description}` | `string` | ✅ | Descripción en lenguaje natural de la paleta 60/30/10 del proyecto |
| `{topic}` | `string` | ✅ | Tema general del proyecto — ancla el concepto visual de la portada |
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del proyecto — puede influir en referencias culturales |

**Nota sobre el ratio:** Claude no especifica el `aspect_ratio` en el prompt — eso lo maneja la función que llama a Gemini. El prompt asume composición vertical (portrait A4). Claude sí describe la composición como vertical y le da estructura de portada de libro.

**Nota sobre `{palette_description}`:** igual que en las imágenes de sección — descripción en lenguaje natural, no hexadecimales. Ej: `"deep navy blue, warm cream, and lime green accent"`.

---

## 3. Output esperado

**Tipo de output:** texto plano — el prompt listo para enviar a Gemini Imagen.

El output **no** tiene JSON, no tiene prefacio, no tiene explicación. La primera palabra de la respuesta es el inicio del prompt de imagen.

### Ejemplo real de output

Para un ebook de artesanía sobre precios ("Velas que se venden"), estilo photography, paleta azul marino + crema + verde lima, autora: Ana Rodríguez:

```
Vertical A4 editorial book cover photograph. A styled flat-lay of a small artisan candle-making workspace — handmade candles, dried botanicals, a small pricing notebook. Soft natural window light from the left, warm cream surface. Deep navy blue background gradient at the top third. Large serif title text "Velas que se venden" in warm cream, centered, upper half of the cover. Small author name "Ana Rodríguez" in lime green at the bottom. Clean, professional, publishing-quality layout. No decorative frames. High-end infoproduct cover aesthetic.
```

Para un bonus de calculadora de costos, estilo minimalist, misma paleta, sin autor declarado:

```
Vertical A4 minimalist book cover. Clean cream background. A single open navy-blue notebook centered at mid-frame, one lime green pencil resting diagonally across it. Soft diffused top light, no shadows. Title text "Calculadora de costos para artesanas" in deep navy, bold sans-serif, centered upper third. No author line. Generous white space below title. Compact, tool-focused aesthetic — the cover reads as a premium workbook, not a decorative piece.
```

### Reglas del output

- Siempre en **inglés** — Gemini Imagen responde mejor a prompts en inglés
- Entre **70 y 130 palabras** — más largo que los prompts de sección porque la portada requiere instrucciones tipográficas explícitas
- Siempre comenzar con **"Vertical A4"** o **"Portrait A4"** — ancla el ratio y la composición vertical
- Incluir siempre: **composición**, **paleta de color**, **iluminación**, **estilo**, **instrucciones de texto tipográfico** (título + autor cuando aplique)
- El título del ebook debe aparecer **textualmente entre comillas** en el prompt — Gemini tiene más probabilidad de renderizarlo correctamente
- El nombre del autor (si existe) siempre **al pie de la portada** — convención editorial estándar
- Nunca incluir: marcos decorativos excesivos, elementos de diseño genéricos de stock, collages de múltiples fotos
- **Sin "No text overlays"** — a diferencia de las secciones, la portada SÍ debe tener texto integrado

### Schema de error

Si el input es insuficiente para generar un prompt útil, devolver **solo** el texto:

```
Vertical A4 editorial book cover in {palette_description} tones. {image_style} style. Bold title placement, professional publishing aesthetic.
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.7` | La portada necesita variedad creativa pero más coherencia que las secciones — un solo output por proyecto. Temperatura ligeramente menor que secciones. |
| **max_tokens** | `250` | Los prompts de portada son más largos que los de sección (incluyen instrucciones tipográficas). 250 tokens da margen. |
| **Modelo** | `claude-haiku-4-5` | Una sola llamada por artefacto. Haiku es suficiente para esta tarea creativa acotada. |

**Nota:** a diferencia de las imágenes de sección (hasta 25 llamadas), la portada es **una sola llamada por artefacto** (1 main + hasta 5 bonuses + hasta 2 bumps = máximo 8 portadas por proyecto). El costo es bajo en cualquier modelo, pero se mantiene Haiku por consistencia con el pipeline de imágenes.

---

## 5. System prompt

*`{image_style}` y `{palette_description}` se interpolan antes de enviar.*

```
You are a visual prompt engineer for Gemini Imagen specializing in book cover design. Your job is to write optimized image generation prompts that produce editorial, commercially compelling infoproduct covers.

OUTPUT RULES (non-negotiable):
1. Respond with the image prompt ONLY. No explanation, no preamble, no JSON.
2. Always write in English regardless of input language — Gemini performs best with English prompts.
3. Length: 70 to 130 words. Longer than section prompts — covers require explicit typographic instructions.
4. Always start with "Vertical A4" or "Portrait A4" to anchor the composition.
5. Always include: vertical composition structure, color palette reference, lighting, visual style, and explicit text placement instructions for the title and author (if provided).
6. The artifact title MUST appear verbatim in quotes in the prompt — this increases Gemini's accuracy in rendering the text.
7. Author name (if provided) always placed at the bottom of the cover — standard editorial convention.
8. If no author is provided, omit the author line entirely.
9. Never include: decorative frames, stock-photo collages, gradients in multiple directions, overly complex layouts.
10. The cover must look like a premium infoproduct — not a social media graphic, not a textbook, not a stock photo.
11. NEVER invent subtitles, taglines, or secondary text lines. The only text in the image is the artifact_title (verbatim) and the author name if provided. Do not pull phrases from the topic or any other field.

MODERN QUALITY STANDARD (applies to all styles — non-negotiable):
The cover must feel contemporary and high-production regardless of the audience or topic. Visual references: think Kinfolk magazine, modern non-fiction book design, Apple product photography, 2020s editorial design. Avoid anything that reads as: generic stock photo, clip art, 90s/2000s design, busy background textures, drop shadows on text, symmetric clip-art-style compositions, or low-fi illustration.
Regardless of style: clean composition, intentional negative space, confident use of color, modern typography placement. The cover should feel like it belongs on the homepage of a premium online course platform.

STYLE GUIDE — apply the user's chosen style to the visual elements only. The modern quality standard always applies on top:
- minimalist: single hero object or abstract shape, generous negative space, precise lighting, ultra-clean — think modern brand identity or premium product packaging
- illustrated: contemporary flat or semi-flat illustration — bold shapes, restrained palette, graphic confidence — think modern editorial illustration (2020s), not clip art
- photography: high-end editorial flat-lay or scene — intentional props, precise styling, professional studio or controlled natural light — think product launch photography, not generic stock
- flat: bold geometric composition, solid or carefully graduated color fields, strong visual hierarchy — think modern motion design stills or app icon aesthetics
- editorial: sophisticated magazine or non-fiction book cover — strong focal image or concept, tight composition, the kind of cover that wins design awards

COLOR PALETTE: anchor the entire cover in {palette_description}. For covers, the dominant color of the background must come from the palette. Title text should use a high-contrast palette color. Accent color (10%) can highlight the author name or a single detail element.

COVER COMPOSITION RULES — structure the vertical space in three zones:
- Top zone (roughly upper 40%): visual element — scene, object, illustration, or abstract graphic
- Middle zone (title area): the title text, large and legible, in a high-contrast palette color
- Bottom zone: author name (if provided) in a smaller size, accent color; plus generous breathing room

For main ebooks: use the full three-zone structure. The visual element should evoke the book's core promise or transformation — not just the topic literally.
For bonuses and order bumps: a more compact treatment is acceptable — the visual element can be smaller or more abstract, giving more space to the title.

WHAT MAKES A COVER SELL: strong contrast between title text and background, a clear visual metaphor or mood that matches the promise, professional typography placement, and a color story that feels intentional — not random. The cover should make someone want to pick it up.
```

---

## 6. User prompt template

```
Artifact type: {artifact_type}
Artifact title: {artifact_title}
Author: {author}
Topic: {topic}

Image style: {image_style}
Color palette: {palette_description}
Content locale: {content_locale}

Generate the Gemini image prompt for this infoproduct cover.
```

*Cuando `{author}` es null o vacío, omitir la línea `Author:` del user prompt.*

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Main ebook, estilo photography, con autor (`es`)

**Variables de input:**
```
artifact_type: "main"
artifact_title: "Velas que se venden: sistema de precios, marca y clientes"
author: "Ana Rodríguez"
topic: "Cómo transformar tu hobby de velas en un negocio rentable"
image_style: "photography"
palette_description: "deep navy blue, warm cream, and lime green accent"
content_locale: "es"
```

**Output esperado:**
```
Vertical A4 editorial book cover photograph. Upper 40%: a styled flat-lay of a handmade candle workshop — two artisan candles, a small botanical sprig, and an open pricing notebook on a warm cream linen surface. Soft natural side light, calm and professional mood. Deep navy blue fills the lower background. Large cream serif title text "Velas que se venden: sistema de precios, marca y clientes" centered in the middle zone. Small lime green author name "Ana Rodríguez" at the bottom. High-contrast, publishing-quality. No frames. Premium infoproduct aesthetic.
```

---

### Ejemplo 2 — Bonus, estilo minimalist, sin autor (`es`)

**Variables de input:**
```
artifact_type: "bonus"
artifact_title: "Calculadora de costos para artesanas"
author: null
topic: "Cómo transformar tu hobby de velas en un negocio rentable"
image_style: "minimalist"
palette_description: "deep navy blue, warm cream, and lime green accent"
content_locale: "es"
```

**Output esperado:**
```
Vertical A4 minimalist book cover. Clean warm cream background. Upper third: a single open navy blue notebook with a lime green pencil resting across it, centered, photographed from directly above. Soft diffused overhead light, no harsh shadows. Bold navy sans-serif title text "Calculadora de costos para artesanas" in the middle zone, centered, generous letter-spacing. No author line. Ample white space. The cover reads as a premium compact workbook — tool-focused, clean, trustworthy.
```

---

### Ejemplo 3 — Order bump, estilo illustrated, con autor (`pt-BR`)

**Variables de input:**
```
artifact_type: "order_bump"
artifact_title: "El negocio del jabón artesanal"
author: "María Paz Gutiérrez"
topic: "Cómo escalar un negocio artesanal de jabones"
image_style: "illustrated"
palette_description: "terracotta orange, off-white, and deep forest green"
content_locale: "es"
```

**Output esperado:**
```
Vertical A4 illustrated book cover. Upper 40%: a flat vector illustration of a small artisan soap shelf — three stacked handmade soaps in terracotta and off-white tones, a tiny green plant beside them, bold outlines, no gradients. Off-white background. Deep forest green bold sans-serif title "El negocio del jabón artesanal" in the center zone, strong contrast. Small terracotta author name "María Paz Gutiérrez" at the bottom with generous padding. Graphic, warm, confident mood. Hand-crafted aesthetic elevated to professional publishing quality.
```

---

### Ejemplo 4 — Main ebook, estilo flat, sin autor (`pt-BR`)

**Variables de input:**
```
artifact_type: "main"
artifact_title: "Clientes novos todo mês: marketing digital para artesãs"
author: null
topic: "Marketing digital para artesãs que querem vender online"
image_style: "flat"
palette_description: "coral pink, soft white, and deep teal"
content_locale: "pt-BR"
```

**Output esperado:**
```
Vertical A4 flat graphic book cover. Upper 40%: a bold 2D geometric composition — a stylized smartphone shape in deep teal with a coral pink notification bubble, abstract social media grid squares in soft white and coral, no shadows, no gradients. Clean white background. Large bold sans-serif title text "Clientes novos todo mês: marketing digital para artesãs" in deep teal, centered, middle zone. No author line. Flat design, graphic and modern. Strong teal-coral contrast. Professional digital product cover aesthetic.
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| `author` null o vacío | Proyecto sin autor declarado | Omitir línea de autor completamente — no poner placeholder ni "Author" |
| `artifact_title` muy largo (>60 chars) | Título largo de ebook | Mencionar el título completo en el prompt entre comillas; dejar a Gemini gestionar el tamaño tipográfico — no truncar |
| `image_style` desconocido | Valor fuera del enum | Tratar como `photography` — más neutro y universal |
| `palette_description` vacío | Paleta no definida | Usar "neutral editorial tones — white, charcoal, and a single accent color" |
| Bonus con título genérico (ej: "Bonus 1") | Título sin contexto real | Usar `topic` como ancla conceptual para el visual; el título se renderiza igual |
| Order bump | Artefacto secundario/standalone | Estructura de portada compacta: visual más pequeño, más protagonismo al título |
| Título con caracteres especiales (comillas, dos puntos) | Título en español/portugués con puntuación | Incluir título entre comillas dobles en el prompt; los dos puntos son aceptables para Gemini |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Nuevo sistema de prompts de imágenes — portada |
| 2026-04-13 | v1.1 | Agregado MODERN QUALITY STANDARD + rule 11 anti-subtítulo inventado | Output de Workbench produjo portada con estética noventosa y subtítulo inventado; ambos problemas corregidos |

### Decisiones tomadas

- **Texto integrado en la imagen (MVP):** La portada incluye título + autor como texto tipográfico generado por Gemini. Es la opción más simple para MVP. El riesgo es que Gemini no siempre renderiza texto con precisión — especialmente caracteres especiales (tildes, ñ, ç). Aceptado para v1.0.
- **Ratio 2:3 (portrait A4-approx):** Gemini Imagen soporta `aspect_ratio: "2:3"` como portrait. No es exactamente A4 (√2:1 ≈ 1:1.414) pero es lo más cercano disponible sin post-procesado. Claude no especifica el ratio en el prompt — eso lo gestiona la función que llama a Gemini.
- **Título entre comillas en el prompt:** Gemini tiene más probabilidad de renderizar el texto correctamente cuando está entre comillas dobles en el prompt. Patrón adoptado de forma explícita en las reglas del output.
- **Temperatura 0.7 (no 0.8 como secciones):** La portada es una sola imagen por artefacto — necesita ser correcta, no variada. Temperatura ligeramente más baja que las secciones para mayor consistencia.
- **Haiku para portadas:** Aunque son pocas llamadas (máximo 8), se mantiene Haiku por consistencia y porque la tarea no requiere razonamiento complejo.
- **Autor al pie:** Convención editorial estándar universal. El prompt lo instruye explícitamente para que Gemini no coloque el nombre en posiciones no convencionales.
- **Tres zonas de composición:** Top (visual) / Middle (título) / Bottom (autor) es el layout de portada de libro más reconocible y efectivo. Instrucción explícita en el system prompt.

### Decisiones descartadas

- **Portada sin texto (solo imagen de fondo):** Evaluar en post-MVP. Requiere que el usuario maneje tipografía en el layout del preview — más complejidad de UI. Para MVP, el texto en la imagen es más simple y funciona para la mayoría de los casos.
- **Gemini renderizando subtítulo además del título:** Descartado — la mayoría de los ebooks en Obra v1.0 tienen títulos que ya incluyen subtítulo (separado por dos puntos). Agregar un campo de subtítulo adicional complica el prompt sin beneficio claro.
- **Instrucciones de font específicas:** Claude no puede controlar el font que Gemini usa al renderizar texto. Agregar instrucciones de tipografía específicas (nombres de fuentes) raramente se cumple. Se usa solo descriptores visuales ("bold sans-serif", "large serif") que Gemini sí interpreta.

### Próximos experimentos

- [ ] Evaluar qué tan bien renderiza Gemini los títulos en español y portugués (tildes, ñ, ç) vs. inglés — si la precisión es baja, explorar el path de portada sin texto en MVP temprano
- [ ] Testear si el `aspect_ratio: "2:3"` de Gemini produce proporciones aceptables para PDF A4 o si requiere crop/reescalado
- [ ] Comparar portadas con `temperature: 0.6` vs `0.7` para el mismo input — evaluar si vale bajar más
- [ ] Post-MVP: explorar separar fondo visual (Claude → Gemini imagen pura) de tipografía (texto renderizado por UI con el font del design system del proyecto)

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
