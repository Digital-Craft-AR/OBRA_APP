# optimize-problem — Expande descripción cruda del problema en estructura de promesa transformacional

**Ruta:** `prompts/wizard/optimize-problem.md`  
**Implementación:** `obra/src/lib/prompts.ts` → función `optimizeProblemPrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Avatar + problem (single step)  
**Estado:** `draft`  
**Última revisión:** 2026-04-06

---

## 1. Objetivo

Toma el texto crudo que el creador escribe en el campo "problema que resuelve mi producto" y lo convierte en una estructura de problema completa — con sub-problemas concretos, una transformación visceral (de estado A → estado B), y el argumento de urgencia — usando el topic y el perfil de avatar ya generados como contexto para máxima especificidad.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` del output de `optimize-topic`; ancla el problema al nicho del producto |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar`, serializado como string JSON; provee el contexto de la persona real |
| `{raw_input}` | `string` | ✅ | Texto crudo del creador describiendo el problema que su producto resuelve |

**Conectividad de pipeline:**
- `{topic}` = campo `optimized_title` del output de `optimizeTopicPrompt()`
- `{avatar}` = output completo de `optimizeAvatarPrompt()`, serializado con `JSON.stringify()`
- El output de este prompt se pasa como `{problem}` a `suggestPackagePrompt()`

**Nota de implementación:** Si `{avatar}` contiene el campo `"error"`, no llamar a este prompt — el wizard debe resolver el avatar antes de continuar.

---

## 3. Output esperado

**Tipo de output:** JSON  
**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt

### Schema con ejemplo real

```json
{
  "core_problem": "No tiene un sistema para fijar precios que cubra costos reales, genere ganancia, y no aleje clientes — entonces trabaja a pérdida sin darse cuenta.",
  "sub_problems": [
    "Calcula el precio por intuición comparándose con la competencia más barata, sin incluir su tiempo ni costos indirectos",
    "No lleva registro de costos reales, entonces no puede saber si está ganando o perdiendo por vela",
    "Cuando le dicen 'está caro' cede automáticamente, porque no tiene argumentos sólidos para defender su precio"
  ],
  "transformation": {
    "from": "Artesana que trabaja muchas horas sin saber si tiene un negocio o un hobby caro",
    "to": "Emprendedora que calcula, justifica y cobra sus precios con confianza, y sabe exactamente cuánto gana por cada vela"
  },
  "urgency": "Cada semana que vende a precio incorrecto refuerza el hábito de cobrar barato y educa a sus clientes a esperar ese precio. Cuanto más espera, más difícil es corregirlo."
}
```

**Restricciones de longitud:**
- `core_problem`: max 200 caracteres (1-2 oraciones)
- Cada string en `sub_problems`: max 160 caracteres
- `transformation.from` y `transformation.to`: max 160 caracteres cada uno
- `urgency`: max 200 caracteres (2-3 oraciones breves)

**Restricciones de conteo estrictas:**
- `sub_problems`: exactamente 3 strings

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
| **Temperatura** | `0.5` | Balance entre especificidad (los sub-problemas deben ser concretos) y variedad (evitar outputs idénticos entre proyectos similares) |
| **max_tokens** | `700` | El JSON completo ronda los 400-450 tokens; margen para transformaciones más elaboradas |
| **Modelo** | `claude-sonnet-4-6` | Requiere síntesis del avatar para generar sub-problemas relevantes a esa persona específica |

---

## 5. System prompt

_`{content_locale}` se interpola en `prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: transform a raw problem description into a structured problem statement that drives compelling content — grounded in the specific avatar and topic provided.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Rules:
1. core_problem: must name the specific mechanism of pain, not just the symptom. Ground it in the avatar's reality from the provided profile. Not "doesn't know how to sell" but "no tiene sistema para fijar precios que cubra costos y genere ganancia".
2. sub_problems: exactly 3. Each must be a concrete, observable manifestation of the core problem in this avatar's daily life. Never abstract ("doesn't understand the market") — always specific ("Calcula precios comparándose con la competencia más barata, sin incluir su tiempo").
3. transformation: visceral and specific. from = the current lived state, not a generic descriptor. to = the concrete new capability or feeling, not "success". Avoid corporate language.
4. urgency: honest reasoning, not manufactured pressure. Answer: why does waiting make it specifically worse for this person? Ground it in their situation.
5. Length: core_problem max 200 chars. Each sub_problem max 160 chars. transformation.from/to max 160 chars each. urgency max 200 chars.
6. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: topic or raw_input is empty | input is off-topic or incomprehensible.

