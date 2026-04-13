# generate-bonus-chapter — Genera el contenido HTML del bonus como deliverable compacto

**Ruta:** `prompts/content/generate-bonus-chapter.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateBonusChapterPrompt()`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md` — §Bonuses  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Genera el cuerpo HTML del único capítulo de un bonus. El bonus es un **deliverable compacto** (~900 palabras, 10–12 páginas) — checklist, planilla, script, plantilla, guía rápida — que extiende un aspecto concreto del método del ebook principal sin repetirlo. Se llama una vez por bonus, después de que el usuario aprueba el índice del bonus (output de `generate-bonus-section-index`). El output es HTML limpio listo para almacenar en `chapters.content` y renderizar en Tiptap.

**Diferencia clave respecto a `generate-chapter`:** el bonus no tiene arco narrativo ni capítulos anteriores — es un documento de herramienta autocontenido. El formato HTML debe reflejar el tipo de deliverable (checklist → `<ul>`, pasos → `<ol>`, script → `<blockquote>`, template → campos con `<code>`).

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` de `optimize-topic` |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar` |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem` |
| `{main_ebook_title}` | `string` | ✅ | Título del ebook principal — ancla de coherencia de paquete |
| `{bonus_product_title}` | `string` | ✅ | Nombre del bonus (`ebooks.title`) — el producto que el lector recibe |
| `{tone}` | `"professional" \| "friendly" \| "inspirational" \| "direct" \| "educational"` | ✅ | Tono del paquete (`design_config.contentTone`) |
| `{bonus_index}` | `string` (JSON serializado) | ✅ | Output de `generate-bonus-section-index`: `{chapters:[{number,title,description,key_concepts,word_count_target}]}` |
| `{author}` | `string \| null` | ❌ | Nombre del autor o marca; omitir del prompt si es null |

**Conectividad de pipeline:**

- Se llama **después** de que el usuario aprueba el índice del bonus (`ebooks.index_json` ya tiene datos)
- El output se almacena en `chapters.content` del único capítulo del ebook bonus
- No hay `previous_chapters` — el bonus siempre tiene exactamente 1 capítulo
- El `{bonus_index}` es el output de `generate-bonus-section-index`, no el índice del ebook principal
- Si `{avatar}` o `{problem}` contienen `"error"`, no llamar a este prompt

---

## 3. Output esperado

### Formato y tipo

