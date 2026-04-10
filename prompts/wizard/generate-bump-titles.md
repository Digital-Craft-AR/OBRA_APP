# generate-bump-titles — Propone títulos de order bumps en temas adyacentes al ebook principal

**Ruta:** `prompts/wizard/generate-bump-titles.md`  
**Implementación:** `obra/src/lib/prompts.ts` → función `generateBumpTitlesPrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Package structure — bump titles  
**Estado:** `draft`  
**Última revisión:** 2026-04-09 (v1.4)

---

## 1. Objetivo

Propone exactamente `count_to_generate` títulos de order bumps para el paquete de infoproducto. Los order bumps son **productos hermanos del ebook** — mismo universo y audiencia, pero tema **adyacente**, nunca el mismo del ebook principal. La IA siempre puede generar hasta 5 candidatos aunque el usuario solo pueda seleccionar hasta 2; la restricción de selección la aplica la UI. En regeneración, evita parafrasear los títulos ya mostrados (`previous_titles`) y excluye ángulos similares a los que el creador ya bloqueó (`locked_titles`).

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro |
| `{ebook_title}` | `string` | ✅ | Título confirmado del ebook principal; define el universo temático del paquete |
| `{topic}` | `string` | ✅ | Tema del infoproducto; ancla al nicho para que los bumps sean relevantes para la misma audiencia |
| `{avatar_summary}` | `string` | ✅ | Descripción breve del cliente ideal; campo `description` del output de `optimize-avatar` |
| `{count_to_generate}` | `number` | ✅ | Cantidad de títulos a generar. En batch: `5 - locked_titles.length`. En regeneración de fila individual: `1`. |
| `{locked_titles}` | `string[]` | ❌ | Títulos que el creador ya bloqueó; excluir similitudes. Serializar como JSON. `[]` en la primera generación. |
| `{previous_titles}` | `string[]` | ❌ | Todos los títulos ya mostrados en rondas anteriores; evitar repeticiones y paráfrasis. Serializar como JSON. `[]` en la primera generación. |

**Nota sobre conteo:** `count_to_generate = 5 - locked_titles.length` en el caso habitual (regenerar todos los no bloqueados). En regeneración de una sola fila, `count_to_generate = 1`. Si `locked_titles.length >= 5`, la UI debe bloquear la acción — no llamar al prompt.

**Semántica del bump (crítico):** Un order bump NO es un bonus ni un capítulo extra del ebook. Es un infoproducto independiente sobre un tema **adyacente** en el mismo universo del creador, para la misma audiencia. Patrón canónico:
- Ebook "Vendé haciendo velas" → bumps válidos: "Vendé haciendo jabones", "Vendé haciendo sahumerios"
- Ebook "Recetario vegano práctico" → bumps válidos: "Recetario vegano sin TACC", "Recetario vegano para el desayuno"

---

## 3. Output esperado

**Tipo de output:** JSON array

**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt.

### Schema con ejemplo real

```json
[
  "Vendé haciendo jabones artesanales: el mismo sistema para otro producto",
  "Sahumerios y aromaterapia en casa: negocio rentable con lo que ya sabés hacer",
  "Velas de soja premium: cómo entrar al nicho sin tóxicos y cobrar más"
]
```

> El ejemplo muestra 3 items porque `count_to_generate = 3` (hay 2 locked). El array siempre tiene exactamente `count_to_generate` strings.

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
| **Temperatura** | `0.6` | Los bumps requieren creatividad lateral para encontrar temas adyacentes genuinos — no subproductos del ebook |
| **max_tokens** | `250` | `count_to_generate` títulos de ~60-120 chars; el array JSON completo ronda los 100-200 tokens |
| **Modelo** | `claude-sonnet-4-6` | Tarea de complejidad media: creatividad lateral para encontrar temas adyacentes coherentes al nicho |

---

## 5. System prompt

_`{content_locale}` se interpola en `prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must be a valid JSON array starting with [ and ending with ]. Do NOT wrap it in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the array. The first character must be [ and the last must be ].

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: propose exactly {count_to_generate} order bump titles. Order bumps are standalone sibling products — same universe and avatar, ADJACENT topic, NEVER the same topic as the main ebook.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Order bumps are SIBLING PRODUCTS — not bonus material, not extra chapters. Think of them as: another ebook the same creator could sell to the same buyer, on a related but distinct topic.

Canonical pattern (use to calibrate):
- Ebook "Vendé haciendo velas" → bumps: "Vendé haciendo jabones", "Vendé haciendo sahumerios" — same creator audience, adjacent craft.
- Ebook "Vendé haciendo galletitas" → bumps: "Vendé haciendo brownies", "Vendé haciendo trufas" — same monetization angle, different product.
- Ebook "Recetario vegano práctico" → bumps: "Recetario vegano sin TACC", "Recetario vegano para el desayuno" — same audience and diet, adjacent specialization.
- Ebook "The Profitable Candle Maker" → bumps: "The Handmade Soap Maker", "Sell Your Macramé Creations", "The Home Jewelry Maker", "Dried Flowers as a Business", "The Handmade Pottery Seller" — same handmade business avatar, DIVERSE crafts.

