# optimize-avatar — Expande descripción cruda de audiencia en perfil de avatar completo

**Ruta:** `prompts/wizard/optimize-avatar.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `optimizeAvatarPrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Avatar + problem (single step)  
**Estado:** `draft`  
**Última revisión:** 2026-04-06

---

## 1. Objetivo

Transforma el texto crudo que el creador escribe en el campo "avatar" del wizard (puede ser tan vago como "mujeres que hacen velas") en un perfil de cliente ideal completo y específico al tema, que va a alimentar todos los prompts posteriores del flujo: índice, capítulos, bonuses, bumps, e imágenes.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro de todo el JSON |
| `{topic}` | `string` | ✅ | Tema del infoproducto; ancla los pains y desires al nicho específico |
| `{raw_input}` | `string` | ✅ | Texto crudo del creador describiendo a su audiencia; puede ser muy breve |

_Este prompt no recibe `{avatar}` porque él mismo lo genera. El `{topic}` es crítico: sin él los pains y desires resultarían genéricos._

---

## 3. Output esperado

**Tipo de output:** JSON  
**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt

### Schema con ejemplo real

```json
{
  "description": "Artesana que fabrica velas en casa con amor y dedicación, pero que todavía no sabe cómo convertir eso en un negocio real. Vende por WhatsApp o en ferias locales, sus precios casi no cubren los materiales, y siente que trabaja mucho sin ver crecimiento. Quiere que su talento le genere ingresos estables sin depender de si misma para todo.",
  "demographics": {
    "age_range": "25-45 años",
    "gender": "femenino",
    "location": "LATAM, principalmente ciudades medianas y grandes o zonas periurbanas",
    "socioeconomic": "Clase media o media-baja; el negocio de velas es un ingreso secundario o complementario"
  },
  "pains": [
    "No sabe cómo poner precio a sus velas: cobra barato por miedo a ahuyentar clientes, pero así no le cierra la ecuación",
    "Sus ventas son inconsistentes — pico en fechas especiales, silencio el resto del mes",
    "Le cuesta diferenciarse de quienes venden velas importadas más baratas por Instagram o Mercado Libre"
  ],
  "desires": [
    "Tener ingresos predecibles de $300–500 USD al mes solo con su taller, sin depender de ferias ni de boca en boca",
    "Construir una marca de velas reconocida que le permita cobrar lo que realmente vale su trabajo artesanal",
    "Trabajar desde casa a su ritmo y que su negocio crezca aunque ella no esté presente produciendo todo el tiempo"
  ],
  "objections": [
    "Soy artesana, no sé de marketing ni de negocios — eso no es lo mío",
    "El mercado de velas ya está saturado, hay demasiada competencia para que yo pueda destacarme"
  ]
}
```

**Restricciones de conteo estrictas:**
- `pains`: exactamente 3 strings
- `desires`: exactamente 3 strings
- `objections`: exactamente 2 strings
- `description`: 2-3 oraciones

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
| **Temperatura** | `0.5` | Balance entre variedad (evitar outputs idénticos) y consistencia (pains/desires acotados al nicho) |
| **max_tokens** | `800` | El JSON completo ronda los 400-500 tokens; margen para casos de description más larga |
| **Modelo** | `claude-sonnet-4-6` | Tarea de complejidad media: requiere inferencia contextual pero no es generación larga |

---

## 5. System prompt

_El system se construye en `_shared/prompts.ts` con `{content_locale}` ya interpolado antes de enviarlo al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: turn a raw audience description into a complete, warm avatar profile that drives all downstream generation — index, chapters, bonuses, and image prompts.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language.

