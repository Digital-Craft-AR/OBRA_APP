# optimize-topic — Transforma descripción cruda del tema en framing de producto listo para venta

**Ruta:** `prompts/wizard/optimize-topic.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `optimizeTopicPrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Topic  
**Estado:** `draft`  
**Última revisión:** 2026-04-06

---

## 1. Objetivo

Transforma el texto crudo que el creador escribe en el primer campo del wizard ("velas aromaticas", "meditacion para principiantes") en un framing del tema claro, específico y orientado a la venta, que va a anclar todos los prompts posteriores del flujo.

---

## 2. Inputs


| Variable           | Tipo     | Requerido | Descripción                                                                         |
| ------------------ | -------- | --------- | ----------------------------------------------------------------------------------- |
| `{content_locale}` | `"es"    | "pt-BR"   | "en-US"                                                                             |
| `{raw_input}`      | `string` | ✅         | Texto crudo del creador describiendo el tema; puede ser tan breve como 1-2 palabras |


*Este es el primer prompt del pipeline. No recibe `{topic}` porque él mismo lo genera. Su output (`optimized_title`) se usa como `{topic}` en los prompts siguientes.*

---

## 3. Output esperado

**Tipo de output:** JSON  
**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt

### Schema con ejemplo real

```json
{
  "optimized_title": "Velas aromáticas artesanales: cómo crear y vender las que la gente busca",
  "description": "Guía práctica para fabricar velas de calidad con materiales accesibles, elegir fragancias con demanda real de mercado, y construir una marca propia que se diferencia de lo masivo. Pensada para artesanas que quieren convertir su habilidad en un ingreso rentable.",
  "niche": "Fabricación y venta de velas aromáticas artesanales",
  "angle": "technical"
}
```

**Restricciones de longitud:**

- `optimized_title`: max 120 caracteres
- `description`: max 400 caracteres (2-3 oraciones)
- `niche`: max 80 caracteres
- `angle`: enum fijo en inglés, siempre minúsculas — `"technical"` | `"aspirational"` | `"emotional"` | `"mixed"`

**Nota sobre `angle`:** es un valor code-facing, no user-facing. Siempre en inglés, independientemente del `content_locale`. Lo usa el sistema para orientar el tono de los prompts de capítulos e imágenes.

### Schema de error

```json
{
  "error": "INVALID_INPUT",
  "reason": "Razón breve en {content_locale}"
}
```

---

## 4. Parámetros de modelo


| Parámetro       | Valor recomendado   | Razón                                                                          |
| --------------- | ------------------- | ------------------------------------------------------------------------------ |
| **Temperatura** | `0.5`               | Variedad suficiente para proponer un título atractivo sin perder especificidad |
| **max_tokens**  | `500`               | El JSON completo ronda los 200-250 tokens; margen para descripciones largas    |
| **Modelo**      | `claude-sonnet-4-6` | Requiere buen juicio para convertir input mínimo en framing de calidad         |


---

## 5. System prompt

*`{content_locale}` se interpola en `_shared/prompts.ts` antes de enviar al modelo.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: transform a raw topic description into a sharp, sales-ready framing that anchors all downstream content generation — index, chapters, bonuses, and image prompts.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Rules:
1. optimized_title: specific and benefit-forward. Never vague ("Todo sobre X", "Everything About Y") or clickbait ("El secreto que nadie te dice"). Clear, honest, and compelling in {content_locale}.
2. niche: always more specific than the raw input. Adds who it's for or what type of application (e.g. "meditación" → "meditación secular basada en evidencia para personas analíticas").
3. angle: infer from the topic's core promise — "technical" (methodology, steps, how-to), "aspirational" (income, lifestyle, growth, business), "emotional" (wellbeing, healing, overcoming fear, relationships), "mixed" (clear combination). Always lowercase. Always in English regardless of locale.
4. Length: optimized_title max 120 chars. description max 400 chars (2–3 sentences). niche max 80 chars.
5. Off-topic, inappropriate, or incomprehensible input: return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"}

Example (es):
Input: raw="velas aromaticas"
{"optimized_title":"Velas aromáticas artesanales: cómo crear y vender las que la gente busca","description":"Guía para fabricar velas de calidad, elegir fragancias con demanda real y construir una marca propia. Para quien quiere convertir este hobby en un ingreso concreto.","niche":"Fabricación y venta de velas aromáticas artesanales","angle":"technical"}
```

---

## 6. User prompt template

```
Raw topic: {raw_input}

Generate the optimized topic framing.
```

**Notas de implementación en `_shared/prompts.ts`:**

- Si `raw_input` está vacío, **no llamar al prompt** — validar en UI antes. El system retornará `INVALID_INPUT` de todas formas, pero es mejor fallar antes de consumir tokens
- El `optimized_title` del output se almacena como el campo `topic` del proyecto y se pasa como `{topic}` a los prompts posteriores (`optimize-avatar`, `optimize-problem`, `suggest-package`)
- No limpiar ni normalizar `raw_input` antes de pasarlo — el modelo maneja mejor el texto crudo

---

## 7. Ejemplos few-shot

*Estos tres ejemplos son los casos de test canónicos para `optimizeTopicPrompt()` en `_shared/prompts.ts`. Usan los mismos "personajes" que los ejemplos de `optimize-avatar` para mantener coherencia de pipeline.*

---

### Ejemplo 1 — Input vago en `es`

**Variables de input:**

```
content_locale: "es"
raw_input: "velas aromaticas"
```

**Output esperado:**