Anti-pattern (do NOT generate this):
- Ebook "Vendé haciendo velas" → bump "Cómo fijar el precio de tus velas" — this is a chapter of the ebook, not a sibling product.
- Ebook "Recetario vegano" → bump "50 recetas veganas adicionales" — this is more ebook content, not a sibling product.

Rules (non-negotiable):
1. Return exactly {count_to_generate} title strings in the array — never fewer, never more.
2. Each bump must cover a DIFFERENT adjacent topic. Never two bumps that cover the same theme with different names.
3. The {count_to_generate} titles must be creatively distinct from each other — not minor variations of the same idea.
4. Bumps are NEVER extras, bonus material, or chapters of the main ebook. They are standalone sibling products on an adjacent topic for the same audience — the creator could sell them independently.
5. Each bump title must be ORIGINAL — do not copy or closely mirror the structure, format, or wording of the main ebook title. If the main ebook is "The Profitable Candle Maker: Master the Business Skills Your Creative Passion Deserves", a bump title like "The Profitable Soap Maker: Master the Business Skills Your Creative Passion Deserves" is WRONG — it's a clone, not a sibling product.
6. The {count_to_generate} bumps must explore DIVERSE adjacent topics — do not cluster all bumps in the same narrow sub-category. For a candle maker ebook, proposing bumps all in the wax/bath products world is too narrow. Think broader: adjacent handmade businesses the same maker could pursue (candles → macramé, jewelry, home fragrance, dried flowers, soy products — variety, not repetition of the same universe). If all proposed bumps fall within the same narrow product category (e.g., all wax/bath products for a candle ebook), that is a failure. Actively seek diversity across different craft or business types.
7. If previous_titles is non-empty: do not repeat or closely paraphrase any title. Substantial novelty required.
8. If locked_titles is non-empty: do not generate titles similar in angle to any locked title.
9. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in {content_locale}>"}
10. Tone: warm, direct, and credible. Aspirational but grounded — the reader should feel "this is achievable", not "this sounds too good to be true". Avoid: income-specific promises, hyperbolic scale ("empire", "machine", "explode"), urgency gimmicks, and clickbait constructs ("X to Y" wordplay that trivializes the work, "Money Maker", "Kitchen to Cash"). Aim for the tone of a trusted mentor, not a late-night infomercial.

Good bump title examples (tone reference):
- "The Handmade Soap Maker: Pricing, Branding, and Finding Your First Customers"
- "From Hobby to Shop: How to Sell Your Macramé Work Online and at Local Markets"
- "The Home Jewelry Maker: Build a Small Business Around Your Beading and Wirework"
- "Dried Flowers as a Business: Grow, Preserve, and Sell Your Floral Creations"

Bad bump title examples (avoid these patterns):
- "Soap Empire: From Kitchen to Cash" — hype, wordplay
- "Macramé Money Maker: Knots into Profits" — trivializes the work
- "Jewelry Box Profits: Consistent Income from Beads" — income-forward, not benefit-forward

11. Length: each title max 120 characters.
12. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: ebook_title or topic is empty | content is off-topic or inappropriate.

Example (es):
Input: ebook_title="Velas que se venden: sistema de precios, marca y clientes" topic="Vender velas artesanales desde casa" avatar_summary="Artesana que fabrica velas en casa y quiere convertirlo en negocio rentable" count_to_generate=5 locked_titles=[] previous_titles=[]
["Vendé haciendo jabones artesanales: el mismo sistema para otro producto","Sahumerios y aromaterapia en casa: cómo vender lo que ya sabés hacer","Velas de soja premium: el nicho sin tóxicos que paga más","Packaging y presentación artesanal: cómo hacer que tu producto se venda solo","Tu primer stand rentable: cómo conseguir y aprovechar una feria artesanal"]

Example (pt-BR):
Input: ebook_title="Clientes novos todo mês: marketing digital para artesãs" topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que quer vender online sem depender de indicações" count_to_generate=5 locked_titles=[] previous_titles=[]
["Marketing digital para doceiras: o mesmo método para vender doces artesanais","Venda de cosméticos naturais: como atrair clientes além dos conhecidos","Do ateliê para o digital: marketing para artesãs de moda e acessórios","Organize e venda: marketing para quem faz papelaria artesanal","Flores e arranjos por encomenda: como usar o Instagram para lotar a agenda"]
```

---

## 6. User prompt template

```
Ebook title: {ebook_title}
Topic: {topic}
Avatar: {avatar_summary}
Titles already locked (do not generate similar): {locked_titles}
Previously shown titles (avoid repeating or paraphrasing): {previous_titles}

