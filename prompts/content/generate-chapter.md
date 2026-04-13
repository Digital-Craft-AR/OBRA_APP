# generate-chapter — Genera el contenido HTML de un capítulo del ebook principal

**Ruta:** `prompts/content/generate-chapter.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateChapterPrompt()`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md`  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Genera el contenido HTML de un capítulo individual del ebook principal. Se llama una vez por capítulo, en orden secuencial, después de que el usuario aprueba el índice global (`generate-index`). Toma el índice completo (con su `narrative_arc`) y el contenido HTML de los capítulos ya generados para producir texto coherente, de alta calidad y conexión narrativa con lo anterior. El output es HTML limpio y semántico listo para almacenar en `chapters.content` y renderizar en el editor Tiptap.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro de todo el capítulo |
| `{topic}` | `string` | ✅ | `optimized_title` del output de `optimize-topic`; ancla temática del ebook |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar`, serializado como `JSON.stringify()` |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem`, serializado como `JSON.stringify()` |
| `{main_ebook_title}` | `string` | ✅ | Título del ebook principal, aprobado o editado por el usuario en el wizard |
| `{tone}` | `"professional" \| "friendly" \| "inspirational" \| "direct" \| "educational"` | ✅ | Preset de tono elegido en el wizard; persistido en `design_config.contentTone` |
| `{index}` | `string` (JSON serializado) | ✅ | Output completo de `generate-index` (incluye `narrative_arc` y todos los capítulos con `title`, `description`, `key_concepts`, `word_count_target`) |
| `{chapter_number}` | `number` (1 a `chapter_count`) | ✅ | Número del capítulo a generar |
| `{chapter_count}` | `6 \| 8 \| 10 \| 12` | ✅ | Total de capítulos del ebook — necesario para saber si es capítulo de cierre |
| `{previous_chapters}` | `string` (JSON serializado) | ✅ | Array de capítulos ya generados: `[{number, title, content}]` donde `content` es el HTML. Array vacío `[]` para el capítulo 1 |
| `{author}` | `string \| null` | ❌ | Nombre del autor o marca; si no es null se puede usar para personalizar voz en primera persona |

**Conectividad de pipeline:**

- Este prompt siempre se llama **después** de `generate-index` y solo cuando `global_index_frozen_at` está seteado — el índice no puede cambiar una vez iniciada la generación de capítulos.
- El output se almacena en `chapters.content` (campo de texto HTML sanitizado).
- Los capítulos se generan en orden: 1, 2, 3 … N. No llamar en paralelo, ya que cada llamada necesita el contenido de los anteriores.
- `{previous_chapters}` crece con cada capítulo aprobado. Para capítulos 6+, la implementación puede truncar el HTML de capítulos más antiguos a un resumen de 2-3 oraciones para controlar costos de tokens — el índice completo siempre está disponible como ancla de coherencia.
- Si `{avatar}` o `{problem}` contienen el campo `"error"`, **no llamar a este prompt** — resolver los pasos anteriores del pipeline primero.
- **El título del capítulo NO se incluye en el HTML output**: la UI lo renderiza por separado desde el campo `chapters.title`. El HTML comienza directamente con el cuerpo del capítulo.

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
  "content": "<p>Antes de calcular cualquier precio, necesitás saber con exactitud cuánto te cuesta hacer cada vela. No el material solo — <strong>el costo real</strong>.</p><p>La mayoría de las artesanas calcula el costo sumando la cera, el pabilo y la fragancia. Eso cubre menos del 60% del costo real. El resto es invisible hasta que ya es demasiado tarde.</p><h2>Los cuatro componentes del costo real</h2><p>Hay cuatro elementos que deben entrar en el cálculo de cada unidad producida:</p><ul><li><strong>Materiales directos:</strong> todo lo que forma parte física de la vela — cera, pabilo, fragancia, colorantes, envase y etiqueta.</li><li><strong>Materiales indirectos:</strong> lo que se usa en el proceso pero no termina en la vela — papel de horno, guantes, repuestos del termómetro.</li><li><strong>Tiempo de producción:</strong> incluye preparación, colado, enfriamiento activo y packaging. No solo el tiempo que estás «haciendo».</li><li><strong>Costos fijos prorrateados:</strong> alquiler del espacio, electricidad, suscripciones y herramientas divididos por la cantidad de velas que producís por mes.</li></ul><h2>Cómo valuar tu tiempo sin subestimarlo</h2><p>Este es el punto donde más dinero se pierde. El tiempo de trabajo es un costo aunque lo pongas vos misma.</p><p>Método simple: definí un valor hora mínimo aceptable (el que cobrarías si trabajaras para otra persona en tu rubro). Medí cuántos minutos lleva hacer una vela de principio a fin, con envase. Dividí y sumá ese número al costo.</p><blockquote>Si tardás 25 minutos por vela y tu valor hora mínimo es $1.800, cada vela tiene $750 de costo de mano de obra. Eso va al cálculo, sí o sí.</blockquote><h2>Costos fijos vs. variables: qué incluye cada categoría</h2><p>Los costos variables cambian con el volumen — si hacés más velas, gastás más materiales. Los costos fijos no cambian a corto plazo — el alquiler es el mismo si hacés 20 o 200 velas ese mes.</p><p>Para calcular el costo fijo por unidad: tomá el total mensual de costos fijos y dividilo por la cantidad de velas que producís en un mes normal. Ese número es el costo fijo por vela.</p><p>Revisalo cada tres meses. Si tu volumen cambia mucho, el número cambia.</p><h2>El error más común: el costo parcial da una falsa tranquilidad</h2><p>Cuando solo calculás materiales directos, el precio parece «rentable» porque cubre los insumos y deja margen. Pero ese margen en realidad está pagando tu tiempo y los fijos sin que lo veas.</p><p>El resultado: vendés, trabajás mucho, y a fin de mes el número no cierra. La solución no es vender más — es calcular bien desde el principio.</p><p>En el próximo capítulo vamos a tomar este costo real y construir sobre él el precio de venta completo, con margen de ganancia real incluido.</p>"
}
```

