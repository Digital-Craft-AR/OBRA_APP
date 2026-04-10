# suggest-package — Genera la estructura completa del paquete de infoproducto

**Ruta:** `prompts/wizard/suggest-package.md`  
**Implementación:** `obra/src/lib/prompts.ts` → función `suggestPackagePrompt()`  
**Feature PRD:** `features/wizard-shared/wizard-shared.md` — §Package structure (counts + main title)  
**Estado:** `draft`  
**Última revisión:** 2026-04-06

---

## 1. Objetivo

A partir del topic, avatar, y problema ya definidos, genera una propuesta coherente del paquete completo de infoproducto: título del ebook principal, bonuses (máximo 5) con título, descripción de una línea, y justificación de por qué complementa al ebook, y order bumps (máximo 2) con la misma estructura. Este prompt es puramente generativo — no refina input del usuario sino que construye a partir del contexto acumulado del wizard.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output |
| `{topic}` | `string` | ✅ | `optimized_title` del output de `optimize-topic` |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar`, serializado como string JSON |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem`, serializado como string JSON |

**Conectividad de pipeline:**
- `{topic}` = campo `optimized_title` de `optimizeTopicPrompt()`
- `{avatar}` = output de `optimizeAvatarPrompt()` vía `JSON.stringify()`
- `{problem}` = output de `optimizeProblemPrompt()` vía `JSON.stringify()`
- Este prompt no produce output que se pase como variable a otro prompt — es el último paso del pipeline previo al wizard de estructura (donde el usuario confirma o edita los títulos)

**No hay `{raw_input}`:** este prompt es completamente generativo. El usuario no describe el paquete — el sistema lo propone a partir del contexto.

---

## 3. Output esperado

**Tipo de output:** JSON  
**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt

### Schema con ejemplo real

```json
{
  "main_ebook": {
    "title": "Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale"
  },
  "bonuses": [
    {
      "title": "La calculadora de costos para artesanas",
      "description": "Planilla lista para calcular el costo real de cada vela e incluir tu ganancia sin adivinar",
      "complement": "Convierte el capítulo de precios del ebook en acción inmediata con tu negocio específico"
    },
    {
      "title": "50 respuestas para el 'está caro'",
      "description": "Frases listas para los típicos reclamos de precio sin perder al cliente en el intento",
      "complement": "Complementa la estrategia de precios con herramientas para el momento exacto de la venta"
    },
    {
      "title": "Tu primera campaña de Instagram en 30 días",
      "description": "Plan concreto con qué publicar y cuándo para conseguir clientes fuera de tu círculo de conocidos",
      "complement": "Lleva la sección de marketing del ebook a un plan accionable sin experiencia previa en redes"
    }
  ],
  "bumps": [
    {
      "title": "Pack de 20 fotos de velas listas para usar en redes",
      "description": "Fotografías profesionales sin derechos de autor para Instagram, WhatsApp y tienda online",
      "complement": "Resuelve el obstáculo inmediato de no tener fotos atractivas para empezar a vender online"
    }
  ]
}
```

**Restricciones de conteo (límites del MVP):**
- `bonuses`: entre 1 y 5 items — nunca más de 5, nunca lista vacía. Sugerir 3-4 por defecto.
- `bumps`: entre 0 y 2 items — lista vacía `[]` es válida si el tema no justifica bumps. Sugerir 1-2 por defecto.

**Restricciones de longitud:**
- `main_ebook.title`: max 120 caracteres
- Cada `bonus.title` y `bump.title`: max 100 caracteres
- Cada `bonus.description` y `bump.description`: max 150 caracteres (1 oración)
- Cada `bonus.complement` y `bump.complement`: max 150 caracteres (1 oración)

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
| **Temperatura** | `0.6` | La mayor creatividad justificada: el modelo debe proponer un paquete coherente y atractivo, no solo descriptivo. Más variedad que los prompts anteriores del pipeline. |
| **max_tokens** | `1200` | El JSON completo con 4 bonuses + 2 bumps ronda los 700-800 tokens; margen para títulos más elaborados |
| **Modelo** | `claude-sonnet-4-6` | Requiere síntesis de todo el contexto acumulado para proponer un paquete coherente como sistema |

---

## 5. System prompt