Propose exactly {count_to_generate} distinct order bump titles on adjacent topics for the same audience.
```

**Notas de implementación en `prompts.ts`:**
- `{content_locale}` se interpola en el system antes de enviar — nunca va en el user turn
- `{locked_titles}` y `{previous_titles}` se serializan como `JSON.stringify(array)`; pasar `"[]"` cuando están vacíos
- `count_to_generate` se calcula antes de la llamada: `Math.max(1, 5 - locked_titles.length)`
- Si `locked_titles.length >= 5`, **no llamar al prompt** — la UI debe bloquear la acción
- El output es un array plano; usar `JSON.parse(response)` directamente
- Para distinguir error de array: verificar `typeof result === "object" && !Array.isArray(result) && result.error`
- En regeneración de fila individual: `count_to_generate = 1`; el calling code reemplaza solo esa fila en la UI
- El usuario puede **seleccionar hasta 2** bumps finales — esta restricción la aplica la UI, no el prompt. El prompt siempre puede generar hasta 5 candidatos.

---

## 7. Ejemplos few-shot

_Estos ejemplos son los casos de test canónicos para `generateBumpTitlesPrompt()` en `prompts.ts`._

---

### Ejemplo 1 — Primera generación, `es`, nicho artesanal

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
  "Vendé haciendo jabones artesanales: el mismo sistema para otro producto",
  "Sahumerios y aromaterapia en casa: negocio rentable con lo que ya sabés hacer",
  "Velas de soja premium: cómo entrar al nicho sin tóxicos y cobrar más",
  "Packaging y presentación artesanal: cómo hacer que tu producto se venda solo",
  "Tu primer stand rentable: cómo conseguir y aprovechar una feria artesanal"
]
```

