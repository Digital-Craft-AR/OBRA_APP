# generate-all-bonus-section-index — Genera los títulos de sección de todos los bonuses en un único llamado

**Ruta:** `prompts/content/generate-all-bonus-section-index.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateAllBonusSectionIndexPrompt()`  
**Edge entry:** `supabase/functions/ai-generate-all-bonus-index/index.ts`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md` — §Bonuses  
**Estado:** `production`  
**Última revisión:** 2026-04-29

---

## 1. Objetivo

Genera en **un único llamado a Claude** los títulos de sección de **todos los bonuses del paquete**, enviando todos los títulos de los productos bonus juntos para que el modelo tenga contexto completo y pueda garantizar que los títulos de sección no se repitan entre bonuses.

Este prompt reemplaza el uso iterativo de `generateBonusSectionIndexPrompt` (que se llamaba N veces, una por bonus) cuando el usuario presiona "Generar" o "Regenerar" en la vista de bonus del wizard de contenido.

Cada output es equivalente al de `generateBonusSectionIndexPrompt` — un objeto `chapters` con exactamente 1 entrada — pero agrupados en un array `bonuses` de longitud igual a la cantidad de bonuses del proyecto.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` de `optimize-topic` |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar` |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem` |
| `{main_ebook_title}` | `string` | ✅ | `projects.main_title` |
| `{bonus_titles}` | `string[]` | ✅ | Array de `ebooks.title` por bonus, en orden de `package_ordinal` |
| `{tone}` | `ContentTone` | ✅ | Tono del paquete (`design_config.contentTone`) |

**Conectividad de pipeline:**

- Llamado desde `ai-generate-all-bonus-index` con todos los bonus ebook IDs del proyecto
- El edge function guarda `index_json` por ebook y devuelve un array de `{ ebook_id, chapters }` al cliente
- El cliente actualiza el estado de todos los bonus TOCs de una vez

---

## 3. Output esperado

**Tipo de output:** JSON  

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.
```

### Schema con ejemplo real (2 bonuses)

```json
{
  "bonuses": [
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
    },
    {
      "chapters": [
        {
          "number": 1,
          "title": "Las 12 objeciones de precio más comunes y cómo responder cada una sin ceder",
          "description": "Scripts listos para usar ante las objeciones más frecuentes: precio alto, comparación con competidores, pedidos de descuento.",
          "key_concepts": [
            "Las 4 categorías de objeción de precio y su lógica",
            "La estructura del script: reconocer, reencuadrar, cerrar",
            "Cuándo negociar tiene sentido y cuándo no"
          ],
          "word_count_target": 900
        }
      ]
    }
  ]
}
```

**Restricciones:**

- `bonuses.length` == `bonus_titles.length` (exactamente, mismo orden)
- Cada `bonuses[i].chapters`: exactamente **1** item con `number: 1`
- `chapters[0].title`: max **90 caracteres** — específico y benefit-forward; ≠ copia del bonus_product_title
- `chapters[0].description`: max **280 caracteres**
- `chapters[0].key_concepts`: entre **2 y 4** strings, max **130 caracteres** cada uno
- `word_count_target`: siempre **900** (fijo)
- **Unicidad**: cada título de sección debe ser distinto de los demás en el array

---

## 4. Parámetros de modelo

| Parámetro | Valor | Razón |
|-----------|:-----:|-------|
| **max_tokens** | `512 × N + 512` | ~512 tokens por sección + buffer; escalado dinámico |
| **Modelo** | `claude-sonnet-4-6` (default) | Necesita coherencia entre todos los bonuses simultáneamente |

---

## 5. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-29 | v1.0 | Implementación inicial | Fix bug #213: títulos de sección repetidos entre bonuses generados por separado |

### Decisiones tomadas

- **Un solo llamado a Claude para todos los bonuses:** Evita el problema de repetición que ocurría al generar cada bonus de forma independiente. El modelo ve todos los títulos de producto bonus juntos y puede garantizar unicidad en los títulos de sección.
- **Mantener el costo de créditos igual al total de llamadas individuales:** `totalCost = costPerBonus × N`. El usuario paga lo mismo, el sistema hace menos llamadas.
- **Idempotency key por `clientRequestId` del proyecto, no por ebook:** Una sola transacción de créditos para el batch completo.
- **Compatibilidad con `generateBonusSectionIndexPrompt`:** El output por bonus es idéntico al individual. El edge function guarda `index_json` con el mismo schema.
