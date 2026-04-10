# generate-ebook-title — Propone 5 candidatos de título para el ebook principal

**Ruta:** `prompts/wizard/generate-ebook-title.md`  
**Implementación:** `obra/src/lib/prompts.ts` → función `generateEbookTitlePrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Package structure — main titles  
**Estado:** `draft`  
**Última revisión:** 2026-04-09 (v1.1)

---

## 1. Objetivo

Propone exactamente 5 candidatos de título para el ebook principal del paquete, basados en el topic, avatar, y problema del proyecto. Se usa en el paso "Package structure — main titles" del wizard compartido para que el creador elija uno o escriba el suyo propio. En regeneración, evita proponer títulos similares a los ya mostrados (`previous_titles`) y excluye ángulos similares a los que el creador ya bloqueó (`locked_titles`).

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro |
| `{topic}` | `string` | ✅ | Tema del infoproducto; idealmente el `optimized_title` de `optimize-topic` |
| `{problem}` | `string` | ✅ | Síntesis del problema que resuelve el producto; puede ser el `core_problem` de `optimize-problem` |
| `{avatar_summary}` | `string` | ✅ | Descripción breve del cliente ideal; puede ser el campo `description` del output de `optimize-avatar` |
| `{locked_titles}` | `string[]` | ❌ | Títulos que el creador ya bloqueó o tiene como custom title; se evita generar candidatos similares. `[]` en la primera generación. |
| `{previous_titles}` | `string[]` | ❌ | Todos los candidatos ya mostrados en rondas anteriores; se evita repetirlos o parafrasearlos. `[]` en la primera generación. |

**Nota sobre conteo:** Este prompt siempre genera **exactamente 5 candidatos**. Los `locked_titles` son hints de exclusión, no slots que se restan del total — el usuario elige un título del lote o escribe el suyo propio en un campo separado. Si `locked_titles.length >= 5`, retornar error.

---

## 3. Output esperado

**Tipo de output:** JSON array

**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt.

### Schema con ejemplo real

```json
[
  "Velas que se venden: el sistema para fijar precios y conseguir clientes que pagan lo que vale",
  "De hobby a negocio: cómo convertir tu taller de velas en una fuente de ingresos predecibles",
  "Velas con ganancia: el método para cobrar lo justo sin ahuyentar clientes",
  "Tu marca de velas: diferenciarte, posicionarte, y construir clientes fieles desde cero",
  "El negocio de las velas: precios, clientes, y crecimiento real sin rebajar el precio"
]
```

### Schema de error

```json
{ "error": "INVALID_INPUT", "reason": "Razón breve en {content_locale}" }
```

```json
{ "error": "ALL_LOCKED", "reason": "Razón breve en {content_locale}" }
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.5` | Variedad acotada — los 5 deben ser distintos entre sí pero coherentes con el mismo topic |
| **max_tokens** | `300` | 5 títulos de ~80-120 chars; el array JSON completo ronda los 150-200 tokens |
| **Modelo** | `claude-sonnet-4-6` | Tarea de complejidad media: creatividad acotada + avoidance de repeticiones |

---

## 5. System prompt

_`{content_locale}` se interpola en `prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must be a valid JSON array starting with [ and ending with ]. Do NOT wrap it in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the array. The first character must be [ and the last must be ].

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: propose exactly 5 distinct, compelling ebook title candidates that the creator will choose from or discard.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Rules (non-negotiable):
1. Always return exactly 5 title strings in the array — never fewer, never more.
2. Each title must be specific and benefit-driven: what concrete transformation or result does the reader get? Avoid generic titles like "Guía completa de X" with no concrete promise.
3. The 5 titles must be meaningfully distinct from each other — vary the angle (method, transformation, identity, result, how-to), not just synonyms of the same headline.
4. If previous_titles is non-empty: do not repeat or closely paraphrase any title from that list. Substantial novelty required.
5. If locked_titles is non-empty: do not generate any title that closely resembles them in angle or wording.
6. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in {content_locale}>"}
7. Tone: warm, direct, and credible. Aspirational but grounded — the reader should feel "this is achievable", not "this sounds too good to be true". Avoid: income-specific promises ("$1000", "double your sales"), hyperbolic scale ("empire", "machine", "explode"), urgency gimmicks ("in 60 days", "overnight"), and clickbait constructs ("Wax to Wealth", "X to Y" wordplay that trivializes the work). Aim for the tone of a trusted mentor, not a late-night infomercial.
8. Length: each title max 120 characters.
9. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: topic is empty or missing | content is off-topic or inappropriate for an infoproduct.

