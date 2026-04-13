# generate-bump-chapter — Genera el contenido HTML de un capítulo del order bump

**Ruta:** `prompts/content/generate-bump-chapter.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateBumpChapterPrompt()`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md` — §Order bumps  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Genera el cuerpo HTML de un capítulo del order bump. El order bump es un **mini-ebook independiente de 4 capítulos** sobre un tema adyacente al del ebook principal, dirigido a la misma audiencia. Es un producto que el creador podría vender por separado — no es un complemento ni una extensión del ebook principal. Se llama una vez por capítulo en orden (1 → 2 → 3 → 4), igual que el flujo del ebook principal, después de que el usuario aprueba el índice del bump (generado por `generateIndexPrompt` con `chapter_count = 4`).

**Diferencias clave respecto a `generate-chapter` (ebook principal):**
- `chapter_count` es siempre **4**
- El bump es un **producto standalone** — nunca menciona el ebook principal, los bonuses, ni ningún otro producto del paquete
- El tema es **adyacente** al del ebook principal, no idéntico — el modelo no debe asumir que el lector leyó el ebook
- La audiencia y el problema son los mismos, pero el ángulo y el contenido son distintos

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` de `optimize-topic` — contexto del paquete, NO el tema del bump |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar` — misma audiencia del paquete |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem` — mismo problema base del paquete |
| `{bump_product_title}` | `string` | ✅ | `ebooks.title` del order bump — título del mini-ebook a generar |
| `{tone}` | `"professional" \| "friendly" \| "inspirational" \| "direct" \| "educational"` | ✅ | Tono del paquete (`design_config.contentTone`) |
| `{index}` | `string` (JSON serializado) | ✅ | Output de `generateIndexPrompt` con `chapter_count=4`: `{narrative_arc, chapters[4]}` |
| `{chapter_number}` | `number` (1–4) | ✅ | Número del capítulo a generar |
| `{previous_chapters}` | `string` (JSON serializado) | ✅ | Array `[{number, title, content}]` de capítulos ya generados del bump. `[]` para el capítulo 1 |
| `{author}` | `string \| null` | ❌ | Nombre del autor o marca; omitir del prompt si es null |

**Conectividad de pipeline:**