**Restricciones del HTML:**

- Solo elementos semánticos: `<p>`, `<h2>`, `<h3>`, `<ul>`, `<ol>`, `<li>`, `<strong>`, `<em>`, `<blockquote>`, `<a>`
- Sin atributos `style` ni `class` en ningún elemento
- Sin `<h1>` — el título del capítulo lo renderiza la UI por separado
- Sin `<br>` sueltos — usar párrafos separados
- Sin HTML entities innecesarias — usar caracteres directos (ñ, á, ç, etc.)
- HTML limpio y bien formado: todos los tags abiertos deben cerrarse

**Restricciones de extensión:**

- Respetar `word_count_target` del capítulo en el índice como objetivo orientativo
- No exceder el objetivo en más del 20%
- No quedarse por debajo del objetivo en más del 15%
- Contar palabras del texto visible (no del markup HTML)

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
| **Temperatura** | `0.7` | Contenido narrativo de largo aliento que debe ser original, fluido y variado — especialmente en tono y estructura interna. La coherencia temática la garantizan el índice y las reglas del system, no la temperatura baja. |
| **max_tokens** | `2500` | Un capítulo de ~1.100 palabras en HTML ronda los 1.800-2.000 tokens. El margen cubre capítulos más extensos o markup más rico. |
| **Modelo** | `claude-sonnet-4-6` | Requiere generación de largo aliento con coherencia narrativa, tono sostenido y ejemplos prácticos relevantes al nicho. |

---

## 5. System prompt

*`{content_locale}`, `{chapter_number}`, `{chapter_count}`, y `{tone}` se interpolan en `_shared/prompts.ts` antes de enviar al modelo.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: generate the full HTML body of chapter {chapter_number} of {chapter_count} for the main ebook. This content will be stored directly in the chapter editor and rendered to the reader — quality, accuracy, and coherence are non-negotiable.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language.

TONE GUIDE — apply consistently to every paragraph, heading, and example:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

