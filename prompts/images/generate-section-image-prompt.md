# generate-section-image-prompt — Genera el prompt de Gemini para una imagen de sección

**Ruta:** `prompts/images/generate-section-image-prompt.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateSectionImagePrompt()`  
**Feature PRD:** `features/wizard-preview/wizard-preview.md` — image pipeline  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Genera el **texto del prompt** que se envía directamente a Gemini Imagen para producir la imagen de una sección del infoproducto. Se llama una vez por slot de imagen — un capítulo del ebook principal, una sección de bonus, o un capítulo de order bump. El output es **texto plano optimizado para Gemini**: ningún JSON, ninguna explicación, solo el prompt.

Claude recibe el contexto del capítulo (título, descripción, conceptos clave) junto con el estilo visual elegido por el usuario y la paleta del proyecto, y produce una descripción visual específica, coherente con el contenido del capítulo y lista para renderizar en Gemini.

**Flujo completo de generación de imágenes:**

```
Preview carga
     ↓
Para cada slot de imagen (top → bottom):
     ↓
Claude → generateSectionImagePrompt() → texto plano
     ↓
Gemini Imagen ← prompt texto
     ↓
Imagen generada → almacenada en Storage → renderizada en el slot
```

**Mini-prompt de refinamiento (no pasa por Claude):**  
Cuando el usuario abre el mini-prompt en una imagen existente y escribe una instrucción ("más colores cálidos", "sin personas", "más abstracto"), esa instrucción + la imagen actual se envían **directamente a Gemini** como edición de imagen (image-to-image). Claude no interviene en este path.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{artifact_type}` | `"main" \| "bonus" \| "order_bump"` | ✅ | Tipo de artefacto — influye en el tono visual |
| `{artifact_title}` | `string` | ✅ | Título del ebook, bonus o bump — ancla temática |
| `{chapter_title}` | `string` | ✅ | Título del capítulo o sección |
| `{chapter_description}` | `string` | ✅ | Descripción del capítulo del índice (max 280 chars) |
| `{key_concepts}` | `string` | ✅ | Key concepts del capítulo serializados como lista de texto plano |
| `{chapter_number}` | `number` | ✅ | Posición del capítulo — capítulo 1 y último tienen tratamiento especial |
| `{chapter_count}` | `number` | ✅ | Total de capítulos del artefacto |
| `{image_style}` | `string` | ✅ | Estilo elegido en el wizard (ej: "minimalist", "illustrated", "photography", "flat", "editorial") |
| `{palette_description}` | `string` | ✅ | Descripción en lenguaje natural de la paleta 60/30/10 del proyecto (ej: "deep navy blue, warm cream, and lime green accent") |
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del proyecto — puede influir en referencias culturales |

**Nota sobre `{palette_description}`:** la paleta viene del design system del proyecto (elegida en el wizard de estructura). Se convierte a descripción en lenguaje natural en el código antes de pasarla al prompt. No se pasan hexadecimales — Gemini responde mejor a nombres de colores.

**Nota sobre `{key_concepts}`:** serializar como texto separado por saltos de línea o comas, no como JSON. Ej: `"El costo real de producción, Cómo valuar el tiempo, Costos fijos vs. variables"`.

---

## 3. Output esperado

**Tipo de output:** texto plano — el prompt listo para enviar a Gemini Imagen.

El output **no** tiene JSON, no tiene prefacio, no tiene explicación. La primera palabra de la respuesta es el inicio del prompt de imagen.

### Ejemplo real de output

Para un capítulo sobre cálculo de costos en un ebook de artesanía, estilo minimalist, paleta azul marino + crema + verde lima:

```
A minimalist flat-lay composition of a small handmade candle workshop: a clean notebook with handwritten cost calculations, a few artisan candles in neutral tones, scattered dried botanicals, and a simple calculator. Soft natural window light. Color palette anchored in deep navy blue and warm cream with a subtle lime green accent on a detail. No people. No text overlays. High-end product photography aesthetic, slightly desaturated, calm and focused mood.
```

Para un capítulo de apertura (capítulo 1) sobre el problema de cobrar barato:

```
A wide-angle minimalist scene of a small artisan market stall at dusk, empty of customers, a handmade candle sitting unsold on the table. Melancholy but hopeful mood — golden hour light breaking through. Deep navy and cream tones with a faint lime green reflection. No faces. No text. Conceptual editorial photography style, sharp focus on the candle, soft bokeh background.
```

### Reglas del output

- Siempre en **inglés** — Gemini Imagen responde mejor a prompts en inglés independientemente del `content_locale` del proyecto
- Entre **60 y 120 palabras** — suficientemente descriptivo para Gemini, sin exceder el contexto útil
- Incluir siempre: **composición**, **paleta de color**, **iluminación**, **mood**, **estilo**, **"No text overlays"**
- Nunca incluir: texto superpuesto de títulos o copy (los layouts lo manejan por separado), logos, marcas, caras reconocibles
- Personas: permitidas de forma **abstracta o sin rostro** si el estilo lo pide; preferir objetos, escenas, conceptos visuales

### Schema de error

Si el input es insuficiente para generar un prompt útil, devolver **solo** el texto:

```
Abstract composition in {palette_description} tones. {image_style} style. Clean, professional, no text.
```

Este fallback es intencional — siempre se devuelve algo utilizable para Gemini, nunca un error en blanco.

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.8` | Los prompts de imagen necesitan variedad y especificidad creativa entre capítulos. Alta temperatura evita que todos los capítulos generen la misma composición. |
| **max_tokens** | `200` | Un buen prompt de Gemini rara vez supera las 120 palabras. 200 tokens es el límite con margen. |
| **Modelo** | `claude-haiku-4-5` | La tarea es creativa pero simple — no requiere razonamiento complejo. Haiku es más eficiente en costo para generación en volumen (una llamada por imagen × N capítulos). |

