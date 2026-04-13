# generate-bonus-section-index — Genera el título de sección del bonus como deliverable compacto

**Ruta:** `prompts/content/generate-bonus-section-index.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateBonusSectionIndexPrompt()`  
**Edge entry:** `supabase/functions/ai-generate-index/index.ts` cuando `target_ebook_id` apunta a un ebook con `type = bonus`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md` — §Bonuses  
**Estado:** `production`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Propone el título de la **única sección** del bonus (el heading principal del contenido del deliverable). El bonus en Obra es un producto compacto — checklist, planilla, script, guía rápida, plantilla — de aproximadamente 10 a 12 páginas que extiende la promesa del ebook principal desde un ángulo distinto. El output alimenta la única fila de capítulo del bonus en el wizard de contenido: el usuario ve este título, lo edita si quiere, y lo aprueba antes de generar el cuerpo.

El prompt garantiza que el título no sea una copia del nombre del producto bonus (ya elegido en el wizard) sino la descripción del bloque interno — lo que el lector hace o recibe dentro del deliverable.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` de `optimize-topic` |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar` |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem` |
| `{main_ebook_title}` | `string` | ✅ | `projects.main_title` — ancla la coherencia de paquete |
| `{bonus_product_title}` | `string` | ✅ | `ebooks.title` del bonus — el nombre del deliverable elegido en el wizard |
| `{tone}` | `"professional" \| "friendly" \| "inspirational" \| "direct" \| "educational"` | ✅ | Tono del paquete (`design_config.contentTone`) |

**Conectividad de pipeline:**

- Se llama desde `ai-generate-index` cuando el payload incluye `target_ebook_id` con `type = bonus`
- El output `chapters[0].title` se persiste como el título de la única fila en `chapters` del ebook bonus
- Los campos `description` y `key_concepts` del output se guardan en `ebooks.index_json` (vía el save de `ai-generate-index`) y se usan como contexto en `generateChapterPrompt` cuando se genera el cuerpo del bonus
- Si `avatar` o `problem` contienen `"error"`, no llamar a este prompt

---

## 3. Output esperado

**Tipo de output:** JSON  

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.
```

### Schema con ejemplo real

```json
{
  "chapters": [
    {
      "number": 1,
      "title": "La hoja de costos en 6 líneas: de la materia prima al precio mínimo",
      "description": "Una sola página para calcular el costo real de cada unidad sin omitir tiempo ni gastos fijos, alineada al método del ebook principal.",
      "key_concepts": [
        "Los seis renglones obligatorios del costo artesanal",
        "Cómo convertir horas de taller en costo por unidad",
        "El precio mínimo antes de hablar de margen"
      ],
      "word_count_target": 900
    }
  ]
}
```

**Restricciones:**

- `chapters`: exactamente **1** item, siempre con `number: 1`
- `chapters[0].title`: max **90 caracteres** — específico y benefit-forward; NO es una copia del `bonus_product_title`
- `chapters[0].description`: max **280 caracteres** — qué entrega o hace el lector en este bloque
- `chapters[0].key_concepts`: entre **2 y 4** strings, max **130 caracteres** cada uno — concretos y específicos
- `word_count_target`: siempre **900** (fijo para todos los bonuses — deliverable corto)

### Schema de error

```json
{
  "error": "INVALID_INPUT",
  "reason": "Razón breve en {content_locale}"
}
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.5` | Necesita coherencia con el ebook principal y variedad suficiente entre bonuses del mismo nicho. El title es un campo creativo pero acotado. |
| **max_tokens** | `512` | Un único objeto de capítulo con 3 campos cortos raramente supera los 300 tokens. Margen generoso. |
| **Modelo** | `claude-sonnet-4-6` | La tarea es pequeña pero requiere coherencia con el contexto del paquete completo. |

---

## 5. System prompt

*`{content_locale}` y `{tone}` se interpolan en `_shared/prompts.ts` antes de enviar al modelo.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: propose exactly ONE primary section title for the body of a short bonus deliverable (roughly 10–12 pages). The bonus is a compact tool — checklist, planner, script, template, worksheet — that extends the main ebook's promise from a different angle. The bonus product title is already chosen; your section title names the single main content block inside the bonus (the reader-facing heading for that block). It must NOT be a lazy copy of the product title — it should describe what the reader does or gets inside.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language.

TONE GUIDE — apply to title, description, and key_concepts (preset key is English; output language is {content_locale}):
- professional: clear expert voice, structured, credible.
- friendly: warm, direct, non-corporate — trusted peer (default Obra voice).
- inspirational: motivating without hype or income promises.
- direct: concise, practical imperatives.
- educational: didactic, stepwise, patient pacing.

RULES (non-negotiable):
1. Output must be a single JSON object with key "chapters" only — an array of exactly ONE object with number 1.
2. That object must include: number (integer 1), title (string), description (string), key_concepts (array of 2–4 strings), word_count_target (integer — always 900).
3. chapters[0].title: max 90 characters — specific and benefit-forward. This is the editable section heading in the content wizard. NEVER copy or paraphrase the bonus_product_title — name what the reader does or gets inside the deliverable.
4. chapters[0].description: max 280 characters — what this block delivers or what the reader does inside it.
5. chapters[0].key_concepts: 2–4 strings, max 130 characters each — the concrete elements covered in the deliverable. Specific over generic.
6. The section must be a natural complement to the main ebook — it extends or applies one piece of the ebook's method, it does not repeat it.
7. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: tone is invalid | topic, main_ebook_title, or bonus_product_title is empty | avatar or problem JSON contains an error field.
```