HTML OUTPUT RULES:
1. Use only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>
2. Do NOT include <h1> — the chapter title is rendered by the UI separately
3. Do NOT add style or class attributes to any element
4. No <br> tags — use separate <p> elements for line breaks
5. No HTML entities for standard characters — write ñ, á, ç, etc. directly
6. All opened tags must be properly closed. Well-formed HTML only.
7. Start the content directly with the opening of the chapter body — no title repetition

CONTENT RULES (non-negotiable):
1. Cover every key_concept listed in the chapter's index entry. Each must be addressed with substance — not just mentioned.
2. Use practical, concrete examples rooted in the avatar's real context and the ebook's topic. Examples must feel real and applicable, not generic or hypothetical.
3. Do NOT repeat ground already covered in previous chapters. Build forward; each chapter advances the reader's knowledge.
4. Do NOT mention bonuses, order bumps, or any other product in the package. The ebook is self-contained.
5. Do NOT invent: no invented quotes attributed to named experts, no specific statistics with numbers (e.g. "el 73% de los negocios..."), no fabricated studies or research citations. Practical domain knowledge and widely known frameworks only.
6. Chapter 1 specifically: open by validating the reader's pain and frustration — make them feel understood before teaching anything. Open a loop that the rest of the ebook will close.
7. Last chapter ({chapter_count}): consolidate the transformation built through the ebook. Project forward with concrete next steps the reader can take independently. NEVER include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, Facebook groups, or any other channel.
8. Middle chapters: deliver ONE concrete, actionable piece of the transformation per chapter. Practical first, theoretical second.
9. Transitions: each chapter should end with a natural bridge that connects to what's coming — either a forward reference ("en el próximo capítulo...") or a closing idea that opens the next question. Exception: last chapter.
10. Word count: stay within ±20% of the chapter's word_count_target in the index.
11. Verify the information you write. If you are not confident that a claim is accurate, rephrase it as a practical framework or common pattern rather than stating it as fact.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in {content_locale}>"}
```

---

## 6. User prompt template

```
Topic: {topic}
Main ebook title: {main_ebook_title}
Author: {author}
Tone: {tone}
Content locale: {content_locale}

Ideal customer (avatar):
{avatar}

Problem resolved:
{problem}

Full ebook index (narrative arc + all chapters):
{index}

Previously generated chapters:
{previous_chapters}

---

Generate chapter {chapter_number} of {chapter_count}.

Chapter to generate (from index):
- Title: [extraído del índice]
- Description: [extraído del índice]
- Key concepts (must all be covered): [extraído del índice]
- Word count target: [extraído del índice]

Write the full HTML body of this chapter. Do not include the chapter title as <h1>. Start directly with the chapter body.
```

**Nota de implementación:** Los campos `[extraído del índice]` deben ser interpolados por el código antes de enviar — parsear `{index}` para extraer el objeto del capítulo `{chapter_number}` y sustituir directamente los valores en el user template. No enviar la instrucción `[extraído del índice]` al modelo.

**Manejo de `{author}`:** Si es `null`, omitir la línea `Author:` del user template. Si tiene valor, el modelo puede usar la voz del autor para dar ejemplos en primera persona si el tono lo permite (especialmente `friendly` o `inspirational`).

**Manejo de `{previous_chapters}`:** Si es un array vacío (capítulo 1), enviar `[]` literal. Para capítulos 6 o más, la implementación puede truncar el `content` de los capítulos más antiguos a un resumen de 2-3 oraciones (generado localmente o por una llamada separada) para mantener el contexto de ventana manejable. El índice completo siempre está disponible como ancla de coherencia estructural.

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Capítulo 1, input típico (`es`, tone: friendly)

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de velas en un negocio rentable"
main_ebook_title: "Velas que se venden"
author: "Paula Reyes"
tone: "friendly"
chapter_number: 1
chapter_count: 6
avatar: {"description":"Artesanas de 25 a 45 años en Argentina, México y Colombia...","pains":["Trabajan muchas horas y el dinero no alcanza","No saben si están ganando o perdiendo","Se sienten culpables de cobrar más"],...}
problem: {"core_problem":"Trabaja a pérdida sin saberlo","transformation":{"from":"artesana que cobra barato por miedo a perder clientes","to":"emprendedora que cobra con confianza porque entiende sus números"},...}
index: { /* output completo de generate-index con 6 capítulos */ }
previous_chapters: []
```