**Nota de costo:** este prompt se ejecuta en volumen — para un ebook de 12 capítulos + 5 bonuses + 2 bumps (4 caps c/u) son hasta **25 llamadas por paquete**. Haiku reduce el costo de esta operación significativamente frente a Sonnet.

---

## 5. System prompt

*`{image_style}` y `{palette_description}` se interpolan antes de enviar.*

```
You are a visual prompt engineer for Gemini Imagen. Your job is to write optimized image generation prompts that translate infoproduct chapter content into compelling visual compositions.

OUTPUT RULES (non-negotiable):
1. Respond with the image prompt ONLY. No explanation, no preamble, no JSON.
2. Always write in English regardless of input language — Gemini performs best with English prompts.
3. Length: 60 to 120 words. Concise but specific.
4. Always include: visual composition, lighting, mood, color palette reference, style descriptor, and "No text overlays."
5. Never include: overlaid titles, copy, logos, recognizable brand elements, or explicit faces.
6. People: allowed as abstract figures, silhouettes, or hands — never identifiable faces.
7. The image must feel contextually connected to the chapter's theme — not generic stock photography.

STYLE GUIDE — apply the user's chosen style consistently:
- minimalist: clean surfaces, negative space, few elements, soft light, neutral base tones
- illustrated: hand-drawn or vector aesthetic, flat shapes, bold outlines, graphic feel
- photography: realistic scene, natural or studio light, textured surfaces, editorial quality
- flat: 2D graphic composition, solid color areas, geometric shapes, no shadows
- editorial: magazine-quality, intentional composition, strong mood, typographic awareness (no actual text)

COLOR PALETTE: anchor the image in {palette_description}. The palette should be felt — not every element needs to be those exact colors, but the dominant visual mood must reflect them.

CHAPTER POSITION RULES:
- Chapter 1: the image should reflect tension, a problem unsolved, or a moment before the transformation. Mood: questioning, honest, slightly melancholic but not hopeless.
- Middle chapters: visual clarity, forward movement, concrete action or tools. Mood: focused, methodical, purposeful.
- Last chapter: resolution, capability, light. Mood: calm confidence, arrival, new horizon.
```

---

## 6. User prompt template

```
Artifact type: {artifact_type}
Artifact title: {artifact_title}
Chapter {chapter_number} of {chapter_count}

Chapter title: {chapter_title}
Chapter description: {chapter_description}
Key concepts: {key_concepts}

Image style: {image_style}
Color palette: {palette_description}
Content locale: {content_locale}

Generate the Gemini image prompt for this chapter's visual.
```

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Capítulo 1, ebook principal, estilo photography (`es`)

**Variables de input:**
```
artifact_type: "main"
artifact_title: "Velas que se venden: sistema de precios, marca y clientes"
chapter_number: 1
chapter_count: 6
chapter_title: "Por qué trabajar más no alcanza si el precio está mal"
chapter_description: "Valida el esfuerzo y muestra el mecanismo del precio bajo como trampa estructural."
key_concepts: "El ciclo de trabajar más para ganar igual, La diferencia entre precio de venta y precio rentable, Por qué vender más volumen no resuelve el problema"
image_style: "photography"
palette_description: "deep navy blue, warm cream, and lime green accent"
content_locale: "es"
```

**Output esperado:**
```
A close-up editorial photograph of a pair of tired hands wrapping a handmade candle in kraft paper at a cluttered wooden workbench. Late afternoon light, long shadows. A small pile of coins barely visible in the background, slightly out of focus. Color mood: deep navy shadows, warm cream surfaces, faint lime green on a sticker label. Quiet exhaustion. No faces. No text overlays. Shallow depth of field, natural light, 35mm editorial aesthetic.
```

---

### Ejemplo 2 — Capítulo intermedio, bonus, estilo minimalist (`pt-BR`)

**Variables de input:**
```
artifact_type: "bonus"
artifact_title: "Calculadora de costos para artesanas"
chapter_number: 1
chapter_count: 1
chapter_title: "Tu costo real en una planilla: completá los 6 campos"
chapter_description: "Una planilla de una página para calcular el costo real de cada vela."
key_concepts: "Los 6 campos obligatorios, Cómo cargar el tiempo, El precio mínimo"
image_style: "minimalist"
palette_description: "deep navy blue, warm cream, and lime green accent"
content_locale: "pt-BR"
```