Example (es):
Input: topic="Velas artesanales: sistema de precios y ventas" avatar_summary="Artesana que cobra barato y vende de forma inconsistente" problem="No sabe fijar precios ni conseguir clientes fuera de su círculo" previous_titles=[] locked_titles=[]
["Velas que se venden: sistema de precios y clientes que pagan lo que vale","De hobby a negocio: cómo convertir tu taller de velas en ingresos predecibles","Velas con ganancia: cobrar lo justo sin ahuyentar clientes","Tu marca de velas: diferenciarte, posicionarte, y construir clientes fieles","El negocio de las velas: precios, clientes, y crecimiento sin rebajar el precio"]

Example (pt-BR):
Input: topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que só vende para quem já a conhece" problem="Alcance limitado ao círculo de amigos; não sabe atrair desconhecidos" previous_titles=[] locked_titles=[]
["Clientes novos todo mês: marketing digital para artesãs que querem crescer além dos conhecidos","Do Instagram para o mundo: como vender para desconhecidos sem gastar em anúncios","Sua arte, mais alcance: o método para atrair clientes novos sem depender de indicação","Artesã com audiência: como transformar seguidores em compradores","Venda para quem não te conhece: marketing orgânico para artesãs com produto bom e visibilidade zero"]
```

---

## 6. User prompt template

```
Topic: {topic}
Avatar: {avatar_summary}
Problem solved: {problem}
Previously shown titles (avoid repeating or paraphrasing): {previous_titles}
Locked titles (do not generate similar): {locked_titles}

Propose exactly 5 distinct ebook title candidates.
```

**Notas de implementación en `prompts.ts`:**
- `{content_locale}` se interpola en el system antes de enviar — nunca va en el user turn
- `{previous_titles}` y `{locked_titles}` se serializan como `JSON.stringify(array)`; pasar `"[]"` cuando están vacíos
- Si `topic` está vacío, no llamar al prompt — validar en UI antes de la llamada
- El output es un array plano; el calling code usa `JSON.parse(response)` directamente
- Para distinguir error de array: verificar `typeof result === "object" && !Array.isArray(result) && result.error`

---

## 7. Ejemplos few-shot

_Estos ejemplos son los casos de test canónicos para `generateEbookTitlePrompt()` en `prompts.ts`._

---

### Ejemplo 1 — Primera generación, `es`, contexto rico

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de fabricar velas en un negocio rentable desde casa"
avatar_summary: "Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Cobra barato por miedo a ahuyentar clientes y vende de forma inconsistente."
problem: "No tiene sistema para fijar precios ni para conseguir clientes fuera de su círculo de conocidos."
locked_titles: []
previous_titles: []
```

**Output esperado:**
```json
[
  "Velas que se venden: el sistema para fijar precios y conseguir clientes que pagan lo que vale",
  "De hobby a negocio: cómo convertir tu taller de velas en una fuente de ingresos predecibles",
  "Velas con ganancia: el método para cobrar lo justo sin ahuyentar clientes",
  "Tu marca de velas: diferenciarte, posicionarte, y construir clientes fieles desde cero",
  "El negocio de las velas: precios, clientes, y crecimiento real sin rebajar el precio"
]
```

**Por qué es el caso base:** Primera generación con arrays vacíos y contexto completo. Verifica que los 5 títulos son distintos en ángulo (sistema, transformación, método, identidad/marca, negocio completo) y específicos al nicho de velas — no genéricos.

---