**Tipo de output:** JSON con campo `content` que contiene HTML

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.
```

### Schema con ejemplo real

```json
{
  "chapter_number": 1,
  "content": "<p>Esta planilla tiene un solo objetivo: que sepas exactamente cuánto te cuesta hacer cada vela antes de ponerle precio. Completá los seis campos en orden y el número final es tu costo real por unidad.</p><p><strong>Cómo usarla:</strong> descargá o imprimí esta hoja, completá los campos con los datos de tu taller, y usá el resultado como piso de precio en el capítulo 2 del ebook.</p><h2>Los seis campos</h2><ol><li><strong>Materiales directos</strong> — todo lo que forma parte física de la vela: cera, pabilo, fragancia, colorante, envase, etiqueta. Precio por unidad producida.</li><li><strong>Materiales indirectos</strong> — lo que se usa en el proceso pero no queda en la vela: papel de horno, guantes, repuestos. Dividir el gasto mensual por unidades producidas.</li><li><strong>Tiempo de producción</strong> — minutos totales por vela (preparación + colado + enfriamiento + packaging) × tu valor hora mínimo.</li><li><strong>Costos fijos prorrateados</strong> — alquiler, electricidad, suscripciones divididos por unidades del mes.</li><li><strong>Fondo de imprevistos</strong> — 5 % del subtotal de los cuatro campos anteriores. Cubre mermas, roturas y variaciones de precio de insumos.</li><li><strong>Costo total por unidad</strong> — suma de los cinco campos. Este es tu piso. Ningún precio puede estar por debajo de este número.</li></ol><h2>Tabla de referencia rápida</h2><p>Completá con tus datos:</p><ul><li>Materiales directos: <code>[$ por unidad]</code></li><li>Materiales indirectos: <code>[$ por unidad]</code></li><li>Tiempo de producción: <code>[minutos] × [$ tu valor hora / 60]</code></li><li>Costos fijos prorrateados: <code>[$ total fijos / unidades del mes]</code></li><li>Fondo de imprevistos (5 %): <code>[subtotal × 0.05]</code></li><li><strong>Costo total por unidad: <code>[suma]</code></strong></li></ul><h2>Señales de alerta</h2><p>Si tu costo total supera el 60 % del precio al que vendés actualmente, estás operando con margen insuficiente. Revisá primero los materiales directos — suelen tener el mayor margen de optimización sin sacrificar calidad.</p><p>Actualizá esta planilla cada vez que cambien los precios de tus insumos o cuando modifiques tu proceso de producción. Los costos no son estáticos.</p>"
}
```

**Restricciones del HTML:**

- Solo elementos permitidos por el sanitizer: `<p>`, `<br>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<ul>`, `<ol>`, `<li>`, `<h2>`, `<h3>`, `<blockquote>`, `<a>`, `<code>`
- Sin `<h1>` — el título del bonus se renderiza por separado en la UI
- Sin atributos `style` — solo `href`, `target`, `rel`, `class` donde apliquen
- HTML bien formado: todos los tags deben cerrarse correctamente
- Usar `<code>` para campos editables en plantillas (ej: `<code>[insertar nombre]</code>`)
- Usar `<blockquote>` para scripts de conversación o ejemplos de texto listo para usar

**Formato según tipo de deliverable:**

| Tipo de bonus | Formato HTML recomendado |
|---------------|--------------------------|
| Checklist | `<ol>` o `<ul>` con `<li><strong>Acción</strong> — descripción</li>` |
| Planilla / template | `<ol>` de campos + `<ul>` de tabla con `<code>[campo]</code>` |
| Script | `<h3>` para situación, `<blockquote>` para el texto del script, `<p>` para notas |
| Guía rápida paso a paso | `<ol>` numerado para los pasos, `<h2>` para secciones, `<p>` para explicación |
| Calendario / planificador | `<ol>` o `<ul>` con estructura de períodos bajo `<h2>` o `<h3>` |

**Restricciones de extensión:**

- Alcanzar el `word_count_target` del `bonus_index` (siempre 900)
- No exceder por más del 20%
- No quedarse por debajo del objetivo en más del 10% — el deliverable debe ser sustancioso

### Schema de error

```json
{
  "error": "INVALID_INPUT",
  "message": "Razón breve en {content_locale}"
}
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.6` | El bonus es más estructurado que un capítulo narrativo — necesita precisión operativa. Más baja que `generate-chapter` (0.7) pero con variedad suficiente para que el formato se adapte al tipo de deliverable. |
| **max_tokens** | `1500` | ~900 palabras de contenido operativo en HTML ronda los 1.200–1.400 tokens con markup. |
| **Modelo** | `claude-sonnet-4-6` | Requiere inferir el tipo de deliverable del título y adaptar el formato HTML en consecuencia. |

---

## 5. System prompt

*`{content_locale}`, `{tone}`, y `{chapter_count_is_one}` se interpolan en `_shared/prompts.ts`.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: generate the full HTML body of a bonus deliverable — a compact, practical tool (checklist, template, script, planner, or quick guide) that extends one specific aspect of the main ebook's method. This is NOT a chapter of the ebook; it is a standalone, immediately usable artifact.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language.

TONE GUIDE — apply consistently:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype.
- direct: concise, no filler. Instructions and fields only — no padding.
- educational: didactic and stepwise. Defines terms; patient pacing.

HTML OUTPUT RULES:
1. Allowed tags only: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <ul>, <ol>, <li>, <h2>, <h3>, <blockquote>, <a>, <code>
2. Do NOT include <h1> — the bonus title is rendered by the UI separately
3. Do NOT add style attributes — only href, target, rel, class where semantically needed
4. All opened tags must be properly closed. Well-formed HTML only.
5. Use <code> for fillable fields in templates: <code>[field name]</code>
6. Use <blockquote> for ready-to-use script text or highlighted examples
7. Infer the deliverable format from the bonus_product_title and key_concepts:
   - Checklist / list of actions → <ol> or <ul> with action items
   - Template / planner / worksheet → structured fields with <code>[field]</code>
   - Script / swipe copy → <blockquote> blocks with context headings <h3>
   - Step-by-step guide → <ol> for steps, <h2> for sections
   Start the content with a brief orientation paragraph (1–2 sentences) explaining how to use the deliverable, then deliver the tool itself.

CONTENT RULES (non-negotiable):
1. Cover every key_concept listed in the bonus index entry. Each must appear with substance.
2. The deliverable must be immediately usable by the avatar — not a summary of the ebook, not theory. The reader should be able to apply it without re-reading the ebook.
3. Do NOT repeat or summarize content already in the main ebook. Extend or apply one specific piece of the method.
4. Do NOT mention order bumps or any other product in the package. This deliverable is self-contained.
5. Do NOT invent: no invented quotes, no specific statistics with numbers, no fabricated study citations.
6. Do NOT include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, or any other channel.
7. Word count: reach at least the word_count_target. Do not fall short. If you have covered all key concepts and are below target, add a practical example, an edge case, or a "common mistakes" section.
8. The deliverable ends naturally — no "next steps" that reference external resources or other products.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in {content_locale}>"}
```