Rules (non-negotiable):
1. Demographics: infer only what the input explicitly or strongly implies. Never fabricate location, income, or specific traits not grounded in the raw input. Use broad, honest ranges for anything uncertain.
2. Pains and desires: specific to the topic + audience combination only. Generic entries ("wants to earn more", "wants to be happy") are not acceptable. Every item must be grounded in the creator's niche.
3. Gender string: use locale-natural terms (es: femenino/masculino/mixto | pt-BR: feminino/masculino/misto | en: female/male/mixed).
4. Short input (3 words or fewer): generate the full profile but begin description with the locale phrase — es: "Esta es una primera aproximación basada en información limitada." / pt-BR: "Este é um perfil inicial baseado em informação limitada." / en-US/en-GB: "This is an initial approximation based on limited information."
5. Tone: warm and direct, not corporate. No "target demographic", "pain points", "value proposition". Write as someone who genuinely knows this person.
6. Length limits: each pain, desire, and objection string: max 180 characters. Description: max 400 characters.
7. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: topic is empty or missing | input is off-topic, inappropriate, or incomprehensible.

Example (es):
Input: topic="Cómo vender velas artesanales y hacerlo rentable" raw="mujeres que hacen velas"
{"description":"Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Vende en ferias y casi no cubre materiales. Quiere ingresos estables con su talento.","demographics":{"age_range":"25-45 años","gender":"femenino","location":"LATAM, ciudades medianas","socioeconomic":"Clase media; velas como ingreso secundario"},"pains":["Cobra barato por miedo a perder clientes pero no le cierra la ecuación","Ventas inconsistentes: pico en fechas especiales, silencio el resto","Le cuesta diferenciarse de velas importadas más baratas"],"desires":["$300–500/mes con su taller sin depender de ferias","Marca reconocida para cobrar lo que realmente vale","Negocio que crezca aunque ella no esté produciendo"],"objections":["Soy artesana, no sé de marketing — eso no es lo mío","Mercado de velas saturado, no creo poder destacarme"]}
```

---

## 6. User prompt template

```
Topic: {topic}
Audience description: {raw_input}