### Ejemplo 2 — Regeneración con `previous_titles` y `locked_titles`, `es`

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de fabricar velas en un negocio rentable desde casa"
avatar_summary: "Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Cobra barato y vende de forma inconsistente."
problem: "No tiene sistema para fijar precios ni para conseguir clientes fuera de su círculo."
locked_titles: ["Mi negocio de velas: de cero a rentable en 90 días"]
previous_titles: [
  "Velas que se venden: el sistema para fijar precios y conseguir clientes que pagan lo que vale",
  "De hobby a negocio: cómo convertir tu taller de velas en una fuente de ingresos predecibles",
  "Velas con ganancia: el método para cobrar lo justo sin ahuyentar clientes",
  "Tu marca de velas: diferenciarte, posicionarte, y construir clientes fieles desde cero",
  "El negocio de las velas: precios, clientes, y crecimiento real sin rebajar el precio"
]
```

**Output esperado:**
```json
[
  "Artesana con precio justo: cómo vender velas sin competir por ser la más barata",
  "El método de las 3 pasos: valorar, visibilizar, y vender tus velas de forma sostenible",
  "Velas y negocio real: deja de regalar tu trabajo y empieza a cobrar lo que vale",
  "Clientas que vuelven: cómo construir una cartera de compradores fieles con tu taller",
  "Precio, marca, y crecimiento: la guía para la artesana que quiere vivir de sus velas"
]
```

**Por qué es útil:** Verifica el comportamiento de regeneración. Los 5 nuevos títulos no parafrasean los de `previous_titles` y no se parecen al `locked_title`. El modelo debe encontrar ángulos frescos (precio justo, cartera de clientas, vivir de las velas) sin repetir los usados antes.

---

### Ejemplo 3 — Primera generación en `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações"
avatar_summary: "Mãe artesã que vende só para quem já a conhece e não sabe como chegar em clientes novos pelo Instagram."
problem: "Alcance limitado ao círculo de amigos e familiares; não sabe como atrair desconhecidos de forma consistente."
locked_titles: []
previous_titles: []
```

**Output esperado:**
```json
[
  "Clientes novos todo mês: marketing digital para artesãs que querem crescer além dos conhecidos",
  "Do Instagram para o mundo: como vender para desconhecidos sem gastar em anúncios",
  "Sua arte, mais alcance: o método para atrair clientes novos sem depender de indicação",
  "Artesã com audiência: como construir presença digital e transformar seguidores em compradores",
  "Venda para quem não te conhece: marketing orgânico para artesãs com produto bom e visibilidade zero"
]
```

**Por qué es útil:** Verifica pt-BR genuino — no es traducción del español. Los títulos usan el lenguaje natural del mercado digital brasileño ("orgânico", "seguidores", "alcance"). El tono es cálido y directo, no corporativo.

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| **`topic` vacío** | `topic: ""` o solo espacios | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de llamar |
| **`locked_titles.length >= 5`** | Todos los slots bloqueados | `{"error":"ALL_LOCKED","reason":"..."}` |
| **`previous_titles` con 20+ títulos** | Muchas rondas de regeneración | Generar 5 con la mayor novedad posible; el modelo puede no garantizar diferencia total con sets muy grandes — aceptable en producción |
| **Input en idioma distinto al locale** | `content_locale: "es"`, inputs en inglés | Output en `es`; ignorar idioma del input |
| **Topic muy amplio** | `"bienestar"` sin más contexto | Generar igualmente; los títulos serán más genéricos — normal con input mínimo |
| **Topic ofensivo o fuera de scope** | Contenido inapropiado o ilegal | `{"error":"INVALID_INPUT","reason":"..."}` |
| **`avatar_summary` muy corto** | `"personas"` o similar | Usar `topic` y `problem` como anclas principales; generar igualmente |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-09 | v1.0 | Versión inicial | Primer prompt de generación de títulos del wizard compartido |
| 2026-04-09 | v1.1 | Regla de tono (rule 7) reescrita | Regla anterior demasiado genérica — no prevenía promesas de ingresos específicos, hipérbole de escala, ni gimmicks de urgencia. Nueva versión enumera los anti-patrones concretos con ejemplos. |

### Decisiones descartadas

- **Output como `{ "titles": [...] }` en vez de array plano:** descartado — para un array simple, la extracción directa con `JSON.parse` es más limpia. El error se distingue porque retorna un objeto `{ "error": ... }`, detectable con `!Array.isArray(result)`.
- **`count_to_generate` como input:** descartado — el ebook title siempre genera exactamente 5 candidatos. La reducción por locked no aplica aquí como en bonus/bump (donde la UI mezcla locked + nuevos en el listado).
- **Forzar variedad de ángulos por prompt (e.g., "uno emocional, uno técnico, uno de identidad"):** evaluado para garantizar diversidad. Descartado en v1.0 — añade tokens y rigidez; la regla 3 guía la variedad sin prescribir dimensiones.

### Próximos experimentos

- [ ] Testear temperatura `0.6` vs `0.5` — ¿más creatividad en ángulos o más ruido y títulos genéricos?
- [ ] Evaluar si pasar `problem` como el JSON completo de `optimize-problem` (en vez de síntesis) mejora especificidad.
- [ ] Medir si el few-shot en el system prompt (ya incluido) reduce títulos genéricos respecto a no tenerlo.
- [ ] Testear en `en-GB` para verificar diferencia de registro respecto a `en-US`.

### Problemas conocidos en producción

- _Ninguno registrado._