- Se llama **después** de los capítulos del ebook principal y de los bonuses, en el orden `main → bonuses → bumps`
- El índice del bump (`ebooks.index_json`) es generado por `generateIndexPrompt` con `chapter_count=4`, no por `generateBonusSectionIndexPrompt`
- `previous_chapters` contiene los capítulos del bump ya generados (no los del ebook principal)
- El output se almacena en `chapters.content` del capítulo correspondiente del ebook bump
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
  "chapter_number": 2,
  "content": "<p>Antes de hablar de cómo vender tus jabones artesanales, hay una pregunta que muy pocas personas se hacen: ¿cuánto cuesta realmente hacerlos?</p><p>No el costo que calculás de memoria cuando alguien te pregunta. El costo real, el que incluye todo lo que ponés — materiales, tiempo, gastos fijos — y que determina si estás ganando o simplemente recuperando lo que gastaste.</p><h2>Por qué el costo del jabón artesanal es más complejo de lo que parece</h2><p>A diferencia de un producto manufacturado, el jabón artesanal tiene una estructura de costos mixta: hay materiales que se miden por gramo (aceites, lejía, fragancias), procesos que requieren tiempo de cura de 4 a 6 semanas, y costos fijos que no cambian con el volumen de producción.</p><p>Esto hace que muchas artesanas calculen bien los materiales directos pero ignoren casi todo lo demás.</p><h2>Los cuatro componentes que no pueden faltar</h2><ul><li><strong>Materiales directos:</strong> aceites base, lejía o álcali, agua, fragancias, colorantes naturales, aditivos (avena, miel, arcilla). Todo lo que termina en el jabón.</li><li><strong>Materiales de proceso:</strong> moldes, termómetro, papel film, etiquetas, packaging. Se amortizan por lote.</li><li><strong>Tiempo de producción:</strong> pesado + mezcla + volcado + limpieza + tiempo de cura (activo vs. pasivo). El tiempo activo tiene costo; el de cura, no.</li><li><strong>Costos fijos prorrateados:</strong> gas, electricidad, internet (si vendés online), espacio de trabajo. Divididos por tu producción mensual.</li></ul><h2>El tiempo de cura y su impacto en el flujo de caja</h2><p>El jabón artesanal tradicional requiere entre 4 y 6 semanas de cura antes de poder venderse. Esto significa que el dinero invertido en materiales no se recupera por más de un mes — una realidad que afecta directamente cuánto capital de trabajo necesitás para mantener el negocio.</p><p>Para calcular el impacto: multiplicá tu costo de producción mensual por el tiempo de cura en meses. Ese es el capital que necesitás tener inmovilizado para operar de forma continua.</p><p>En el próximo capítulo vamos a tomar este costo real y construir sobre él el precio de venta — con margen de ganancia incluido.</p>"
}
```

**Restricciones del HTML:** idénticas a `generate-chapter.md`

- Solo: `<p>`, `<br>`, `<strong>`, `<b>`, `<em>`, `<i>`, `<u>`, `<ul>`, `<ol>`, `<li>`, `<h2>`, `<h3>`, `<blockquote>`, `<a>`, `<code>`
- Sin `<h1>` — el título del capítulo lo renderiza la UI
- Sin atributos `style`
- HTML bien formado

**Restricciones de extensión:**

- Alcanzar el `word_count_target` del capítulo en el índice (guía orientativa)
- No exceder por más del 20%
- No quedarse por debajo — si se cubrieron los key_concepts y falta texto, profundizar con ejemplos o un walkthrough práctico

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
| **Temperatura** | `0.7` | Contenido narrativo de 4 capítulos — misma lógica que `generate-chapter`. La coherencia la dan el índice y las reglas del system. |
| **max_tokens** | `1800` | Capítulos del bump (~850–950 palabras) son ligeramente más cortos que el ebook principal. Margen holgado. |
| **Modelo** | `claude-sonnet-4-6` | Requiere coherencia narrativa entre 4 capítulos y dominio de un tema adyacente al principal. |

---

## 5. System prompt

*`{content_locale}`, `{chapter_number}`, y `{chapter_count_4}` se interpolan antes de enviar.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: generate the full HTML body of chapter {chapter_number} of 4 for an order bump — a standalone mini-ebook on an adjacent topic for the same audience. This is an independent product: the reader does NOT need to have read the main ebook to use it. Write it accordingly.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language.

TONE GUIDE — apply consistently to every paragraph, heading, and example:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

HTML OUTPUT RULES:
1. Use only: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <ul>, <ol>, <li>, <h2>, <h3>, <blockquote>, <a>, <code>
2. Do NOT include <h1> — the chapter title is rendered by the UI separately
3. Do NOT add style attributes to any element
4. All opened tags must be properly closed. Well-formed HTML only.
5. Start the content directly with the chapter body — no title repetition

CONTENT RULES (non-negotiable):
1. Cover every key_concept in the chapter's index entry. Each must be addressed with substance — not just mentioned.
2. Use practical, concrete examples relevant to the avatar and the bump's topic. The reader should be able to apply the content without any prior knowledge of the main ebook.
3. Do NOT repeat ground already covered in previous chapters of this bump. Build forward.
4. Do NOT mention the main ebook, bonuses, or any other product in the package. This mini-ebook is fully standalone.
5. Do NOT invent: no invented quotes attributed to named experts, no specific statistics with numbers, no fabricated studies. Practical domain knowledge and widely known frameworks only.
6. Chapter 1 specifically: open by validating the reader's pain or situation in the context of THIS bump's topic — not the main ebook's topic. Open a loop that the next 3 chapters will close.
7. Last chapter (4): consolidate the mini-ebook's transformation. Project forward with concrete next steps the reader can take independently. NEVER include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, Facebook groups, or any other channel.
8. Middle chapters (2 and 3): deliver ONE concrete, actionable piece of the transformation. Practical first, theoretical second.
9. Transitions: each chapter (except the last) should end with a natural bridge connecting to the next.
10. Word count: reach at least the chapter's word_count_target. Do not fall short. If you've covered all key concepts and are below target, go deeper on examples or add a practical walkthrough.
11. Verify the information you write. If you are not confident a claim is accurate, rephrase it as a practical framework rather than a stated fact.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in {content_locale}>"}
```

---

## 6. User prompt template