```json
{
  "optimized_title": "Velas aromáticas artesanales: cómo crear y vender las que la gente busca",
  "description": "Guía práctica para fabricar velas de calidad con materiales accesibles, elegir fragancias con demanda real de mercado, y construir una marca propia que se diferencia de lo masivo. Pensada para artesanas que quieren convertir su habilidad en un ingreso rentable.",
  "niche": "Fabricación y venta de velas aromáticas artesanales",
  "angle": "technical"
}
```

**Por qué es el caso base:** Input de 2 palabras — el mínimo funcional. Verifica que el modelo enriquece el tema con la dimensión de negocio ("vender") sin inventar nada que el input no permita inferir. El `angle: "technical"` refleja que el foco es el cómo (fabricar + vender), no el lifestyle.

---

### Ejemplo 2 — Input medio en `pt-BR`

**Variables de input:**

```
content_locale: "pt-BR"
raw_input: "marketing digital para artesãos"
```

**Output esperado:**

```json
{
  "optimized_title": "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações",
  "description": "Estratégias práticas de presença online para artesãs que querem crescer além do círculo de conhecidos. Do perfil do Instagram ao primeiro cliente fora da rede pessoal, com ações que cabem na rotina de quem também faz os produtos.",
  "niche": "Marketing digital para criadoras e vendedoras de produtos artesanais",
  "angle": "aspirational"
}
```

**Por qué es útil:** Verifica pt-BR genuino y que el modelo identifica el `angle: "aspirational"` — el tema no es técnico de producción sino de crecimiento de negocio. También verifica que `niche` agrega la dimensión de género ("criadoras") que el input implica contextualmente.

---

### Ejemplo 3 — Input específico en `en-US`

**Variables de input:**

```
content_locale: "en-US"
raw_input: "mindfulness for people who hate meditation"
```

**Output esperado:**

```json
{
  "optimized_title": "Mindfulness without the woo: a practical guide for skeptical, busy people",
  "description": "A science-backed approach to mindfulness for people who roll their eyes at 'chakras' and 'vibrations.' Covers evidence-based techniques that work in under 15 minutes a day — no spiritual jargon, no sitting still for an hour.",
  "niche": "Secular, science-based mindfulness for analytical and skeptical personalities",
  "angle": "emotional"
}
```

**Por qué es útil:** Input rico en posicionamiento ("people who hate meditation"). Verifica que el modelo captura ese ángulo anti-jargon como el diferencial clave del producto, y lo refleja en `optimized_title` y `niche`. El `angle: "emotional"` refleja que el beneficio central es alivio del estrés y superar la resistencia emocional a la práctica.

---

## 8. Casos límite


| Caso                                   | Descripción del input                                | Output esperado                                                                                                               |
| -------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `raw_input` vacío                      | `""` o solo espacios                                 | `{"error":"INVALID_INPUT","reason":"Necesito que describas el tema de tu infoproducto."}` — validar en UI antes de la llamada |
| Input = actividad ilegal o inapropiada | `"cómo hackear cuentas"`                             | `{"error":"INVALID_INPUT","reason":"..."}`                                                                                    |
| Input fuera del scope de infoproductos | `"quiero organizar mis compras del supermercado"`    | `{"error":"INVALID_INPUT","reason":"Obra está diseñado para infoproductos educativos y de desarrollo profesional."}`          |
| Input en idioma distinto al locale     | `content_locale: "es"`, `raw_input: "candle making"` | Output completo en `es`, ignorar idioma del input                                                                             |
| Input muy largo (>500 chars)           | Descripción extensa del tema                         | Procesar normalmente; el modelo toma la esencia y la destila                                                                  |
| Input con múltiples temas mezclados    | `"nutrición y yoga y meditación"`                    | Elegir el eje más fuerte o proponer un `niche` que los conecte; no generar múltiples outputs                                  |


---

## 9. Notas de iteración

### Historial


| Fecha      | Versión | Cambio          | Razón                                 |
| ---------- | ------- | --------------- | ------------------------------------- |
| 2026-04-06 | v1.0    | Versión inicial | Primer prompt del pipeline del wizard |


### Decisiones descartadas

- `**angle` en el locale del output:** se evaluó devolver "técnico" (con tilde en es) para que sea user-facing. Descartado: es un valor code-facing que el sistema usa para orientar prompts posteriores; tenerlo en inglés sin tilde simplifica el parsing y evita variaciones tipográficas.
- **Devolver múltiples títulos (como `suggest-main-titles`):** se evaluó que este prompt devuelva 3-5 opciones de título. Descartado: el objetivo de `optimize-topic` es generar el framing base del proyecto (niche, angle), no las alternativas de título para el ebook — eso es responsabilidad de `suggest-main-titles`. Responsabilidades separadas.
- **Flag de "primera aproximación" para inputs ≤ 3 palabras:** aplicado en `optimize-avatar` pero no aquí. Descartado: el enriquecimiento de un tema breve es exactamente el propósito de este prompt. "velas" es un input válido, no un caso degradado.

### Próximos experimentos

- Evaluar si pasar `angle` como input opcional al prompt de `generate-chapter-body` mejora la consistencia de voz en el contenido
- Testear si agregar un campo `target_audience_hint` al output (e.g. "mujeres emprendedoras LATAM") mejora la coherencia con `optimize-avatar` cuando el modelo lo usa como contexto
- Medir si temperatura `0.4` reduce la variación excesiva en `optimized_title` sin sacrificar calidad

### Problemas conocidos en producción

- *Ninguno registrado.*

