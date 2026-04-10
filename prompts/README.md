# Prompts — Obra.app

Sistema de prompts de producción para los flujos de IA de Obra. Cada archivo `.md` en esta carpeta es la **fuente de verdad documental** de un prompt: objetivo, contratos de entrada/salida, ejemplos few-shot, parámetros de modelo, y notas de iteración.

---

## Estructura de carpetas

```
prompts/
├── README.md          — Este archivo
├── _template.md       — Plantilla base para nuevos prompts
├── wizard/            — Prompts del Wizard compartido (Estructura)
├── content/           — Prompts de generación de contenido (Contenido)
├── upload/            — Prompts del flujo Upload
├── design/            — Prompts de diseño y refinamiento de texto
└── images/            — Prompts de generación de imágenes y portada
```

### Mapeo carpeta → PRD

| Carpeta | Feature PRD |
|---------|-------------|
| `wizard/` | `features/wizard-shared/wizard-shared.md` — topic, avatar, package structure, design |
| `content/` | `features/wizard-ai-generation/wizard-ai-generation.md` — index, capítulos, bonuses, bumps |
| `upload/` | `features/wizard-upload/wizard-upload.md` — split proposal, alignment |
| `design/` | Transversal — improve text, style notes (usado en wizard/ y content/) |
| `images/` | `features/wizard-preview/wizard-preview.md` — imágenes de sección, portada Gemini |

---

## Convención de nombres de archivos

**Formato:** `kebab-case`, siempre **verbo-objeto**.

| Nombre de archivo | Prompt que implementa |
|-------------------|-----------------------|
| `suggest-main-titles.md` | Sugiere 5 títulos para el ebook principal |
| `suggest-bonus-titles.md` | Sugiere títulos para cada bonus |
| `generate-index.md` | Genera el índice/TOC del ebook |
| `generate-chapter-body.md` | Genera el cuerpo de un capítulo |
| `improve-text.md` | Refina texto libre de un campo del wizard |
| `propose-split.md` | Propone división de manuscrito en capítulos |
| `generate-section-image.md` | Genera prompt de imagen de sección para Gemini |
| `generate-cover.md` | Genera prompt de portada para Gemini |

**Nunca:**
- Nombres genéricos: ~~`prompt1.md`~~, ~~`ai.md`~~
- Nombres sin verbo: ~~`titles.md`~~, ~~`chapter.md`~~
- Nombres con espacios o mayúsculas: ~~`GenerateChapter.md`~~

---

## Cómo se conectan los `.md` con `supabase/functions/_shared/prompts.ts`

El `.md` documenta; el código ejecutable vive en Edge (Deno). Son inseparables.

```
prompts/content/generate-index.md       ←→    _shared/prompts.ts → generateIndexPrompt()
prompts/wizard/generate-ebook-title.md  ←→    _shared/prompts.ts → generateEbookTitlePrompt()
prompts/images/generate-cover.md        ←→    _shared/prompts.ts → (future) generateCoverPrompt()
```

### Flujo de trabajo obligatorio

1. **Diseñar** el prompt en el `.md`: objetivo, contratos, ejemplos few-shot.
2. **Implementar** en `supabase/functions/_shared/prompts.ts` como función TypeScript que recibe las variables y devuelve `{ system: string; user: string }`.
3. **Versionar** en el mismo commit: el `.md` y la función en `_shared/prompts.ts` viajan juntos.
4. **Nunca** duplicar strings de prompts en handlers: importar los builders desde `_shared/prompts.ts` dentro de `supabase/functions/*/index.ts`. El SPA no incluye estos templates.

### Patrón de implementación en `_shared/prompts.ts`

```typescript
// Constante compartida — mismo system base en todos los prompts de Obra
export const OBRA_SYSTEM_BASE = `You are Obra's content AI. Obra creates infoproduct packages \
(ebook + bonuses + order bumps) for LATAM creators who need professional results fast, \
without design or code skills.`

