# generate-bonus-titles — Propone títulos de bonuses que complementan el ebook principal

**Ruta:** `prompts/wizard/generate-bonus-titles.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateBonusTitlesPrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Package structure — bonus titles  
**Estado:** `draft`  
**Última revisión:** 2026-04-09

---

## 1. Objetivo

Propone exactamente `count_to_generate` títulos de bonuses para el paquete de infoproducto, basados en el ebook principal, topic, y avatar. Los bonuses son productos más chicos (10-12 páginas) que extienden una dimensión específica del ebook desde un ángulo distinto: una herramienta, un script, un recurso de implementación. Los `count_to_generate` títulos deben ser distintos entre sí y complementarse como sistema. En regeneración, evita parafrasear los títulos ya mostrados (`previous_titles`) y excluye ángulos similares a los que el creador ya bloqueó (`locked_titles`).

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro |
| `{ebook_title}` | `string` | ✅ | Título confirmado del ebook principal; ancla temática del paquete |
| `{topic}` | `string` | ✅ | Tema del infoproducto; contexto para que los bonuses sean específicos al nicho |
| `{avatar_summary}` | `string` | ✅ | Descripción breve del cliente ideal; campo `description` del output de `optimize-avatar` |
| `{count_to_generate}` | `number` | ✅ | Cantidad de títulos a generar. En batch: `5 - locked_titles.length`. En regeneración de fila individual: `1`. |
| `{locked_titles}` | `string[]` | ❌ | Títulos que el creador ya bloqueó; excluir similitudes. Serializar como JSON. `[]` en la primera generación. |
| `{previous_titles}` | `string[]` | ❌ | Todos los títulos ya mostrados en rondas anteriores; evitar repeticiones y paráfrasis. Serializar como JSON. `[]` en la primera generación. |

**Nota sobre conteo:** `count_to_generate = 5 - locked_titles.length` en el caso habitual (regenerar todos los no bloqueados). En regeneración de una sola fila, `count_to_generate = 1`. Si `locked_titles.length >= 5`, la UI debe bloquear la acción — no llamar al prompt.

---

## 3. Output esperado

**Tipo de output:** JSON array

**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt.

### Schema con ejemplo real

```json
[
  "La calculadora de costos para artesanas",
  "50 respuestas para el 'está caro'",
  "Tu primera campaña de Instagram en 30 días",
  "El calendario de producción semanal sin agotarte"
]
```

> El ejemplo muestra 4 items porque `count_to_generate = 4` (hay 1 locked). El array siempre tiene exactamente `count_to_generate` strings.

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
| **Temperatura** | `0.6` | Creatividad necesaria para encontrar ángulos complementarios distintos; más libre que el ebook title |
| **max_tokens** | `250` | `count_to_generate` títulos de ~60-100 chars; el array JSON completo ronda los 100-180 tokens |
| **Modelo** | `claude-sonnet-4-6` | Tarea de complejidad media: creatividad acotada al paquete + avoidance de repeticiones |

---

## 5. System prompt

_`{content_locale}` se interpola en `_shared/prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must be a valid JSON array starting with [ and ending with ]. Do NOT wrap it in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the array. The first character must be [ and the last must be ].

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: propose exactly {count_to_generate} bonus titles that complement the main ebook as a coherent package. Each bonus is a short product (10–12 pages) that extends a specific dimension of the ebook's promise — a tool, a script, a planner, a checklist — from a different angle.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Rules (non-negotiable):
1. Return exactly {count_to_generate} title strings in the array — never fewer, never more.
2. Each bonus must address a DIFFERENT sub-problem, step, or tool. Never two bonuses that do the same thing with different names.
3. The {count_to_generate} titles must be meaningfully distinct from each other — vary the format (checklist, template, script, planner, calculator, guide) and the sub-problem addressed.
4. Each title must be specific and benefit-forward: not "Módulo de Marketing" but "Tu primera campaña de Instagram en 30 días". Not "Herramienta de precios" but "La calculadora de costos para artesanas".
5. Bonuses are NOT summaries or extra chapters of the main ebook. They are standalone short products that solve a specific adjacent problem the ebook introduces but does not fully implement.
6. If previous_titles is non-empty: do not repeat or closely paraphrase any title from that list. Substantial novelty required.
7. If locked_titles is non-empty: do not generate titles similar in angle or wording to any locked title.
8. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in {content_locale}>"}
9. Tone: warm and direct, not corporate. Written for LATAM/BR creators. No academic framing, no "Guía completa de X".
10. Length: each title max 100 characters.
11. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: ebook_title or topic is empty | content is off-topic or inappropriate.