Example (es):
Input: topic="Velas artesanales: sistema de precios" raw="no sé cómo poner precios y cobro poco" avatar=(artesana, 25-45 años, LATAM, pain: precios/ventas/competencia)
{"core_problem":"No tiene sistema para fijar precios que cubra costos y genere ganancia — trabaja a pérdida sin darse cuenta.","sub_problems":["Calcula precios por intuición comparándose con la competencia más barata, sin incluir su tiempo","No lleva registro de costos, no puede saber si gana o pierde por vela","Cuando le dicen 'está caro' cede porque no sabe defender su precio"],"transformation":{"from":"Artesana que trabaja muchas horas sin saber si tiene negocio o hobby caro","to":"Emprendedora que cobra con confianza y sabe exactamente cuánto gana por vela"},"urgency":"Cada semana a precio incorrecto educa al cliente a esperar ese precio — corregirlo después es mucho más difícil."}
```

---

## 6. User prompt template

```
Topic: {topic}
Avatar profile: {avatar}
Problem description (raw): {raw_input}

Expand the problem statement into the complete structure.
```

**Notas de implementación en `prompts.ts`:**
- Si `topic` está vacío, **no llamar al prompt** — validar en UI antes de la llamada
- Si `raw_input` está vacío, **no llamar al prompt** — el campo es requerido en el wizard
- `{avatar}` se pasa como `JSON.stringify(avatarObject)` — el objeto completo, no solo la descripción
- Si `{avatar}` contiene `"error"`, resolver el avatar primero
- El output completo de este prompt se pasa como `{problem}` a `suggestPackagePrompt()`

---

## 7. Ejemplos few-shot

_Los tres ejemplos usan los mismos "personajes" establecidos en `optimize-avatar` para demostrar coherencia de pipeline. El `{avatar}` se muestra abreviado para legibilidad — en producción se pasa el JSON completo._

---

### Ejemplo 1 — Input directo en `es`

**Variables de input:**
```
content_locale: "es"
topic: "Velas aromáticas artesanales: cómo crear y vender las que la gente busca"
avatar: {
  "description": "Artesana que fabrica velas en casa con amor y dedicación...",
  "demographics": { "age_range": "25-45 años", "gender": "femenino", "location": "LATAM", "socioeconomic": "Clase media o media-baja" },
  "pains": ["No sabe cómo poner precio a sus velas...", "Sus ventas son inconsistentes...", "Le cuesta diferenciarse..."],
  "desires": ["Tener ingresos predecibles de $300–500 USD al mes...", ...],
  "objections": [...]
}
raw_input: "no sé cómo poner precios y siempre cobro poco"
```

**Output esperado:**
```json
{
  "core_problem": "No tiene un sistema para fijar precios que cubra costos reales, genere ganancia, y no aleje clientes — entonces trabaja a pérdida sin darse cuenta.",
  "sub_problems": [
    "Calcula el precio por intuición comparándose con la competencia más barata, sin incluir su tiempo ni costos indirectos",
    "No lleva registro de sus costos reales, entonces no puede saber si está ganando o perdiendo por vela",
    "Cuando alguien le dice 'está caro' cede automáticamente, porque no tiene argumentos sólidos para defender su precio"
  ],
  "transformation": {
    "from": "Artesana que trabaja muchas horas sin saber si tiene un negocio o un hobby caro",
    "to": "Emprendedora que calcula, justifica y cobra sus precios con confianza, y sabe exactamente cuánto gana por cada vela"
  },
  "urgency": "Cada semana que vende a precio incorrecto refuerza el hábito de cobrar barato y educa a sus clientes a esperar ese precio. Cuanto más espera, más difícil es corregirlo."
}
```

**Por qué es el caso base:** Input claro y específico ("no sé cómo poner precios"). Verifica que el modelo usa el avatar para hacer los sub-problemas concretos a esta persona (no a un vendedor genérico) y que la transformación es visceral, no corporativa.

---

### Ejemplo 2 — Input en `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações"
avatar: {
  "description": "Mãe que fabrica produtos artesanais em casa e tenta transformar sua paixão em uma renda real...",
  "demographics": { "age_range": "28-45 anos", "gender": "feminino", "location": "Brasil, cidades de médio e grande porte", "socioeconomic": "Classe média" },
  "pains": ["Publica no Instagram mas só quem já a conhece compra...", "Não tem tempo para aprender marketing...", "Cobra barato..."],
  "desires": [...],
  "objections": [...]
}
raw_input: "não consigo alcançar clientes novos, só quem me conhece compra"
```

**Output esperado:**
```json
{
  "core_problem": "Seu negócio depende de quem já a conhece — sem indicações, as vendas param. Não tem sistema para chegar em clientes novos sem depender da sorte.",
  "sub_problems": [
    "O conteúdo que posta no Instagram não alcança quem não a segue, e ela não sabe como mudar isso",
    "Não sabe como se apresentar para estranhos sem parecer invasiva ou desesperada para vender",
    "Cada cliente novo que consegue vem de indicação — processo que não escala e que ela não controla"
  ],
  "transformation": {
    "from": "Artesã cujo negócio existe dentro da bolha de quem já a conhece pessoalmente",
    "to": "Empreendedora com um sistema previsível para atrair clientes novos toda semana, sem depender de indicações"
  },
  "urgency": "Enquanto espera, concorrentes com produto inferior mas presença digital forte conquistam os clientes que deveriam ser dela. Cada mês sem sistema é mercado cedido."
}
```

**Por qué es útil:** Verifica que el modelo conecta el problema de alcance en Instagram (del pain del avatar) con el `raw_input` del creador para generar sub-problemas específicos a ese canal. También verifica pt-BR genuino en la urgency.

---

### Ejemplo 3 — Input detallado en `en-US`

**Variables de input:**
```
content_locale: "en-US"
topic: "Mindfulness without the woo: a practical guide for skeptical, busy people"
avatar: {
  "description": "A high-achieving woman in her 30s who knows she needs to slow down but gets turned off every time meditation content sounds too spiritual...",
  "demographics": { "age_range": "28-42 years old", "gender": "female", "location": "Urban, English-speaking markets", "socioeconomic": "Middle to upper-middle class" },
  "pains": ["Every meditation resource she tries uses words like 'chakras'...", "She's tried meditating but her mind wouldn't stop...", "Chronic stress is affecting her sleep..."],
  "desires": [...],
  "objections": [...]
}
raw_input: "I've tried meditating but my mind never stops and I feel like I'm doing it wrong"
```

**Output esperado:**
```json
{
  "core_problem": "She tried meditation, decided her mind is 'too busy' for it, and gave up — without knowing that a racing mind during meditation is completely normal and expected.",
  "sub_problems": [
    "Every guide tells her to 'clear her mind' or 'let thoughts pass,' but no one explains what to actually do when that consistently fails",
    "She's tried apps, YouTube videos, and guided sessions, but without scientific context she can't tell what's working or if she's doing it right",
    "Chronic stress keeps compounding because she abandoned the one accessible tool that could help, based on a misunderstanding about how the practice works"
  ],
  "transformation": {
    "from": "Skeptic who believes she's neurologically unsuited for meditation because her mind won't stop",
    "to": "Practitioner who understands that a busy mind is the raw material — not the obstacle — and meditates consistently as a result"
  },
  "urgency": "Every month without a stress-management practice compounds the cognitive and physical effects she already feels. She knows this but feels stuck without an approach that fits her personality."
}
```

**Por qué es útil:** Input rico que incluye el comportamiento ("tried", "feels like doing it wrong"). Verifica que el `core_problem` captura la creencia errónea (mente ocupada = no sirvo para meditar) como el problema central real, no el síntoma superficial.

---

## 8. Casos límite

| Caso | Descripción del input | Output esperado |
|------|-----------------------|-----------------|
| `raw_input` vacío | `""` o solo espacios | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de la llamada |
| **`topic` vacío** | `topic: ""` o ausente | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de la llamada |
| **`avatar` vacío o con error** | `avatar: "{}"` o contiene `"error"` | No llamar al prompt — resolver el avatar primero |
| `raw_input` fuera de scope | `"no tengo problemas con mi negocio"` | `{"error":"INVALID_INPUT","reason":"..."}` |
| Input en idioma distinto al locale | `content_locale: "es"`, `raw_input: "I don't know how to price my products"` | Output completo en `es` |
| Problema muy genérico | `raw_input: "quiero ganar más plata"` | Generar igualmente usando el avatar + topic para hacerlo específico; el modelo debe inferir el mecanismo concreto |
| Avatar en locale distinto al del proyecto | Avatar generado en `es` pero `content_locale: "pt-BR"` para este prompt | Output en `pt-BR`; el modelo cross-traduce el contexto del avatar |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-06 | v1.0 | Versión inicial | Tercer prompt del pipeline del wizard |

### Decisiones descartadas

- **`sub_problems` variable (2-4 items):** se evaluó permitir flexibilidad en el conteo. Descartado: exactamente 3 mantiene coherencia con los 3 `pains` del avatar y facilita la UI (no hay que manejar longitudes variables).
- **Campo `severity: "high" | "medium" | "low"` por sub-problema:** para priorizar visualmente en la UI. Descartado en v1.0 por complejidad; los sub-problemas deberían ordenarse de mayor a menor impacto en el prompt.
- **Pasar solo `avatar.pains` y `avatar.description` en lugar del JSON completo:** para reducir tokens. Evaluado pero descartado: `demographics` y `desires` también ayudan al modelo a entender la urgencia y la transformación. El costo extra de tokens es justificado.

### Próximos experimentos

- [ ] Evaluar si ordenar `sub_problems` de mayor a menor impacto (instructing the model explicitly) mejora la estructura del infoproducto downstream
- [ ] Testear si pasar el `angle` del topic (de `optimize-topic`) como variable ayuda a ajustar el tono de la urgencia (urgencia emocional vs racional)
- [ ] Medir si temperatura `0.4` produce sub-problemas más acotados y precisos, o si pierde variedad necesaria entre proyectos del mismo nicho

### Problemas conocidos en producción

- _Ninguno registrado._