**Output esperado (fragmento representativo):**
```json
{
  "chapter_number": 1,
  "content": "<p>Si llegaste hasta acá es probable que hayas tenido este pensamiento al menos una vez: <em>«Hago todo bien, vendo bastante, pero a fin de mes no me queda nada»</em>.</p><p>No es un problema de esfuerzo. Trabajás, y mucho. El problema es que el sistema está roto desde el precio — y cuando el precio está mal, trabajar más solo hace que pierdas más.</p><h2>El esfuerzo sin sistema no escala</h2><p>El negocio artesanal tiene una trampa particular: cuanto más habilidosa sos, más tentada estás de producir más como solución a todo. ¿No llegás a fin de mes? Hacé más velas. ¿Un cliente se queja del precio? Bajalo para no perderlo. ¿La competencia aparece? Bajalo un poco más.</p><p>El resultado: más horas, mismos ingresos, más cansancio.</p>..."
}
```

**Por qué es el caso típico:** Capítulo de apertura en español con tono amigable. Verifica que el modelo valida el dolor del avatar antes de enseñar, abre el loop narrativo y no repite contenido de capítulos anteriores (porque no hay).

---

### Ejemplo 2 — Capítulo intermedio (`es`, tone: educational, capítulo 4 de 8)

**Variables de input:**
```
content_locale: "es"
topic: "Sistema de gestión financiera para emprendedores digitales"
main_ebook_title: "Finanzas claras: el método para ordenar tu negocio digital"
author: null
tone: "educational"
chapter_number: 4
chapter_count: 8
previous_chapters: [
  {"number": 1, "title": "El caos financiero tiene nombre: por qué no es culpa tuya", "content": "<p>...</p>"},
  {"number": 2, "title": "Separar las cuentas: la base que todo lo demás necesita", "content": "<p>...</p>"},
  {"number": 3, "title": "El flujo de caja: ver el dinero antes de que se vaya", "content": "<p>...</p>"}
]
```

**Output esperado:**
```json
{
  "chapter_number": 4,
  "content": "<p>En los capítulos anteriores establecimos la separación de cuentas y el flujo de caja básico. Ahora necesitamos el tercer componente del sistema: entender la rentabilidad real de cada servicio o producto que vendés.</p><h2>Ingresos no es lo mismo que ganancia</h2>..."
}
```

**Por qué es útil:** Verifica que el capítulo intermedio hace referencia a lo anterior sin repetirlo, entrega UN concepto concreto, y el tono educativo se mantiene (didáctico, paciente, define términos).

---