_`{content_locale}` se interpola en `prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: using the topic, avatar, and problem provided, propose a complete, coherent infoproduct package — main ebook title, bonuses, and order bumps — where every piece feels like part of a unified system, not a random collection.

Respond strictly in {content_locale}. Output must be in {content_locale} regardless of input language.

Rules:
1. Package coherence: every bonus and bump must extend the main ebook's promise. Bonuses add a distinct dimension (a tool, a script, a shortcut, a companion resource). Bumps are high-urgency, compact complements — typically a 1:1 session, a done-for-you template, or an implementation shortcut.
2. Bonuses: suggest 3–4 by default. Each must address a different sub-problem from the avatar's profile or a distinct step in the transformation. Never propose two bonuses that do the same thing with different names.
3. Bumps: suggest 1–2 if the topic justifies it; return [] if it genuinely doesn't. Bumps have immediate, specific value — not "more of the same ebook content."
4. Titles: specific and benefit-forward. Not "Módulo 1: Precios" but "La calculadora de costos para artesanas." Not "Bonus: Marketing" but "Tu primera campaña de Instagram en 30 días."
5. complement field: one sentence explaining why this piece belongs in the package — what gap it fills that the main ebook doesn't. This must be specific, not generic ("adds value").
6. Limits: never exceed 5 bonuses or 2 bumps.
7. Length: main title max 120 chars. bonus/bump title max 100 chars. description max 150 chars. complement max 150 chars.
8. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: topic, avatar, or problem is empty or contains an error field.

Example (es):
Input: topic="Velas artesanales: sistema de precios y ventas" avatar+problem=(artesana con problema de precios e inconsistencia de ventas)
{"main_ebook":{"title":"Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale"},"bonuses":[{"title":"Calculadora de costos para artesanas","description":"Planilla para calcular el costo real de cada vela e incluir ganancia sin adivinar","complement":"Convierte el capítulo de precios en acción inmediata con tu negocio específico"},{"title":"50 respuestas para el 'está caro'","description":"Frases listas para los típicos reclamos de precio sin perder clientes","complement":"Complementa la estrategia con herramientas para el momento exacto de la venta"}],"bumps":[{"title":"Revisión de precios 1:1 (30 min)","description":"Sesión con la autora para revisar tu estructura de costos específica","complement":"Para quien quiere aplicar el método a su situación sin hacerlo sola"}]}
```

---

## 6. User prompt template

```
Topic: {topic}
Avatar profile: {avatar}
Problem: {problem}

Propose the complete package structure for this infoproduct.
```

**Notas de implementación en `prompts.ts`:**
- Si `topic`, `avatar`, o `problem` están vacíos o contienen `"error"`, **no llamar al prompt** — resolver los pasos anteriores del pipeline primero
- `{avatar}` y `{problem}` se pasan como `JSON.stringify(object)` — los objetos completos
- El output de este prompt alimenta directamente la UI del wizard de estructura: los títulos de `bonuses` y `bumps` se usan como sugerencias pre-populadas en los pasos de bonus/bump titles, y `main_ebook.title` es una de las candidatas para el paso de main titles
- Los conteos (`bonuses.length`, `bumps.length`) pueden usarse para pre-setear los sliders de conteo en el wizard

---

## 7. Ejemplos few-shot

_Los tres ejemplos siguen los mismos "personajes" del pipeline para demostrar coherencia end-to-end. El avatar y problem se muestran abreviados — en producción se pasan los JSON completos._

---

### Ejemplo 1 — Paquete completo en `es`

**Variables de input:**
```
content_locale: "es"
topic: "Velas aromáticas artesanales: cómo crear y vender las que la gente busca"
avatar: { "description": "Artesana que fabrica velas en casa...", "pains": ["precios...", "ventas inconsistentes...", "competencia..."], ... }
problem: { "core_problem": "No tiene sistema para fijar precios...", "sub_problems": [...], "transformation": {...}, "urgency": "..." }
```