Generate the complete avatar profile. Output exactly 3 pains, 3 desires, 2 objections.
```

**Notas de implementación en `_shared/prompts.ts`:**
- `{content_locale}` se interpola en el system antes de enviarlo — nunca va en el user turn
- Si `topic` está vacío, **no llamar al prompt** — validar en UI antes de la llamada. El system retornará `INVALID_INPUT` de todas formas, pero es mejor fallar antes de consumir tokens
- `raw_input` se pasa tal cual escribe el usuario, sin limpiar ni normalizar
- La Edge `ai-optimize` arma el campo `optimized` como texto multilínea (`description`, líneas de `demographics`, luego cada `pain` / `desire` / `objection` como bloques separados por línea en blanco); ver `supabase/functions/_shared/wizardOptimizeUnifiedText.ts` (`avatarProfileToUnifiedText`). El objeto estructurado sigue en `avatar_profile`.

---

## 7. Ejemplos few-shot

_Estos tres ejemplos son los casos de test canónicos para `optimizeAvatarPrompt()` en `_shared/prompts.ts`._

---

### Ejemplo 1 — Input vago en `es`

**Variables de input:**
```
content_locale: "es"
topic: "Cómo transformar tu hobby de fabricar velas en un negocio rentable desde casa"
raw_input: "mujeres que hacen velas"
```

**Output esperado:**
```json
{
  "description": "Artesana que fabrica velas en casa con amor y dedicación, pero que todavía no sabe cómo convertir eso en un negocio real. Vende por WhatsApp o en ferias locales, sus precios casi no cubren los materiales, y siente que trabaja mucho sin ver crecimiento. Quiere que su talento le genere ingresos estables sin depender de si misma para todo.",
  "demographics": {
    "age_range": "25-45 años",
    "gender": "femenino",
    "location": "LATAM, principalmente ciudades medianas y grandes o zonas periurbanas",
    "socioeconomic": "Clase media o media-baja; el negocio de velas es un ingreso secundario o complementario"
  },
  "pains": [
    "No sabe cómo poner precio a sus velas: cobra barato por miedo a ahuyentar clientes, pero así no le cierra la ecuación",
    "Sus ventas son inconsistentes — pico en fechas especiales, silencio el resto del mes",
    "Le cuesta diferenciarse de quienes venden velas importadas más baratas por Instagram o Mercado Libre"
  ],
  "desires": [
    "Tener ingresos predecibles de $300–500 USD al mes solo con su taller, sin depender de ferias ni de boca en boca",
    "Construir una marca de velas reconocida que le permita cobrar lo que realmente vale su trabajo artesanal",
    "Trabajar desde casa a su ritmo y que su negocio crezca aunque ella no esté presente produciendo todo el tiempo"
  ],
  "objections": [
    "Soy artesana, no sé de marketing ni de negocios — eso no es lo mío",
    "El mercado de velas ya está saturado, hay demasiada competencia para que yo pueda destacarme"
  ]
}
```

**Por qué es el caso base:** Input de 3 palabras — vago pero procesable con el `topic` como ancla. Verifica que el modelo usa el tema para hacer los pains y desires específicos al nicho de velas, y que no inventa datos demográficos más allá de lo que "mujeres" implica. `location` es honestamente amplio porque el input no da más.

---

### Ejemplo 2 — Input medio en `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações"
raw_input: "mães empreendedoras que querem vender produtos artesanais online"
```

**Output esperado:**
```json
{
  "description": "Mãe que fabrica produtos artesanais em casa e tenta transformar sua paixão em uma renda real. Vende pelo Instagram mas o alcance fica limitado aos amigos e familiares — ela sabe que tem produto bom, mas não sabe como chegar em quem ainda não a conhece. Precisa de uma estratégia de marketing que caiba na rotina de quem também cuida de filhos.",
  "demographics": {
    "age_range": "28-45 anos",
    "gender": "feminino",
    "location": "Brasil, cidades de médio e grande porte",
    "socioeconomic": "Classe média; renda do artesanato é complementar ou está tentando se tornar principal"
  },
  "pains": [
    "Publica no Instagram mas só quem já a conhece compra — não consegue alcançar clientes novos de forma consistente",
    "Não tem tempo para aprender marketing enquanto cuida dos filhos, faz os produtos e mantém a casa",
    "Cobra barato com medo de perder clientes, mas com esses preços o negócio não paga nem os materiais"
  ],
  "desires": [
    "Ter uma renda previsível de R$ 2.000–4.000 por mês vendendo o que ela já sabe fazer, sem precisar de mais horas de trabalho",
    "Construir uma presença online que traga clientes novos enquanto ela cuida das outras responsabilidades",
    "Ser reconhecida como referência no seu nicho artesanal e poder cobrar o preço justo pelo seu trabalho"
  ],
  "objections": [
    "Já tentei impulsionar posts no Instagram e não funcionou — acho que marketing digital não é para mim",
    "Não tenho dinheiro para investir em anúncios agora, preciso de algo que funcione de graça primeiro"
  ]
}
```

**Por qué es útil:** Verifica dos cosas a la vez — pt-BR genuino (no traducción del español) y que el modelo diferencia el problema de negocio de esta artesana (alcance en Instagram) del de la vendedora de velas (precio). La `location` infiere "Brasil" del `pt-BR` + el contexto del input.

---

### Ejemplo 3 — Input detallado en `en-US`

**Variables de input:**
```
content_locale: "en-US"
topic: "Practical meditation for busy women: a science-based, no-woo guide"
raw_input: "women in their 30s who want to start a meditation practice but feel intimidated by spiritual jargon"
```

**Output esperado:**
```json
{
  "description": "A high-achieving woman in her 30s who knows she needs to slow down but gets turned off every time meditation content sounds too spiritual or vague. She's tried apps or YouTube videos, stopped when her mind wouldn't stop racing, and now assumes meditation just isn't for her type of brain. She's logical, skeptical, and pressed for time — and she needs evidence before she commits to anything.",
  "demographics": {
    "age_range": "28-42 years old",
    "gender": "female",
    "location": "Urban and suburban areas, English-speaking markets (US, Canada, UK, Australia)",
    "socioeconomic": "Middle to upper-middle class; professional or managerial career, college-educated"
  },
  "pains": [
    "Every meditation resource she tries uses words like 'chakras,' 'vibrations,' or 'universe' that make her dismiss it as pseudoscience before she even starts",
    "She's tried meditating but her mind wouldn't stop — and nobody told her that's completely normal, so she concluded she was doing it wrong",
    "Chronic stress is affecting her sleep, focus, and relationships, but she can't find an approach that respects her rational, evidence-based mindset"
  ],
  "desires": [
    "A simple, science-backed practice she can do in 10 minutes before work — without feeling awkward or like she needs to believe in something",
    "To understand the neuroscience behind why meditation works, so she can commit to it with the same confidence she applies to her career decisions",
    "To reduce anxiety and quiet her racing thoughts in a way that fits her schedule and her personality type"
  ],
  "objections": [
    "I've tried meditation before and it never worked — I literally can't stop thinking, so it's obviously not for me",
    "This feels like something for spiritual or new-age people, not for analytical, skeptical people like me"
  ]
}
```

**Por qué es útil:** Input rico en contexto con edad explícita y motivación emocional clara. Verifica que con más información el perfil gana especificidad sin inventar datos no mencionados. `location` infiere "English-speaking" del `en-US` + el tono del input, pero se mantiene amplio (no inventa "New York").

---

## 8. Casos límite

| Caso | Input | Comportamiento esperado |
|------|-------|-------------------------|
| `raw_input` vacío | `raw_input: ""` | `{"error":"INVALID_INPUT","reason":"Necesito que describas a quién va dirigido tu infoproducto."}` |
| Input ≤ 3 palabras | `raw_input: "emprendedores"` | Generar perfil completo; `description` comienza con `"Esta es una primera aproximación..."` |
| Input ofensivo | Contenido inapropiado o ilegal | `{"error":"INVALID_INPUT","reason":"..."}` |
| Audiencia fuera del scope de Obra | `raw_input: "plomeros que necesitan más clientes"` (sin infoproducto claro) | Intentar generar si el topic lo hace viable; si no es posible, `{"error":"INVALID_INPUT","reason":"..."}` |
| Input en idioma distinto al locale | `content_locale: "es"`, `raw_input: "women who sell candles"` | Output completo en `es`; ignorar el idioma del input |
| **`topic` vacío** | `topic: ""` o ausente | `{"error":"INVALID_INPUT","reason":"Necesito saber el tema de tu infoproducto para crear un perfil de avatar útil."}` — validar en UI antes de la llamada |
| Input muy largo (>300 palabras) | Raw description muy detallada | Procesar normalmente; el JSON resultante de igual longitud — no "resumir" eliminando información valiosa |
| Persona jurídica, no persona física | `raw_input: "empresas que quieren digitalizar sus procesos"` | Generar con `gender: "mixto"` o equivalente en locale; `age_range: "N/A"` si no aplica; ajustar tono a B2B |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-06 | v1.0 | Versión inicial | Primer prompt real del sistema |

### Decisiones descartadas

- **Campo `confidence: 0-1` en el output:** se evaluó agregar un score de confianza para que el frontend muestre un "este perfil puede ser impreciso". Descartado: agrega complejidad en el parsing y el campo `description` con la frase de aproximación (regla 4) cumple el mismo rol de forma más humana.
- **Flag `"assumed": true` en demographics:** se pensó en marcar cada campo demográfico inferido vs. explícito. Descartado: demasiado verbose y la regla de "no inventar" en el system es más efectiva que un flag que el frontend ignoraría.
- **Few-shot dentro del system prompt:** inyectar los 3 ejemplos completos en el system para mejorar precisión. Descartado en v1.0 por costo (triplicaría los tokens de input por llamada). Evaluar en v1.1 si la calidad del output lo justifica.

### Próximos experimentos

- [ ] Testear temperatura `0.4` vs `0.5` — ¿se reduce la variación excesiva en demographics sin perder especificidad en pains/desires?
- [ ] Evaluar agregar campo `"content_angle"` al output: la perspectiva principal que debería tener el ebook para este avatar (e.g. "emocional/aspiracional" vs "técnico/práctico"). Podría alimentar el prompt del índice.
- [ ] Medir si el `topic` vacío degrada el output lo suficiente como para requerirlo obligatoriamente o mostrar un warning en la UI antes de llamar al prompt.
- [ ] Testear en `en-GB` para verificar que el registro se diferencia de `en-US` (más formal, "you" menos coloquial).

### Problemas conocidos en producción

- _Ninguno registrado._