```
Bump product title: {bump_product_title}
Author: {author}
Tone: {tone}
Content locale: {content_locale}

Ideal customer (avatar) — same audience as the main package:
{avatar}

Problem context:
{problem}

Full bump index (narrative arc + 4 chapters):
{index}

Previously generated chapters of this bump:
{previous_chapters}

---

Generate chapter {chapter_number} of 4.

Chapter to generate (from index):
- Title: [extraído del índice]
- Description: [extraído del índice]
- Key concepts (must all be covered):
[extraído del índice]
- Word count target: [extraído del índice]

Write the full HTML body of this chapter. Do not include the chapter title as <h1>. Start directly with the chapter body.
```

**Nota de implementación:**
- `{topic}` del proyecto **no** se incluye en el user prompt — el bump es adyacente al tema principal, pasarlo como contexto explícito podría confundir al modelo. La audiencia y el problema son suficientes para anclar el contexto.
- Los campos `[extraído del índice]` se interpolan en código parseando `{index}` y extrayendo el capítulo `{chapter_number}`.
- `{author}` se omite si es null.
- `{previous_chapters}` es `[]` para el capítulo 1.

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Capítulo 1, bump adyacente (`es`, tone: friendly)

**Variables de input:**
```
content_locale: "es"
bump_product_title: "El negocio del jabón artesanal: precios, marca y primeros clientes"
tone: "friendly"
chapter_number: 1
avatar: {"description":"Artesana 25-45 años LATAM que fabrica productos en casa...","pains":["Cobra barato por miedo a perder clientes","Ventas inconsistentes","No sabe diferenciarse"],...}
problem: {"core_problem":"Trabaja a pérdida sin saberlo","transformation":{"from":"artesana que cobra barato","to":"emprendedora que cobra con confianza"},...}
index: {"narrative_arc":"De artesana que hace jabones sin saber si es negocio o hobby, a emprendedora con precios claros y primeros clientes que pagan bien.","chapters":[{"number":1,"title":"¿Negocio o hobby caro?: cómo saber si tus jabones pueden sostenerse solos","description":"Valida el dolor, muestra el mecanismo del precio bajo, abre el loop de los 4 capítulos.","key_concepts":["La diferencia entre hobby rentable y negocio sostenible","Por qué el jabón artesanal tiene costos ocultos que la vela no tiene","El criterio mínimo para saber si tiene sentido seguir"],"word_count_target":850},...]}
previous_chapters: []
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 1,
  "content": "<p>Si alguien te preguntara ahora mismo cuánto ganás por cada jabón que vendés, ¿sabrías responder?</p><p>No el precio al que lo vendés. La ganancia real — lo que queda después de materiales, tiempo, costos fijos, y el capital que estuvo inmovilizado durante las semanas de cura.</p><p>La mayoría de las artesanas que empiezan con jabones no saben ese número. Y mientras no lo saben, trabajan — a veces mucho — sin poder saber si están construyendo un negocio o simplemente financiando un hobby que disfrutan.</p><h2>La diferencia entre hobby rentable y negocio sostenible</h2>..."
}
```

**Por qué es el caso típico:** Capítulo 1 de bump. El modelo abre el loop del mini-ebook en el contexto del jabón — no del ebook de velas. No asume que el lector leyó el ebook principal.

---

### Ejemplo 2 — Último capítulo (`es`, tone: direct)

**Variables de input:**
```
content_locale: "es"
bump_product_title: "El negocio del jabón artesanal"
tone: "direct"
chapter_number: 4
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 4,
  "content": "<p>Llegaste al final con cuatro herramientas concretas: costo real calculado, precio de venta definido, diferencial claro, y un canal de venta activo. Eso es más de lo que la mayoría de artesanas tiene cuando empiezan a vender.</p><h2>Los próximos 30 días</h2><ol><li><strong>Semana 1:</strong> completá la planilla de costos con tus datos reales de este mes.</li><li><strong>Semana 2:</strong> ajustá tus precios según el nuevo costo calculado. Empezá con los productos nuevos si necesitás hacer la transición gradual.</li>...</ol>"
}
```

**Por qué es útil:** Verifica que el último capítulo consolida la transformación del mini-ebook, da pasos concretos, y no incluye CTAs externos ni referencias al ebook principal.

---

### Ejemplo 3 — Locale `pt-BR`, capítulo intermedio