**Output esperado:**
```json
{
  "main_ebook": {
    "title": "Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale"
  },
  "bonuses": [
    {
      "title": "La calculadora de costos para artesanas",
      "description": "Planilla lista para calcular el costo real de cada vela e incluir tu ganancia sin adivinar",
      "complement": "Convierte el capítulo de precios del ebook en acción inmediata con tu negocio específico"
    },
    {
      "title": "50 respuestas para el 'está caro'",
      "description": "Frases listas para los típicos reclamos de precio sin perder al cliente en el intento",
      "complement": "Complementa la estrategia de precios con herramientas para el momento exacto de la venta"
    },
    {
      "title": "Tu primera campaña de Instagram en 30 días",
      "description": "Plan concreto con qué publicar y cuándo para conseguir clientes fuera de tu círculo de conocidos",
      "complement": "Lleva la sección de marketing del ebook a un plan accionable sin experiencia previa en redes"
    }
  ],
  "bumps": [
    {
      "title": "Pack de 20 fotos de velas listas para usar en redes",
      "description": "Fotografías profesionales sin derechos de autor para Instagram, WhatsApp y tienda online",
      "complement": "Resuelve el obstáculo inmediato de no tener fotos atractivas para empezar a vender online"
    }
  ]
}
```

**Por qué es el caso base:** Paquete completo (3 bonuses + 1 bump) con coherencia entre piezas. El bonus 1 es un recurso de implementación del contenido principal, el bonus 2 es una herramienta para el momento de la venta, el bonus 3 extiende el marketing, y el bump resuelve una objeción técnica inmediata (no tener fotos). Cada pieza aborda un sub-problema distinto del avatar.

---