**Output esperado:**
```
Minimalist flat-lay of a single open notebook on a cream surface, one row of six small objects beside it — a measuring spoon, a small clock icon, a candle wick, a coin, a flame, and a pencil — each representing a cost component. Soft diffused light from above. Deep navy grid lines on the notebook page, lime green pencil. No text. Calm, organized, purposeful mood. Clean white negative space.
```

---

### Ejemplo 3 — Último capítulo, order bump, estilo illustrated

**Variables de input:**
```
artifact_type: "order_bump"
artifact_title: "El negocio del jabón artesanal"
chapter_number: 4
chapter_count: 4
chapter_title: "Tu negocio en los próximos 30 días"
chapter_description: "Consolida el método y da pasos concretos para los primeros 30 días."
key_concepts: "Plan de 30 días, Las 3 métricas clave, Cómo escalar sin perder calidad"
image_style: "illustrated"
palette_description: "terracotta orange, off-white, and deep forest green"
content_locale: "es"
```

**Output esperado:**
```
A hand-drawn illustrated scene of a small artisan soap workshop viewed from above — a tidy shelf of finished soaps, a simple calendar with 30 days marked, a small plant growing on the windowsill. Flat illustration style, bold outlines, no gradients. Terracotta orange and off-white dominate, forest green accents on the calendar marks and plant. Warm, accomplished, forward-looking mood. No text. Clean graphic aesthetic.
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| `chapter_title` vacío | Título no generado aún | Usar `artifact_title` + `chapter_number` como contexto mínimo; generar igual |
| `key_concepts` vacío | Índice sin key_concepts | Generar basado en `chapter_title` + `chapter_description` únicamente |
| `image_style` desconocido | Valor fuera del enum documentado | Tratar como `photography` — es el más neutro y universal |
| `palette_description` vacío | Paleta no definida aún | Omitir referencia de paleta; generar con paleta neutra editorial |
| Capítulo único (bonus, 1 de 1) | `chapter_count = 1` | Aplicar reglas de "capítulo único" — mood de herramienta, no de apertura ni cierre |
| Contenido potencialmente sensible | Tema de salud mental, finanzas en crisis, etc. | Mantener visual abstracto y esperanzador — nunca representar sufrimiento explícito |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Nuevo sistema de prompts de imágenes |

### Decisiones tomadas

- **Output en inglés siempre:** Gemini Imagen genera mejor calidad con prompts en inglés. El `content_locale` del proyecto no afecta el idioma del prompt de imagen — solo puede influir en referencias culturales que Claude considere al diseñar la composición.
- **Modelo Haiku en lugar de Sonnet:** La tarea es creativa pero no requiere razonamiento complejo. Con hasta 25 llamadas por paquete, Haiku reduce el costo total de la operación de imágenes significativamente.
- **Texto plano sin JSON:** El output va directo a Gemini sin procesamiento intermedio. Un JSON añadiría un paso de parseo innecesario. Los errores se manejan con un fallback de prompt genérico, no con schema de error.
- **Fallback de prompt genérico:** En lugar de fallar silenciosamente o devolver un error, siempre se retorna un prompt usable. Una imagen genérica es mejor que un slot vacío en el preview.
- **"No text overlays" siempre incluido:** Evita que Gemini renderice texto en la imagen que luego colisiona con los títulos de los layouts del ebook.
- **Personas sin rostro:** Evita el uncanny valley y posibles problemas de identidad/privacidad. Manos, siluetas y figuras abstractas son aceptadas.
- **Posición del capítulo en el contexto:** Capítulo 1 = tensión/problema, capítulos medios = acción/método, último = resolución/logro. Esto da coherencia visual al arco del ebook.

### Decisiones descartadas

- **Pasar el HTML completo del capítulo:** Demasiado largo y con ruido de markup. El título + descripción + key_concepts del índice captura la esencia sin tokens innecesarios.
- **Un prompt que genere todos los prompts del paquete a la vez:** Produciría prompts homogéneos entre capítulos. Llamadas separadas con temperatura 0.8 generan más variedad visual.
- **Negative prompt como campo separado:** Gemini Imagen 3 maneja mejor las restricciones dentro del prompt positivo ("No text", "No faces") que en un campo negativo separado.

### Próximos experimentos

- [ ] Evaluar si incluir 1-2 palabras del `content_locale` en el contexto cultural mejora la pertinencia visual para mercados específicos (ej: referencias visuales LATAM vs. US)
- [ ] Testear temperatura 0.7 vs 0.9 para evaluar balance entre coherencia de estilo y variedad entre capítulos
- [ ] Evaluar si pasar el `narrative_arc` del ebook mejora la coherencia visual entre todos los capítulos (costo: ~100 tokens extra por llamada)
- [ ] Explorar si un `negative_prompt` explícito para Gemini mejora la consistencia de estilo entre imágenes del mismo paquete

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