Example (es):
Input: ebook_title="Velas que se venden: sistema de precios, marca y clientes" topic="Velas artesanales: sistema de precios y ventas" avatar_summary="Artesana que cobra barato y vende de forma inconsistente" count_to_generate=4 locked_titles=["La calculadora de costos para artesanas"] previous_titles=[]
["50 respuestas para el 'está caro'","Tu primera campaña de Instagram en 30 días","El calendario de producción semanal sin agotarte","Guion para cerrar ventas por WhatsApp en 5 pasos"]

Example (pt-BR):
Input: ebook_title="Clientes novos todo mês: marketing digital para artesãs" topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que só vende para quem já a conhece" count_to_generate=3 locked_titles=["30 legendas prontas para o Instagram","Guia para criar sua bio e destaques perfeitos"] previous_titles=[]
["Scripts para fechar vendas no DM sem pressionar","Planner semanal de conteúdo para artesãs que não têm tempo","Kit de modelos de story para apresentar produtos novos"]
```

---

## 6. User prompt template

```
Ebook title: {ebook_title}
Topic: {topic}
Avatar: {avatar_summary}
Titles already locked (do not generate similar): {locked_titles}
Previously shown titles (avoid repeating or paraphrasing): {previous_titles}

Propose exactly {count_to_generate} distinct bonus titles that complement this ebook.
```

**Notas de implementación en `_shared/prompts.ts`:**
- `{content_locale}` se interpola en el system antes de enviar — nunca va en el user turn
- `{locked_titles}` y `{previous_titles}` se serializan como `JSON.stringify(array)`; pasar `"[]"` cuando están vacíos
- `count_to_generate` se calcula antes de la llamada: `Math.max(1, 5 - locked_titles.length)`
- Si `locked_titles.length >= 5`, **no llamar al prompt** — la UI debe bloquear la acción
- El output es un array plano; usar `JSON.parse(response)` directamente
- Para distinguir error de array: verificar `typeof result === "object" && !Array.isArray(result) && result.error`
- En regeneración de fila individual: `count_to_generate = 1`; el calling code reemplaza solo esa fila en la UI

---

## 7. Ejemplos few-shot

_Estos ejemplos son los casos de test canónicos para `generateBonusTitlesPrompt()` en `_shared/prompts.ts`._

---

### Ejemplo 1 — Primera generación, `es`, batch completo

**Variables de input:**
```
content_locale: "es"
ebook_title: "Velas que se venden: el sistema para fijar precios y conseguir clientes que pagan lo que vale"
topic: "Cómo transformar tu hobby de fabricar velas en un negocio rentable desde casa"
avatar_summary: "Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Cobra barato y vende de forma inconsistente."
count_to_generate: 5
locked_titles: []
previous_titles: []
```

**Output esperado:**
```json
[
  "La calculadora de costos para artesanas",
  "50 respuestas para el 'está caro'",
  "Tu primera campaña de Instagram en 30 días",
  "El calendario de producción semanal sin agotarte",
  "Guion para cerrar ventas por WhatsApp en 5 pasos"
]
```

**Por qué es el caso base:** Primera generación con arrays vacíos. Verifica que los 5 bonuses son distintos en formato (calculadora, scripts de objeción, plan de marketing, calendario de producción, guion de ventas) y en el sub-problema que atacan — nunca dos que hagan lo mismo con distinto nombre.

---

### Ejemplo 2 — Regeneración con `locked_titles` y `previous_titles`, `es`

**Variables de input:**
```
content_locale: "es"
ebook_title: "Velas que se venden: el sistema para fijar precios y conseguir clientes que pagan lo que vale"
topic: "Cómo transformar tu hobby de fabricar velas en un negocio rentable desde casa"
avatar_summary: "Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Cobra barato y vende de forma inconsistente."
count_to_generate: 3
locked_titles: [
  "La calculadora de costos para artesanas",
  "50 respuestas para el 'está caro'"
]
previous_titles: [
  "La calculadora de costos para artesanas",
  "50 respuestas para el 'está caro'",
  "Tu primera campaña de Instagram en 30 días",
  "El calendario de producción semanal sin agotarte",
  "Guion para cerrar ventas por WhatsApp en 5 pasos"
]
```

**Output esperado:**
```json
[
  "Mini guía de fotografía de velas con el celular",
  "Tu tienda en Mercado Libre: paso a paso para artesanas",
  "20 ideas de kits para vender más en fechas especiales"
]
```

**Por qué es útil:** Verifica regeneración parcial. `count_to_generate = 3` porque hay 2 locked. Los 3 nuevos títulos no parafrasean los 5 de `previous_titles` y no se parecen a los 2 locked. El modelo debe encontrar ángulos frescos (fotografía, marketplace, kits por fecha) sin repetir los ya usados.

---

### Ejemplo 3 — Primera generación en `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
ebook_title: "Clientes novos todo mês: marketing digital para artesãs que querem crescer além dos conhecidos"
topic: "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações"
avatar_summary: "Mãe artesã que vende só para quem já a conhece e não sabe como chegar em clientes novos pelo Instagram."
count_to_generate: 5
locked_titles: []
previous_titles: []
```

**Output esperado:**
```json
[
  "30 legendas prontas para o Instagram",
  "Guia para criar sua bio e destaques perfeitos",
  "Scripts para fechar vendas no DM sem pressionar",
  "Planner semanal de conteúdo para artesãs sem tempo livre",
  "Kit de modelos de story para lançar produto novo"
]
```

**Por qué es útil:** Verifica pt-BR genuino — lenguaje natural del mercado digital brasileño ("legendas", "DM", "destaques", "story"). El tono es directo y cálido. Cada bonus ataca una dimensión distinta del problema de marketing: contenido orgánico, perfil, conversión, planificación, y lanzamiento.

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| **`ebook_title` vacío** | `ebook_title: ""` o solo espacios | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de llamar |
| **`locked_titles.length >= 5`** | Todos los slots bloqueados | `{"error":"ALL_LOCKED","reason":"..."}` — no llamar al prompt; bloquear desde UI |
| **`count_to_generate = 1`** | Regeneración individual de una sola fila | Devolver array con exactamente 1 string |
| **`previous_titles` con 20+ títulos** | Muchas rondas de regeneración | Generar `count_to_generate` con la mayor novedad posible; el modelo puede no garantizar diferencia total con sets muy grandes — aceptable en producción |
| **Input en idioma distinto al locale** | `content_locale: "es"`, inputs en inglés | Output en `es`; ignorar idioma del input |
| **Topic muy amplio** | `ebook_title` genérico sin contexto de nicho | Generar igualmente; los títulos serán más genéricos — normal con input mínimo |
| **Topic ofensivo o fuera de scope** | Contenido inapropiado o ilegal | `{"error":"INVALID_INPUT","reason":"..."}` |
| **El modelo propone capítulos del ebook** | Confusión entre bonus y capítulo | El system rule 5 es explícito. Si persiste en producción, reforzar con un ejemplo contrario (antipatrón) en el system. |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-09 | v1.0 | Versión inicial | Primer prompt de generación de títulos de bonuses del wizard compartido |

### Decisiones descartadas

- **Incluir `description` y `complement` en el output:** descartado — este prompt solo genera títulos. La descripción y el complement pertenecen a `suggest-package`, que genera la propuesta estructural completa. Responsabilidades separadas.
- **Pasar el objeto completo de `optimize-problem` en vez de `avatar_summary`:** para títulos de bonus, `ebook_title` ya actúa como ancla temática; `avatar_summary` da el tono. El objeto completo agregaría tokens sin mejora proporcional en calidad de títulos.
- **Forzar un tipo de formato por bonus (checklist, script, planilla...):** añade rigidez innecesaria. Los formatos emergen naturalmente del nicho. El rule 3 guía la variedad sin prescribir dimensiones específicas.

### Próximos experimentos

- [ ] Testear temperatura `0.7` vs `0.6` — ¿más creatividad en formatos de bonus o más divergencia del topic?
- [ ] Evaluar si pasar `problem.sub_problems` explícitamente mejora la especificidad de los bonuses vs. usar solo `avatar_summary`.
- [ ] Medir si el few-shot inline en el system reduce la repetición de formatos genéricos ("guía de X", "guía de Y").
- [ ] Testear en `en-GB` para verificar diferencia de registro respecto a `en-US`.

### Problemas conocidos en producción

- _Ninguno registrado._