---

## 6. User prompt template

```
Topic: {topic}
Main ebook title: {main_ebook_title}
Bonus product title: {bonus_product_title}
Author: {author}
Tone: {tone}
Content locale: {content_locale}

Ideal customer (avatar):
{avatar}

Problem resolved:
{problem}

Bonus index (section title + key concepts to cover):
{bonus_index}

Generate the full HTML body of this bonus deliverable.
Infer the format (checklist, template, script, guide) from the bonus_product_title and key_concepts.
Do not include the bonus title as <h1>. Start with a brief orientation paragraph, then deliver the tool.
```

**Nota de implementación:** `{author}` se omite de la línea si es `null`. `{bonus_index}` se serializa como `JSON.stringify(bonusIndexOutput)` desde `ebooks.index_json`.

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Planilla / worksheet (`es`, tone: friendly)

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de velas en un negocio rentable"
main_ebook_title: "Velas que se venden: sistema de precios, marca y clientes"
bonus_product_title: "Calculadora de costos para artesanas"
tone: "friendly"
bonus_index: {"chapters":[{"number":1,"title":"Tu costo real en una planilla: completá los 6 campos y conocé tu precio mínimo","description":"Una planilla de una página para calcular el costo real de cada vela.","key_concepts":["Los 6 campos que no pueden faltar","Cómo cargar tu tiempo sin subestimarlo","El número que resulta: tu precio mínimo"],"word_count_target":900}]}
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 1,
  "content": "<p>Esta planilla tiene un solo objetivo: que sepas exactamente cuánto te cuesta hacer cada vela antes de ponerle precio. Completá los seis campos en orden — el número final es tu costo real por unidad.</p><h2>Los seis campos</h2><ol><li><strong>Materiales directos</strong> — cera, pabilo, fragancia, colorante, envase, etiqueta. Precio por unidad.</li>...</ol><h2>Tu planilla</h2><ul><li>Materiales directos: <code>[$ por unidad]</code></li>...</ul>"
}
```

**Por qué es el caso típico:** Bonus de tipo planilla. El modelo usa `<ol>` para explicar los campos y `<code>` para los espacios editables. Empieza con orientación (cómo usar), luego entrega la herramienta.

---

### Ejemplo 2 — Script de ventas (`es`, tone: direct)

**Variables de input:**
```
content_locale: "es"
topic: "Freelance pricing: cómo cobrar lo que vale tu trabajo"
main_ebook_title: "Charge What You're Worth"
bonus_product_title: "12 respuestas para el 'está caro'"
tone: "direct"
bonus_index: {"chapters":[{"number":1,"title":"Las 12 objeciones de precio más comunes y cómo responder sin ceder","description":"Scripts listos para las objeciones más frecuentes.","key_concepts":["Las 4 categorías de objeción","La estructura: reconocer, reencuadrar, cerrar","Cuándo negociar y cuándo no"],"word_count_target":900}]}
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 1,
  "content": "<p>Cada script sigue la misma estructura: reconocer la objeción, reencuadrar el valor, cerrar sin descuento. Leelos una vez, practicá en voz alta, usá los que más se adapten a tu voz.</p><h2>Categoría 1: precio alto directo</h2><h3>Situación: el cliente dice 'es demasiado caro para mí'</h3><blockquote>«Entiendo. ¿Puedo preguntarte con qué lo estás comparando? Dependiendo de la respuesta, puedo ayudarte a ver si tiene sentido para tu situación específica.»</blockquote><p><strong>Por qué funciona:</strong> no defiende el precio, abre un diálogo. El cliente generalmente está comparando con una alternativa inferior o con su presupuesto ideal, no con el valor real.</p>..."
}
```

**Por qué es útil:** Verifica que para bonus de scripts el modelo usa `<blockquote>` para el texto listo para usar y `<h3>` para contextualizar cada situación. El tono `direct` elimina el relleno.

---

### Ejemplo 3 — Guía rápida paso a paso (`pt-BR`, tone: educational)

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs que querem vender online"
main_ebook_title: "Clientes novos todo mês"
bonus_product_title: "Calendário de conteúdo para 30 dias"
tone: "educational"
bonus_index: {"chapters":[{"number":1,"title":"30 dias de posts prontos: preencha os dados da sua marca e publique","description":"Calendário com 30 ideias de conteúdo para qualquer produto artesanal.","key_concepts":["Como adaptar cada ideia ao seu produto","Os 3 tipos de post que mais geram engajamento","Como manter consistência sem precisar de inspiração diária"],"word_count_target":900}]}
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 1,
  "content": "<p>Use este calendário como ponto de partida — não como receita rígida. Cada ideia tem um formato e um objetivo; adapte o texto para o seu produto, seu tom e o que você vende.</p><h2>Os 3 tipos de post que sustentam o calendário</h2><p>Antes de começar, é importante entender a lógica por trás do calendário...</p><h2>Semana 1 — Apresentação e conexão</h2><ol><li><strong>Dia 1 — Quem sou eu:</strong> <code>[Conta brevemente sua história com o produto artesanal]</code>. Objetivo: criar conexão pessoal.</li>..."
}
```