### Ejemplo 2 — Paquete en `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Marketing digital para artesãs: como atrair clientes novos sem depender de indicações"
avatar: { "description": "Mãe que fabrica produtos artesanais em casa...", "pains": ["Instagram só para conhecidos...", "sem tempo para aprender...", "cobra barato..."], ... }
problem: { "core_problem": "Seu negócio depende de quem já a conhece...", "sub_problems": [...], "transformation": {...}, "urgency": "..." }
```

**Output esperado:**
```json
{
  "main_ebook": {
    "title": "Clientes novos todo mês: marketing digital para artesãs que querem crescer além dos conhecidos"
  },
  "bonuses": [
    {
      "title": "30 legendas prontas para o Instagram",
      "description": "Textos para posts que apresentam seu trabalho a quem não te conhece, sem soar desesperada",
      "complement": "Tira o bloqueio de 'não sei o que escrever' e coloca em prática o capítulo de conteúdo"
    },
    {
      "title": "Guia para criar sua bio e destaques perfeitos",
      "description": "Passo a passo para transformar seu perfil em vitrine que converte visitante em comprador",
      "complement": "Complementa a estratégia do ebook com o primeiro ponto de contato de qualquer cliente novo"
    },
    {
      "title": "Scripts para fechar vendas no DM sem pressionar",
      "description": "Roteiro de conversa para transformar 'quanto custa?' em pedido confirmado",
      "complement": "Conecta a atração de clientes novos do ebook com a conversão no momento da venda"
    }
  ],
  "bumps": [
    {
      "title": "Mentoria em grupo: tira-dúvidas ao vivo (60 min)",
      "description": "Sessão com perguntas e respostas sobre marketing para artesãs em situações reais",
      "complement": "Para quem quer apoio humano na aplicação das estratégias sem precisar contratar consultoria"
    }
  ]
}
```

**Por qué es útil:** Verifica que el paquete en pt-BR suena genuinamente brasileiro — los títulos de bonuses usan el lenguaje natural de las redes sociales en Brasil ("legendas", "DM", "destaques"). El bump es una mentoria grupal, que es el formato de high-value complement típico del mercado de infoproductos en Brasil.

---

### Ejemplo 3 — Paquete en `en-US`

**Variables de input:**
```
content_locale: "en-US"
topic: "Mindfulness without the woo: a practical guide for skeptical, busy people"
avatar: { "description": "High-achieving woman in her 30s who needs to slow down but gets turned off by spiritual jargon...", "pains": ["chakras/vibrations dismiss...", "tried and failed...", "stress affecting sleep..."], ... }
problem: { "core_problem": "She tried meditation, decided her mind is 'too busy,' and gave up...", "sub_problems": [...], "transformation": {...}, "urgency": "..." }
```

**Output esperado:**
```json
{
  "main_ebook": {
    "title": "The Skeptic's Guide to Meditation: science-backed practices for busy, analytical minds"
  },
  "bonuses": [
    {
      "title": "7 Evidence-Based Techniques for a Racing Mind",
      "description": "Research-cited exercises that work specifically when you can't stop thinking, with the science behind each",
      "complement": "Addresses the #1 reason the reader quit before — without this, the main book's method is still theoretical"
    },
    {
      "title": "The 10-Minute Morning Protocol",
      "description": "A structured before-work sequence with zero ambiguity about what to do or for how long",
      "complement": "Turns the method from the ebook into a daily repeatable system with no decision fatigue"
    },
    {
      "title": "8-Week Stress and Focus Tracker",
      "description": "Simple spreadsheet to log mood, focus, and sleep so you can see your own practice working with data",
      "complement": "Gives the analytical reader the evidence they personally need to stay consistent and trust the method"
    }
  ],
  "bumps": [
    {
      "title": "The Neuroscience of Mindfulness: 60-Min Deep Dive",
      "description": "Recorded masterclass on the science of meditation for people who want to understand before they commit",
      "complement": "For readers who need the full research context before trusting the practice enough to build a habit"
    }
  ]
}
```

**Por qué es útil:** El paquete refleja el `angle: "emocional"` del topic (superar resistencia) y el perfil analítico del avatar. Cada bonus usa el lenguaje de la evidencia ("research-cited", "data", "neuroscience") en lugar del lenguaje aspiracional típico. El bump es un masterclass de neurociencia — un complemento de alto valor que apela al subtipo específico de esta audiencia.

---

## 8. Casos límite

| Caso | Descripción del input | Output esperado |
|------|-----------------------|-----------------|
| **`topic` vacío** | `topic: ""` | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI |
| **`avatar` con error** | `avatar` contiene campo `"error"` | No llamar al prompt — resolver el avatar primero |
| **`problem` con error** | `problem` contiene campo `"error"` | No llamar al prompt — resolver el problema primero |
| Topic muy amplio | `topic: "bienestar personal"` | Generar igualmente; los bonuses serán más genéricos — normal para temas amplios |
| Topic que no justifica bumps | Nicho muy específico y técnico donde un bump no agrega valor claro | Devolver `"bumps": []` — lista vacía es válida |
| Topic que genera 5+ bonuses obvios | Nicho con muchos sub-temas complementarios | Limitar a los 4-5 más distintos e impactantes. Nunca superar 5. |
| Avatar o problem en locale distinto al actual | Contextos generados previamente en `es`, prompt actual en `pt-BR` | Output en `pt-BR`; el modelo cross-traduce el contexto |
| Input en idioma distinto al locale | `content_locale: "es"`, inputs en inglés | Output completo en `es` |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-06 | v1.0 | Versión inicial | Cuarto y último prompt del pipeline del wizard de estructura |

### Decisiones descartadas

- **Incluir conteo recomendado como campo del output (`"recommended_bonus_count": 3`):** descartado — el conteo se infiere de `bonuses.length` directamente. Un campo extra no agrega información.
- **Proponer nombres de presupuesto o precio para los bumps:** descartado — el pricing es del creador, no de la IA. El prompt no tiene información de modelo de negocio.
- **Devolver múltiples opciones de `main_ebook.title`:** descartado — el wizard ya tiene `suggest-main-titles` para proponer 5 alternativas en el paso siguiente. Este prompt propone la estructura del paquete, no hace el job de `suggest-main-titles`. Responsabilidades separadas.
- **Campo `"rationale"` a nivel de paquete** (por qué este paquete como sistema): evaluado como útil para mostrar al creador la lógica del diseño. Descartado en v1.0 por costo de tokens y porque el `complement` de cada ítem ya cumple esa función ítem por ítem.

### Próximos experimentos

- [ ] Evaluar si pasar el `angle` del topic (de `optimize-topic`) como variable explícita mejora la coherencia entre el perfil emocional del paquete y el tipo de avatar — e.g. un paquete "emocional" debería tener bonuses de herramientas introspectivas, no plantillas de negocio
- [ ] Testear temperatura `0.7` vs `0.6` — ¿más creatividad en los títulos o más ruido?
- [ ] Medir si incluir `problem.transformation.to` explícitamente en el user template (además del objeto completo) mejora la coherencia del main ebook title con la promesa de transformación
- [ ] Explorar si el campo `complement` puede usarse como base de copy para la futura landing page de ventas (post-MVP)

### Problemas conocidos en producción

- _Ninguno registrado._