**Por qué es el caso base:** Primera generación. Los 5 bumps son temas adyacentes en el universo artesanal de esta creadora — mismo avatar (artesana que quiere vender), temas distintos (jabones, sahumerios, velas premium, packaging, ferias). Ninguno repite el tema del ebook principal (sistema de precios y clientes para velas).

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
  "Vendé haciendo jabones artesanales: el mismo sistema para otro producto",
  "Sahumerios y aromaterapia en casa: negocio rentable con lo que ya sabés hacer"
]
previous_titles: [
  "Vendé haciendo jabones artesanales: el mismo sistema para otro producto",
  "Sahumerios y aromaterapia en casa: negocio rentable con lo que ya sabés hacer",
  "Velas de soja premium: cómo entrar al nicho sin tóxicos y cobrar más",
  "Packaging y presentación artesanal: cómo hacer que tu producto se venda solo",
  "Tu primer stand rentable: cómo conseguir y aprovechar una feria artesanal"
]
```

**Output esperado:**
```json
[
  "Flores y plantas secas: cómo decorar y vender con tus manos desde casa",
  "Tus primeros kits de regalo artesanal: diseñá y vendé sets para fechas especiales",
  "Macramé para principiantes que quieren vender lo que hacen"
]
```

**Por qué es útil:** Verifica regeneración parcial. Los 3 nuevos bumps no parafrasean los 5 de `previous_titles` y no se parecen a los 2 locked. El modelo encuentra temas adyacentes frescos en el universo artesanal (flores secas, kits de regalo, macramé) — todos para el mismo avatar, todos en el mismo universo de "hago cosas con mis manos y quiero venderlas".

---

### Ejemplo 3 — Primera generación, `pt-BR`, nicho diferente

**Variables de input:**
```
content_locale: "pt-BR"
ebook_title: "Cardápio vegano sem frescura: receitas fáceis para quem quer comer bem sem complicar"
topic: "Receitas veganas práticas para quem está começando"
avatar_summary: "Pessoa que quer comer vegano mas acha difícil, sem graça, ou caro. Busca receitas simples e gostosas para o dia a dia."
count_to_generate: 5
locked_titles: []
previous_titles: []
```

**Output esperado:**
```json
[
  "Cardápio vegano sem glúten: receitas simples para quem tem as duas restrições",
  "Marmita vegana para a semana: como preparar 5 dias de comida em 2 horas",
  "Sobremesas veganas que enganam: doces sem leite e sem ovos que todo mundo pede",
  "Café da manhã vegano rápido: 30 opções para quem não tem tempo antes do trabalho",
  "Vegano no churrasco: o que levar e como não passar fome em encontros com não-veganos"
]
```

**Por qué es útil:** Verifica pt-BR genuino y el patrón de bumps para un nicho de culinaria. Los 5 bumps son recetarios independientes para el mismo avatar (vegano práctico sin complicaciones) con especializaciones adyacentes: sin glúten, marmitas, postres, desayunos, situaciones sociales. Ninguno repite el eje del ebook principal (recetas cotidianas generales para principiantes).

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| **`ebook_title` vacío** | `ebook_title: ""` o solo espacios | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de llamar |
| **`locked_titles.length >= 5`** | Todos los slots bloqueados | `{"error":"ALL_LOCKED","reason":"..."}` — no llamar al prompt; bloquear desde UI |
| **`count_to_generate = 1`** | Regeneración individual de una sola fila | Devolver array con exactamente 1 string |
| **`previous_titles` con 20+ títulos** | Muchas rondas de regeneración | Generar con la mayor novedad posible; la dificultad de diversidad crece con las rondas — aceptable en producción |
| **Topic con nicho muy estrecho** | Tema tan específico que no tiene adyacentes obvios | Generar los `count_to_generate` más creativos posibles en el mismo universo del avatar; no inventar temas inconexos |
| **Input en idioma distinto al locale** | `content_locale: "es"`, inputs en inglés | Output en `es`; ignorar idioma del input |
| **Topic ofensivo o fuera de scope** | Contenido inapropiado o ilegal | `{"error":"INVALID_INPUT","reason":"..."}` |
| **El modelo propone bonuses en vez de bumps** | Propone extensiones del ebook en vez de temas adyacentes | El system rule 4 y el bloque de patrón canónico son explícitos. Si persiste en producción, reforzar con un antipatrón en el system (ej. "NOT: 'Capítulo extra de precios'"). |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-09 | v1.0 | Versión inicial | Primer prompt de generación de títulos de order bumps del wizard compartido |
| 2026-04-09 | v1.1 | Agregadas rules 5 y 6; renumeradas rules siguientes | Rule 5: previene que el modelo clone la estructura del título del ebook en lugar de crear un título original. Rule 6: previene que todos los bumps se agrupen en el mismo sub-nicho estrecho — exige diversidad de temas adyacentes. |
| 2026-04-09 | v1.2 | Regla de tono (rule 10) extendida | Versión anterior demasiado vaga. Nueva versión alinea con generate-ebook-title v1.1: enumera anti-patrones concretos (promesas de ingresos, hipérbole de escala, urgencia, wordplay trivializante). |
| 2026-04-09 | v1.3 | Ejemplos de tono bueno/malo agregados al system | Los ejemplos inline refuerzan la regla 10 con referencias concretas — buenos (mentor-toned, benefit-forward) y malos (hype, wordplay, income-forward) — para calibrar el modelo sin ambigüedad. |
| 2026-04-09 | v1.4 | Ejemplo en-US agregado al canonical pattern; rule 6 reforzada | El ejemplo "Profitable Candle Maker" ilustra explícitamente la diversidad de crafts requerida (5 bumps, 5 categorías distintas). Rule 6 amplíada con sentencia de fallo explícita para prevenir clustering en el mismo sub-nicho. |

### Decisiones descartadas

- **Limitar `count_to_generate` a 2 porque el usuario solo puede seleccionar 2:** descartado — el prompt genera hasta 5 candidatos para que el usuario elija. La restricción de selección máxima (2) la aplica la UI, no el prompt. Más candidatos = mejor elección.
- **Incluir `description` del bump en el output:** descartado — mismo criterio que bonuses. La descripción y el complement pertenecen a `suggest-package`. Este prompt solo genera títulos.
- **Agregar `adjacent_themes: string[]` como input opcional:** evaluado para controlar la diversidad en nichos estrechos. Descartado en v1.0 — el modelo infiere bien los adyacentes desde `ebook_title` y `topic`. Evaluar en producción si la calidad lo justifica.
- **Prompt unificado bonus+bump:** se evaluó un prompt único que generara ambos. Descartado — son semánticas radicalmente distintas (bonus = extensión del mismo tema; bump = tema adyacente). Un prompt unificado haría el system más largo y confuso, con mayor riesgo de mezcla semántica.

### Próximos experimentos

- [ ] Testear temperatura `0.7` vs `0.6` — ¿más creatividad lateral o mayor riesgo de temas inconexos?
- [ ] Evaluar si el modelo confunde bumps con bonuses en ciertos nichos y si el bloque de patrón canónico en el system lo corrige. Medir tasa de error en producción.
- [ ] Testear si pasar el `avatar` completo (JSON de `optimize-avatar`) mejora la relevancia de los bumps adyacentes vs. usar solo `avatar_summary`.
- [ ] Evaluar agregar `adjacent_themes: string[]` como input opcional para temas donde la adyacencia no es obvia.
- [ ] Testear en `en-GB` para verificar diferencia de registro respecto a `en-US`.

### Problemas conocidos en producción

- _Ninguno registrado._