**Por qué es útil:** Verifica pt-BR genuino, tono educativo (explica la lógica antes de la herramienta), y uso de `<code>` para campos editables en un calendario.

---

### Ejemplo 4 — Error: bonus_index con error

**Variables de input:**
```
content_locale: "es"
bonus_index: "{\"error\": \"INVALID_INPUT\", \"reason\": \"...\"}"
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "message": "El índice del bonus contiene un error. Generá el índice del bonus antes de generar su contenido."
}
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| `bonus_index` con error | Output de `generate-bonus-section-index` sin resolver | `{"error": "INVALID_INPUT", "message": "..."}` |
| `bonus_product_title` vacío | Sin nombre asignado al bonus en el wizard | `{"error": "INVALID_INPUT", "message": "..."}` |
| `avatar` o `problem` con `"error"` | Pipeline anterior sin resolver | `{"error": "INVALID_INPUT", "message": "..."}` |
| Tipo de bonus ambiguo | Título que no sugiere claramente el formato (ej: "Guía de éxito") | El modelo usa `<h2>` + `<ol>` por defecto — formato de guía paso a paso |
| Bonus que repite el ebook | key_concepts idénticos a capítulos del ebook | El system prompt lo bloquea; el modelo debe aplicar o sintetizar, no resumir |
| Input en idioma incorrecto | Prompt en inglés con `content_locale: "es"` | Responder en `es`; ignorar idioma del input |
| `word_count_target` bajo | Si por algún bug llega un valor < 500 | Generar hasta cubrir los key_concepts con sustancia real; priorizar calidad sobre conteo |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Nuevo prompt para contenido de bonuses |

### Decisiones tomadas

- **Sin `previous_chapters`:** Los bonuses tienen exactamente 1 capítulo — no hay contexto previo que pasar. La coherencia con el ebook la da `main_ebook_title` + avatar + problem.
- **Sin `main_ebook_index`:** El índice completo del ebook principal (con narrative_arc y key_concepts por capítulo) no se pasa para reducir tokens. `main_ebook_title` + topic es suficiente para que el modelo complemente sin repetir. Si en producción se detectan superposiciones frecuentes, evaluar agregar `narrative_arc` del ebook como variable adicional.
- **Temperatura 0.6 vs 0.7 del ebook:** El bonus es más operativo que narrativo. Menos temperatura = más precisión en estructuras de herramienta (pasos numerados, campos de planilla).
- **Inferencia del formato HTML desde el título:** En lugar de pedir al caller que clasifique el tipo de deliverable, el modelo infiere el formato (checklist/template/script/guide) desde `bonus_product_title` y `key_concepts`. Esto simplifica el API y funciona bien para títulos descriptivos.
- **`<code>` para campos editables:** Semánticamente incorrecto pero visualmente útil en Tiptap — los campos editables en plantillas necesitan distinción visual. Es el mejor tag disponible dentro del set permitido por el sanitizer.

### Decisiones descartadas

- **Pasar el índice completo del ebook principal:** Agrega ~2000 tokens por llamada. `main_ebook_title` cumple la función de ancla sin ese costo.
- **Campo `deliverable_type` como input explícito:** Clasificar el tipo de bonus en el caller agrega complejidad sin beneficio claro — el modelo infiere bien del título si es descriptivo.

### Próximos experimentos

- [ ] Evaluar si agregar `narrative_arc` del ebook principal mejora la coherencia entre bonus y ebook en nichos donde el método es muy específico
- [ ] Testear temperatura 0.5 para bonuses de tipo planilla/checklist vs 0.7 para scripts (temperatura variable por tipo)
- [ ] Evaluar si el modo `direct` produce mejores herramientas operativas que `friendly` para el mismo bonus — posible recomendación de tono por tipo de deliverable

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