// Una función por prompt. Tipos estrictos. Sin strings sueltos.
export function suggestMainTitlesPrompt(vars: {
  topic: string
  avatar: string
  problem: string
  content_locale: 'es' | 'pt-BR' | 'en-US' | 'en-GB'
}): { system: string; user: string } {
  return {
    system: `${OBRA_SYSTEM_BASE}
Role: propose 5 compelling ebook titles for the creator's package.
Respond strictly in ${vars.content_locale}. Do not mix languages even if input is in another language.
Output: valid JSON only. No preamble, no markdown code blocks, no explanation.
If input is insufficient or off-topic, return {"error":"insufficient_input","message":"<reason in ${vars.content_locale}>"}`,

    user: `Topic: ${vars.topic}
Ideal customer: ${vars.avatar}
Problem solved: ${vars.problem}

Propose exactly 5 ebook titles. Each title should be specific, benefit-driven, and written for a LATAM creator audience.`,
  }
}
```

---

## Tono y voz de Obra

Obra habla con **creadores de infoproductos de LATAM** — Argentina y Brasil en el lanzamiento, LATAM en expansión. El output de la IA de Obra debe sonar:

- **Cálido y directo**, no corporativo ni genérico. Habla de vos/ustedes en `es`, de você en `pt-BR`.
- **Aspiracional pero realista**: no promete milagros, reconoce el trabajo del creador.
- **AI-driven pero humano**: el AI facilita, el creador decide y aprueba. Nunca imponer.
- **Bilingüe nativo**: `es` suena argentino/latino; `pt-BR` suena genuinamente brasileño — no es traducción literal del español.

### Registros por locale

| Locale | Registro | Ejemplo de tono |
|--------|----------|-----------------|
| `es` | Vos/ustedes, directo, sin eufemismos | "Describí el problema que resuelve tu infoproducto" |
| `pt-BR` | Você, warm, conversacional | "Descreva o problema que o seu infoproduto resolve" |
| `en-US` | You, professional-casual | "Describe the problem your product solves" |
| `en-GB` | You, slightly more formal | "Describe the problem your product addresses" |

**Regla invariable:** el locale del output siempre lo determina `{content_locale}` del proyecto. El system prompt lo declara explícitamente en cada prompt. El usuario puede escribir en cualquier idioma; el modelo responde siempre en `content_locale`.

---

## Estructura de cada archivo de prompt

Todos los archivos siguen la estructura definida en `_template.md`. Las 8 secciones son obligatorias:

| # | Sección | Qué contiene |
|---|---------|--------------|
| 1 | **Objetivo** | 1 frase: qué hace, qué devuelve, en qué contexto del flujo |
| 2 | **Inputs** | Tabla de variables tipadas con `{curly_braces}` |
| 3 | **Output esperado** | Formato exacto: JSON schema con ejemplo real, o spec de texto plano |
| 4 | **Parámetros de modelo** | Temperatura, max_tokens, modelo recomendado |
| 5 | **System prompt** | Texto exacto del system message; corto y denso |
| 6 | **User prompt template** | Template con `{variables}` listo para copiar a código |
| 7 | **Ejemplos few-shot** | Mínimo 2: input típico, input mínimo/ambiguo, locale alternativo |
| 8 | **Casos límite** | Input vacío, ofensivo, fuera de scope, idioma incorrecto |
| 9 | **Notas de iteración** | Historial de cambios y próximos experimentos |

---

## Principios de eficiencia

Estos 7 principios son **no negociables** en todos los prompts de Obra.

---

### 1. Prompts costo-eficientes

Cada prompt debe minimizar tokens de input sin perder calidad de output.

- Usar `{curly_braces}` para **todo** lo dinámico — nada hardcodeado en el template.
- **System prompt:** corto y denso. La narrativa y el razonamiento van en documentación, no en el prompt.
- El contexto del producto va en el system; **nunca** repetirlo en el user message.
- Eliminar cortesías, explicaciones meta, y redundancias.

**Anti-patrón (costoso e ineficaz):**
```
You are a helpful, knowledgeable, and friendly AI assistant specialized in creating 
high-quality educational content for online course creators and infoproduct professionals 
who want to build their own digital products using artificial intelligence to generate 
professional-quality ebooks, bonuses, and order bump materials for their audience...
```

**Patrón correcto (denso y efectivo):**
```
You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) 
for LATAM creators. Role: {role}. Output language: {content_locale}. JSON only.
```

---

### 2. Output estructurado siempre

Si el output es consumido por código — que es la mayoría de los casos — debe ser **JSON válido con schema explícito**.

- Incluir en el system: `"Respond ONLY with valid JSON. No preamble, no markdown code blocks, no explanation."`
- Definir el schema con un **ejemplo real**, nunca con descripción abstracta.
- Documentar campos opcionales con `null` en el ejemplo.

```json
// Schema correcto: ejemplo real, no descripción
{
  "titles": [
    "Título uno con beneficio claro",
    "Título dos orientado al resultado",
    "...",
    "...",
    "..."
  ]
}
```

Si el output es texto libre (e.g., cuerpo de capítulo): especificar formato (HTML, markdown, plain text) y longitud aproximada en el system.

---

### 3. Determinismo donde importa

Cada prompt debe documentar su temperatura y max_tokens sugeridos.

| Tipo de tarea | Temperatura | Razón |
|---------------|-------------|-------|
| Índice / TOC | `0.3` | Estructura y coherencia > creatividad |
| Split de manuscrito | `0.3` | Segmentación determinista |
| Improve text | `0.4` | Fidelidad al input original |
| Títulos de paquete | `0.5` | Variedad acotada |
| Bonuses / bumps | `0.6` | Creatividad dentro del paquete |
| Cuerpo de capítulo | `0.7` | Voz y creatividad |
| Portada / imágenes | `0.7` | Expresión visual libre |

Estos valores son puntos de partida — documentar ajustes en "Notas de iteración" con evidencia.

---

### 4. Fallbacks y robustez

Cada prompt debe instruir explícitamente qué hacer ante inputs problemáticos. Nunca silencio, nunca inventar.

| Caso | Comportamiento |
|------|----------------|
| Input vacío o muy corto | Devolver `{"error": "insufficient_input", "message": "<razón breve>"}` |
| Input ambiguo | Hacer la mejor interpretación y proceder; opcionalmente añadir `"assumed": true` |
| Input ofensivo o fuera de scope | Devolver `{"error": "out_of_scope", "message": "<razón en content_locale>"}` |
| Input en idioma distinto al locale | Responder siempre en `content_locale`, ignorar el idioma del input |
| Datos faltantes críticos | **Nunca inventar** — devolver `null` en el campo, no fabricar datos |

La instrucción de fallback va en el **system prompt**, no en el user template.

---

### 5. Locale explícito

- `{content_locale}` es variable obligatoria en **todos** los prompts de Obra.
- El system incluye siempre: `"Respond strictly in {content_locale}. Do not mix languages even if the user input is in another language."`
- El tono se ajusta por locale (ver tabla de registros más arriba).
- `es` no es español genérico — es español de Argentina/LATAM: vos, directo, sin eufemismos.
- `pt-BR` es portugués brasileño nativo — não é tradução do espanhol.
- Los locales disponibles en v1.0: `es`, `pt-BR`, `en-US`, `en-GB`. No usar `en-UK`.

---

### 6. Consistencia entre prompts

Todos los prompts del mismo flujo deben mantener coherencia de voz y contexto.

- El **Obra system base** es una sola constante `OBRA_SYSTEM_BASE` en `_shared/prompts.ts`, reutilizada en todos los prompts.
- Los campos de contexto del proyecto (`topic`, `avatar`, `problem`, `main_title`, `content_locale`) se pasan de forma **consistente** en todos los prompts del flujo — nunca parcialmente.
- Si el avatar del proyecto es "cálido y aspiracional", los capítulos deben sonar igual. La voz no cambia entre milestones.
- Cambiar el `OBRA_SYSTEM_BASE` requiere revisar **todos** los prompts que lo usan.

---

### 7. Testing built-in

Los ejemplos few-shot del `.md` son también los **casos de test** para `_shared/prompts.ts`.

- Cada prompt incluye **mínimo 2 ejemplos** que cubren:
  1. **Input típico** — el happy path, locale `es`
  2. **Input mínimo o ambiguo** — ¿qué hace el modelo con poco contexto?
  3. **Locale alternativo** — al menos un ejemplo en `pt-BR` o `en-US`
- Si un ejemplo falla en producción, se actualiza primero el `.md`, luego el código.
- Los casos límite de la sección 8 se pueden usar como fixtures de test de integración.

---

## Qué NO hacer en un prompt de Obra

| Anti-patrón | Por qué no | Alternativa |
|-------------|------------|-------------|
| Hardcodear nicho o tema | Cada proyecto es distinto | `{topic}` |
| Empezar con "Eres un experto en..." | Tokens desperdiciados, ineficaz | Rol en 1 línea densa en system |
| Mezclar idiomas en el output | Rompe la coherencia del paquete | `{content_locale}` siempre explícito |
| JSON con campos no declarados en schema | Rompe el parsing | Schema exacto con ejemplo real |
| System prompt de 500+ tokens narrativo | Costoso y menos efectivo que uno denso | System corto + user con datos concretos |
| Inventar datos si falta información | Outputs inútiles o engañosos | `null` + campo documentado |
| Generar contenido fuera del scope de Obra | Confunde al usuario | Fallback con `"error": "out_of_scope"` |
| Repetir el contexto en user si ya está en system | Duplica tokens | Contexto en system; datos específicos en user |
| Prompt sin temperatura documentada | Comportamiento no reproducible | Documentar en sección "Parámetros de modelo" |