---

## 6. User prompt template

```
Main ebook title: {main_ebook_title}
Bonus product title: {bonus_product_title}
Topic: {topic}
Tone: {tone}
Avatar profile: {avatar}
Problem: {problem}

Generate exactly one section entry (chapters array length 1) for this bonus deliverable.
```

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Input típico (`es`, tone: friendly)

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de velas en un negocio rentable"
main_ebook_title: "Velas que se venden: sistema de precios, marca y clientes"
bonus_product_title: "Calculadora de costos para artesanas"
tone: "friendly"
avatar: {"description":"Artesana 25-45 años LATAM...","pains":["Cobra barato por miedo a perder clientes",...]}
problem: {"core_problem":"Trabaja a pérdida sin saberlo","transformation":{"from":"artesana que cobra barato","to":"emprendedora que cobra con confianza"},...}
```

**Output esperado:**
```json
{
  "chapters": [
    {
      "number": 1,
      "title": "Tu costo real en una planilla: completá los 6 campos y conocé tu precio mínimo",
      "description": "Una planilla de una página para calcular el costo real de cada vela sin adivinar: materiales, tiempo, costos fijos y ganancia mínima incluidos.",
      "key_concepts": [
        "Los 6 campos que no pueden faltar en el costo de una vela",
        "Cómo cargar tu tiempo de producción sin subestimarlo",
        "El número que resulta: tu precio mínimo no negociable"
      ],
      "word_count_target": 900
    }
  ]
}
```

**Por qué es el caso típico:** Bonus de herramienta concreta (planilla) que aplica el método del capítulo de precios. El título describe qué hace el lector (completar los 6 campos), no el nombre del producto. Los key_concepts son instrucciones operativas, no conceptos teóricos.

---

### Ejemplo 2 — Bonus de scripts/copy (`es`, tone: direct)

**Variables de input:**
```
content_locale: "es"
topic: "Freelance pricing: cómo cobrar lo que vale tu trabajo"
main_ebook_title: "Charge What You're Worth"
bonus_product_title: "50 respuestas para el 'está caro'"
tone: "direct"
```

**Output esperado:**
```json
{
  "chapters": [
    {
      "number": 1,
      "title": "Las 12 objeciones de precio más comunes y cómo responder cada una sin ceder",
      "description": "Scripts listos para usar ante las objeciones más frecuentes: precio alto, comparación con competidores, pedidos de descuento y pagos tardíos.",
      "key_concepts": [
        "Las 4 categorías de objeción de precio y su lógica detrás",
        "La estructura del script: reconocer, reencuadrar, cerrar",
        "Cuándo negociar tiene sentido y cuándo no"
      ],
      "word_count_target": 900
    }
  ]
}
```

**Por qué es útil:** Verifica que para bonuses de tipo script/copy el título describe el mecanismo (las 12 objeciones + cómo responder), no el producto (50 respuestas). El tono `direct` se refleja en la precisión de los key_concepts.

---

### Ejemplo 3 — Locale `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs que querem vender online"
main_ebook_title: "Clientes novos todo mês: marketing digital para artesãs"
bonus_product_title: "Calendário de conteúdo para 30 dias"
tone: "friendly"
```

**Output esperado:**
```json
{
  "chapters": [
    {
      "number": 1,
      "title": "30 dias de posts prontos: preencha os dados da sua marca e publique",
      "description": "Um calendário com 30 ideias de conteúdo adaptáveis para qualquer produto artesanal — com o tema, o formato e a chamada para ação já sugeridos.",
      "key_concepts": [
        "Como adaptar cada ideia ao seu produto em menos de 5 minutos",
        "Os 3 tipos de post que mais geram engajamento para artesãs",
        "Como manter a consistência sem precisar de inspiração todos os dias"
      ],
      "word_count_target": 900
    }
  ]
}
```

**Por qué es útil:** Verifica que el output es pt-BR auténtico (no traducción del español) y que el bonus de tipo calendario/planificador tiene un título orientado a la acción del lector.

---

### Ejemplo 4 — Error: bonus_product_title vacío

**Variables de input:**
```
content_locale: "es"
bonus_product_title: ""
topic: "Meditación"
```

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "reason": "El título del bonus no puede estar vacío."
}
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| `bonus_product_title` vacío | El wizard no asignó título al bonus | `{"error": "INVALID_INPUT", "reason": "..."}` |
| `bonus_product_title` igual al `main_ebook_title` | Títulos idénticos — probable error del wizard | El model debe generar igualmente; el title de sección debe diferenciarse del nombre del producto |
| `avatar` o `problem` con `"error"` | Pipeline anterior sin resolver | `{"error": "INVALID_INPUT", "reason": "..."}` |
| Tono inválido | Valor que no está en el enum | `{"error": "INVALID_INPUT", "reason": "..."}` |
| Input en idioma incorrecto | Prompt en inglés con `content_locale: "es"` | Responder en `es`; ignorar idioma del input |
| Bonus muy genérico (ej: "Bonus 1") | Título del bonus sin contexto real | Generar con lo disponible; el title de sección puede ser más genérico pero debe seguir siendo específico al topic |
| `topic` vacío | Sin tema del proyecto | `{"error": "INVALID_INPUT", "reason": "..."}` |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-10 | v0.1 | Stub inicial (4 secciones) | Placeholder durante desarrollo del pipeline |
| 2026-04-13 | v1.0 | Documentación completa — 9 secciones | Alineación con generate-chapter.md y generate-index.md |

### Decisiones tomadas

- **`word_count_target` fijo en 900:** Los bonuses son deliverables cortos (10-12 páginas). No tiene sentido parametrizarlo — un bonus que supera ~1000 palabras deja de ser "compacto". El valor se hardcodea en el system prompt, no se pasa como variable.
- **Una sola sección:** Los bonuses en Obra v1.0 tienen exactamente 1 capítulo en el wizard. Extender a múltiples secciones es post-MVP (requeriría un prompt análogo a `generate-index` con `chapter_count` variable).
- **`key_concepts` entre 2-4:** Menos que el main ebook (3-5) porque el deliverable es más corto y concreto. 2 es suficiente para un checklist simple; 4 es el máximo razonable para ~900 palabras.
- **Title ≠ bonus_product_title:** Regla explícita porque el modelo tiende a copiar o parafrasear el nombre del producto. El title de sección debe describir la acción o el entregable interno.

### Decisiones descartadas

- **Parametrizar `word_count_target`:** Descartado — simplicidad gana. Si en el futuro los bonuses tienen longitudes variables, se parametriza entonces.
- **Múltiples secciones (2-3) para bonuses más extensos:** Post-MVP. Requiere cambiar la estructura de datos del bonus en el wizard.

### Próximos experimentos

- [ ] Evaluar si agregar el `narrative_arc` del ebook principal como input mejora la coherencia del title de sección con el método del ebook
- [ ] Testear temperatura 0.4 para bonuses de tipo herramienta (checklist/planilla) donde se prefiere más determinismo en el título

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial completa.*