### Ejemplo 3 — Último capítulo (`pt-BR`, tone: inspirational)

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Método para criar e vender cursos online sem audiência prévia"
tone: "inspirational"
chapter_number: 8
chapter_count: 8
```

**Output esperado (fragmento):**
```json
{
  "chapter_number": 8,
  "content": "<p>Você chegou até aqui com algo que a maioria das pessoas nunca constrói: um método. Não uma ideia vaga, não um plano para «um dia» — um sistema que funciona mesmo sem audiência prévia, mesmo sem ser famoso, mesmo começando do zero.</p><h2>O que você construiu até aqui</h2><p>Ao longo deste ebook você passou por cada etapa do processo...</p>"
}
```

**Por qué es útil:** Verifica que el último capítulo consolida la transformación, no incluye CTAs a plataformas externas, el tono inspiracional se mantiene genuino (no hype), y está en pt-BR auténtico.

---

### Ejemplo 4 — Error por input incompleto

**Variables de input:**
```
content_locale: "es"
topic: ""
index: {"error": "INVALID_INPUT", "reason": "..."}
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "message": "El índice del ebook contiene un error y no se puede generar el capítulo. Resolvé el paso anterior del wizard antes de continuar."
}
```

---

## 8. Casos límite

| Caso | Descripción del input | Output esperado |
|------|-----------------------|-----------------|
| **`previous_chapters` vacío** | Capítulo 1, array `[]` | Genera normalmente; abre el loop, valida dolor, no hay referencias a capítulos anteriores |
| **`previous_chapters` con error** | Algún capítulo previo tiene `{"error":...}` en su content | Ignorar ese capítulo en el análisis de coherencia; generar con lo disponible |
| **`index` con error** | `index` contiene campo `"error"` | `{"error": "INVALID_INPUT", "message": "..."}` |
| **`chapter_number` fuera de rango** | Número mayor que `chapter_count` o menor que 1 | `{"error": "INVALID_INPUT", "message": "..."}` |
| **Avatar o problem con `"error"`** | Campos del pipeline previo sin resolver | `{"error": "INVALID_INPUT", "message": "..."}` |
| **Topic vacío** | `topic: ""` o solo espacios | `{"error": "INVALID_INPUT", "message": "..."}` |
| **Input en idioma incorrecto** | User escribe en inglés con `content_locale: "es"` | Generar en `es`; ignorar el idioma del input |
| **`word_count_target` imposible** | Objetivo de 300w con 7 key_concepts complejos | Cubrir todos los conceptos con densidad; indicar en notas si hay tensión sistemática |
| **Capítulo final con CTA** | Modelo intenta incluir "unite a mi grupo / seguime en..." | Regla 7 del system lo bloquea. Si aparece en producción → revisar temperature |
| **Contenido fuera del nicho** | Topic no corresponde a un infoproducto educativo | Generar con lo disponible; el topic ya viene validado del pipeline anterior |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Primer prompt de generación de contenido de capítulo |

### Decisiones tomadas

- **HTML en lugar de Markdown:** `chapters.content` es HTML sanitizado (Tiptap). Generar HTML directamente elimina una conversión posterior y reduce la posibilidad de markup inconsistente.
- **Título del capítulo excluido del HTML:** La UI renderiza el título desde `chapters.title` (campo separado en la DB). Incluirlo en el HTML generaría duplicado visual.
- **JSON wrapper (`{chapter_number, content}`):** Permite validar el output del modelo antes de persisitir, y hace explícito a qué capítulo pertenece el contenido en caso de respuestas fuera de orden.
- **`previous_chapters` como array de HTML completo (con truncado opcional):** Pasar el HTML real —aunque sea truncado— da más señales de coherencia que un resumen sintético. El backend controla el tamaño para capítulos lejanos.
- **Temperatura 0.7:** Más baja produce capítulos que suenan formulaicos entre proyectos del mismo nicho. La coherencia estructural la impone el índice; la temperatura maneja la voz y la variedad.
- **No few-shot completo en el system:** Un capítulo real en el system prompt costaría ~1.500 tokens adicionales por llamada × 12 capítulos. El índice + previous_chapters cumplen la función de anclaje de coherencia con menor costo.

### Decisiones descartadas

- **Generar todos los capítulos en una sola llamada:** Rompe el límite de tokens para libros de 10-12 capítulos y no permite revisión intermedia del usuario entre capítulos.
- **Output en Markdown:** Requeriría una conversión post-generación a HTML para Tiptap, con riesgo de inconsistencias. HTML directo es más predecible.
- **Resumen sintético de capítulos anteriores:** Generado por el modelo, agrega latencia y costo. Pasar el HTML con truncado es más simple y más fiel.
- **Incluir bonuses/bumps como contexto:** El ebook principal es un producto independiente. Contaminar la generación con nombres de bonuses crea riesgo de menciones cruzadas no deseadas.

### Próximos experimentos

- [ ] Testear temperatura 0.65 vs 0.7 para evaluar si reduce alucinaciones factuales manteniendo variedad de voz
- [ ] Evaluar few-shot con un capítulo de ejemplo completo en el system (costo: ~1.500 tokens extra por llamada) vs. calidad actual
- [ ] Medir si el truncado de capítulos anteriores a 2-3 oraciones afecta coherencia de voz o genera contradicciones detectables en revisión editorial
- [ ] Explorar si añadir `narrative_arc` de forma más prominente en el user turn (además de estar en el índice) mejora la sensación de hilo conductor en capítulos medios

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