**Variables de input:**
```
content_locale: "pt-BR"
bump_product_title: "Sabonetes artesanais: preços, marca e primeiros clientes"
tone: "educational"
chapter_number: 2
previous_chapters: [{"number":1,"title":"Hobby ou negócio?...","content":"<p>...</p>"}]
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 2,
  "content": "<p>Agora que você entende por que o preço baixo é uma armadilha estrutural, o próximo passo é calcular o custo real de cada sabonete — não o custo que você estima, mas o número exato que inclui tudo o que você coloca no processo.</p><h2>Por que o custo do sabonete artesanal é mais complexo do que parece</h2>..."
}
```

**Por qué es útil:** Verifica pt-BR auténtico, tono educativo en capítulo intermedio, y que el capítulo 2 arranca donde terminó el 1 sin repetirlo.

---

### Ejemplo 4 — Error: index con error

**Variables de input:**
```
content_locale: "es"
index: "{\"error\": \"INVALID_INPUT\", \"reason\": \"...\"}"
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "message": "El índice del order bump contiene un error. Generá el índice antes de generar el contenido."
}
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| `index` con error | `ebooks.index_json` sin resolver | `{"error": "INVALID_INPUT", "message": "..."}` |
| `chapter_number` fuera de rango | > 4 o < 1 | `{"error": "INVALID_INPUT", "message": "..."}` |
| `avatar` o `problem` con `"error"` | Pipeline anterior sin resolver | `{"error": "INVALID_INPUT", "message": "..."}` |
| `previous_chapters` vacío en cap > 1 | Capítulos anteriores no generados aún | Generar con el índice como único ancla de coherencia; no bloquear |
| Bump con tema muy cercano al ebook | Títulos similares, nicho idéntico | El system prompt exige standalone — el modelo debe enfocar en el ángulo adyacente sin asumir contexto del ebook |
| Input en idioma incorrecto | Prompt en inglés con `content_locale: "es"` | Responder en `es`; ignorar idioma del input |
| Último capítulo con CTA | Modelo intenta incluir "seguime en..." | Regla 7 del system lo bloquea |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Nuevo prompt para contenido de order bumps |

### Decisiones tomadas

- **`topic` excluido del user prompt:** El bump es un producto adyacente, no una extensión del tema principal. Pasar `topic` como variable explícita podría anclar al modelo al tema del ebook en lugar del tema del bump. La audiencia (`avatar` + `problem`) es suficiente contexto compartido.
- **`previous_chapters` del bump, no del ebook:** Solo se pasan los capítulos ya generados del bump, no los del ebook principal. El bump es independiente — el lector no lo necesita para usar el bump.
- **`chapter_count` siempre 4:** Hardcodeado en el system prompt y en `ai-generate-index`. No se parametriza.
- **Temperatura 0.7 igual que `generate-chapter`:** El bump tiene la misma naturaleza narrativa que el ebook principal — 4 capítulos con arco, no una herramienta compacta. La misma temperatura aplica.
- **`max_tokens` 1800 vs 2500 del ebook principal:** Los capítulos del bump tienen `word_count_target` ~850-950w (más cortos que los capítulos medios del ebook). 1800 tokens es suficiente con margen.

### Decisiones descartadas

- **Pasar `main_ebook_title` como input:** Descartado — podría hacer que el modelo mencione o compare con el ebook principal. La independencia del bump es más importante que la coherencia de paquete a nivel de contenido.
- **`chapter_count` como variable:** Siempre es 4 para order bumps. Parametrizarlo no agrega valor en v1.0.
- **Reutilizar `generateChapterPrompt` con un flag `isOrderBump`:** La diferencia de contexto (standalone, sin `topic`, sin referencia al ebook) justifica una función separada. Un flag en la función compartida haría el código más frágil.

### Próximos experimentos

- [ ] Evaluar si agregar el `narrative_arc` del ebook principal como contexto de "lo que NO cubrir" mejora la diferenciación del bump
- [ ] Testear si pasar solo `avatar.pains` y `avatar.desires` (en lugar del JSON completo del avatar) reduce tokens sin perder calidad contextual
- [ ] Evaluar temperatura 0.65 para capítulos 1 y 4 (apertura/cierre más estructurados) vs 0.7 para capítulos 2 y 3 (desarrollo más libre)

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
