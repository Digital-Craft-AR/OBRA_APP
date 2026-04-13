# generate-split-proposal — Propone el índice y los límites de capítulos de un manuscrito subido

**Ruta:** `prompts/content/generate-split-proposal.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `generateSplitProposalPrompt()`  
**Edge entry:** `supabase/functions/ai-split-proposal/index.ts`  
**Feature PRD:** `features/wizard-upload/wizard-upload.md` — Split proposal module  
**Estado:** `draft`  
**Última revisión:** 2026-04-13

---

## 1. Objetivo

Analiza el **texto plano extraído** de un archivo `.docx` o `.pdf` subido por el usuario y propone una **división en capítulos**: cantidad de capítulos detectada, título sugerido para cada uno, y el **marcador de inicio** de cada capítulo en el texto original.

Este prompt aplica solo al **path de subida** (`content_source = upload`). Solo aplica al **ebook principal** — bonuses y order bumps siempre se generan con IA en ambos paths.

El usuario **no eligió** una cantidad de capítulos antes de subir — esa pantalla no se muestra en el path upload. El modelo detecta la estructura del documento y propone lo que encuentra.

**Flujo del path upload:**

```
Shared wizard completa (sin selector de capítulos)
     ↓
Usuario sube archivo .docx / .pdf
     ↓
Parse sin LLM → texto plano extraído
     ↓
Claude → generateSplitProposalPrompt() → propuesta de índice + marcadores
     ↓
Usuario ve alignment UI: renombra, fusiona, divide capítulos
     ↓
"Regenerate split" (opcional, misma llamada con nuevo texto si cambió el archivo)
     ↓
Approve alignment → handoff a wizard-ai-generation (chapter loop con prefill)
```

**Qué hace este prompt:**
- Detecta cuántos capítulos tiene el documento
- Propone un título limpio para cada uno (basado en el heading del documento o inferido del contenido)
- Devuelve el `start_heading` — el texto exacto del heading tal como aparece en el documento, para que la implementación pueda localizar el inicio de cada capítulo con una búsqueda de string

**Qué NO hace:**
- No reescribe ni resume el contenido del manuscrito
- No devuelve el cuerpo de cada capítulo en el JSON (la implementación reconstruye el cuerpo haciendo slice del texto original entre marcadores)
- No bloquea el flujo por desproporción de longitud entre capítulos — solo advierte

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{manuscript_text}` | `string` | ✅ | Texto plano extraído del archivo (sin markup). Puede ser largo — hasta ~20.000 palabras para un ebook típico |
| `{main_ebook_title}` | `string` | ✅ | Título del ebook elegido en el wizard — ancla para entender el tema del documento |
| `{topic}` | `string` | ✅ | Tema del proyecto — ayuda a detectar capítulos cuando los headings son ambiguos |
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del proyecto — para reconocer headings en el idioma del documento |

**Nota sobre el texto extraído:** el parse (sin LLM) produce texto plano. Los headings del documento original (H1, H2, negritas de título) pueden o no estar preservados dependiendo de la biblioteca de parseo. El modelo debe usar señales de texto para detectar estructura: líneas que dicen "Capítulo 1", "Chapter 2", "Introducción", "Conclusión", "Parte I", numeración visible, etc.

**Recomendación al usuario (copy de UI, no parte del prompt):** Para mejores resultados, el archivo debe tener cada capítulo marcado con un título claro en una línea separada. Ej: "Capítulo 1: El problema del precio" o simplemente "Capítulo 1".

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
      "order": 1,
      "title": "Por qué trabajar más no alcanza si el precio está mal",
      "start_heading": "Capítulo 1: Por qué trabajar más no alcanza si el precio está mal"
    },
    {
      "order": 2,
      "title": "El costo real de tu trabajo",
      "start_heading": "Capítulo 2: El costo real de tu trabajo"
    },
    {
      "order": 3,
      "title": "Cómo fijar un precio rentable",
      "start_heading": "Capítulo 3"
    }
  ],
  "warnings": [
    "El capítulo 2 es notablemente más corto que los demás — revisá si el contenido está completo."
  ]
}
```

### Descripción de campos

- **`chapters`**: array con todos los capítulos detectados. El orden es el del documento.
- **`chapters[n].order`**: entero **empezando en 1** (no 0), correlativo. El campo se llama `order`, no `index`.
- **`chapters[n].title`**: título limpio y legible para mostrar en la UI de alignment. Si el documento tiene un título en el heading, usarlo (limpio, sin "Capítulo 1:"). Si no, inferir del contenido de esa sección.
- **`chapters[n].start_heading`**: el texto **exacto** del heading tal como aparece en el documento (sin editar), para que la implementación pueda hacer una búsqueda de string y localizar el inicio del capítulo. Puede incluir "Capítulo 1:" si así aparece en el texto.
- **`warnings`**: array de strings, puede estar vacío `[]`. Advertencias no bloqueantes para el usuario: capítulo muy corto, capítulo muy largo, documento sin headings detectables, posible contenido no relacionado al tema del ebook, etc. Respetado en el `content_locale` del proyecto.

### Qué incluir como capítulos

Incluir como capítulos: capítulos numerados, partes, secciones principales con heading propio.  
**No incluir** como capítulos separados: tabla de contenidos, agradecimientos, referencias bibliográficas, índice analítico, páginas de copyright. Si estos están presentes, ignorarlos silenciosamente (no generan capítulo, no generan warning).

### Introducción y conclusión

Si el documento tiene una **Introducción** o **Prólogo** con contenido sustancial, incluirla como `order: 1`. Si tiene una **Conclusión** o **Epílogo** sustancial, incluirla como el último capítulo. Si son textos breves de 1-2 párrafos, se puede incluir su contenido en el primer o último capítulo respectivamente.

### Schema de error

```json
{
  "error": "INVALID_INPUT",
  "reason": "Razón breve en {content_locale}"
}
```

Usar solo si `manuscript_text` está vacío o es ilegible (menos de 100 palabras sin estructura aparente).

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.3` | La tarea es de extracción fiel, no creativa. Temperatura baja reduce alucinaciones en los `start_heading` y mantiene coherencia entre el texto y la propuesta. |
| **max_tokens** | `1500` | El output es compacto (títulos + marcadores, no el cuerpo). Para un ebook de 15 capítulos con warnings, 1500 tokens es más que suficiente. |
| **Modelo** | `claude-sonnet-4-6` | El manuscrito puede ser largo (hasta ~25.000 tokens de input). Sonnet maneja bien textos largos y es necesario para entender estructura implícita cuando los headings son débiles. |

**Nota sobre el costo:** esta llamada puede tener muchos tokens de input (el manuscrito completo). A diferencia de los otros prompts del sistema, el costo no está en el output sino en el input. Con Sonnet y ~20.000 palabras de manuscrito, el input puede ser ~27.000 tokens. Esto es aceptable para una llamada única por proyecto (o dos si el usuario regenera).

---

## 5. System prompt

*`{content_locale}` se interpola antes de enviar.*

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's manuscript analyzer. Your job is to read a plain-text manuscript and propose a chapter structure for an infoproduct ebook. The user has already written the content — you are not rewriting or summarizing it. You are identifying how it is organized and proposing clean chapter titles and precise start markers.

Respond strictly in {content_locale} for titles and warnings. Output must be fully in {content_locale} regardless of input language.

YOUR TASK:
1. Read the manuscript and identify chapter boundaries — sections that represent a major, self-contained topic.
2. For each chapter, extract the start_heading: the exact text of the heading line as it appears in the document (copy it verbatim — do not clean or rephrase it). This will be used to locate the chapter in the original text via string search.
3. Propose a clean, readable title for each chapter for display in the alignment UI. If the heading already has a good title (e.g. "Capítulo 1: El problema del precio"), clean it to just the descriptive part ("El problema del precio"). If there is no heading title, infer one from the chapter content.
4. Identify any non-blocking issues worth flagging as warnings.

HOW TO DETECT CHAPTER BOUNDARIES:
Primary signals (use these first):
- Lines that read: "Capítulo N", "Chapter N", "Parte N", "Part N", "Módulo N", "Sección N", followed optionally by a title
- Lines that read: "Introducción", "Introduction", "Prólogo", "Prefacio", "Conclusión", "Conclusion", "Epílogo"
- Any line that is notably short (1–10 words), on its own line, and followed by body text — typical of heading formatting that may not have been preserved as markup

Secondary signals (use when primary signals are absent or ambiguous):
- Significant topic shift with a short transitional line
- Numbered sections (1., 2., I., II.)
- ALL CAPS short lines
- Lines ending with a line break followed by a blank line then body text

WHAT NOT TO INCLUDE AS CHAPTERS:
- Table of contents (Índice, Contenido, Table of Contents) — skip silently
- Acknowledgements, dedications, copyright pages, bibliography — skip silently
- Front matter and back matter that add no instructional content

OUTPUT SCHEMA RULES:
- The field is called "order", NOT "index". order starts at 1 (not 0) and is consecutive.
- Every chapter object must have exactly three fields: order, title, start_heading.

TITLE RULES:
- Remove the chapter number prefix from the title (e.g. "Capítulo 1: " → drop it, keep only the descriptive part)
- If the heading has no descriptive title (just "Capítulo 3"), infer a title from the first paragraph of that chapter
- Max 90 characters
- Capitalize naturally for {content_locale}

START_HEADING RULES:
- Copy the heading line VERBATIM from the manuscript — do not edit, clean, or translate it
- Include enough text to be unique in the document (typically the full heading line)
- If the same heading appears twice (unlikely but possible), use the first occurrence

WARNINGS (non-blocking — array of strings in {content_locale}):
Flag these situations if detected:
- A chapter that is significantly shorter than the others (under ~300 words) — user may want to merge it
- A chapter that is very long compared to the others (over 3× the average) — user may want to split it
- A document where no clear headings were found — inform the user that the split was inferred from content and may need manual adjustment
- Content that appears unrelated to the ebook title/topic (e.g., legal disclaimers, promotional copy mixed in)

Do NOT warn about:
- Normal variation in chapter length
- Writing style, quality, or relevance of individual sections
- Missing content or gaps (not your job)

Return {"error": "INVALID_INPUT", "reason": "<brief in {content_locale}>"} only if manuscript_text is empty or too short to analyze (under 100 words).
```

---

## 6. User prompt template

```
Main ebook title: {main_ebook_title}
Topic: {topic}
Content locale: {content_locale}

Manuscript text:
---
{manuscript_text}
---

Analyze the manuscript and propose the chapter structure.
```

---

## 7. Ejemplos few-shot

---

### Ejemplo 1 — Documento con headings claros (`es`)

**Fragmento de manuscrito (texto plano extraído):**
```
Velas que se venden

Introducción

Cuando empecé a vender velas desde casa, nunca pensé que el problema no era la calidad de mis velas sino el precio...

[3 párrafos de introducción]

Capítulo 1: Por qué trabajar más no alcanza

Hay una trampa invisible en la que caen casi todas las artesanas al comienzo...

[contenido del capítulo 1]

Capítulo 2: El costo real de tu trabajo

La primera vez que calculé mi costo real, me quedé paralizada...

[contenido del capítulo 2]

Capítulo 3: Cómo fijar un precio rentable

Fijar un precio rentable no es difícil. Es incómodo...

[contenido del capítulo 3]

Conclusión

Llegaste hasta acá. Eso ya dice algo de vos...

[2 párrafos de cierre]
```

**Output esperado:**
```json
{
  "chapters": [
    {
      "order": 1,
      "title": "Introducción",
      "start_heading": "Introducción"
    },
    {
      "order": 2,
      "title": "Por qué trabajar más no alcanza",
      "start_heading": "Capítulo 1: Por qué trabajar más no alcanza"
    },
    {
      "order": 3,
      "title": "El costo real de tu trabajo",
      "start_heading": "Capítulo 2: El costo real de tu trabajo"
    },
    {
      "order": 4,
      "title": "Cómo fijar un precio rentable",
      "start_heading": "Capítulo 3: Cómo fijar un precio rentable"
    },
    {
      "order": 5,
      "title": "Conclusión",
      "start_heading": "Conclusión"
    }
  ],
  "warnings": []
}
```

**Por qué es el caso típico:** headings explícitos, fácil de detectar. El `title` limpia el prefijo "Capítulo N:". El `start_heading` se copia verbatim para búsqueda exacta.

---

### Ejemplo 2 — Documento sin headings claros (`es`)

**Fragmento de manuscrito:**
```
El problema que nadie te dice

Cuando arrancás con tu emprendimiento de velas, lo primero que hacés es calcular el costo de los materiales...

[varios párrafos sobre el problema del precio]

Pero hay algo que cambia todo

Una planilla de costos no es una herramienta contable. Es una herramienta de confianza...

[párrafos sobre la solución]

Los próximos pasos

Ya tenés el sistema. Ahora es cuestión de aplicarlo...
```

**Output esperado:**
```json
{
  "chapters": [
    {
      "order": 1,
      "title": "El problema que nadie te dice",
      "start_heading": "El problema que nadie te dice"
    },
    {
      "order": 2,
      "title": "Pero hay algo que cambia todo",
      "start_heading": "Pero hay algo que cambia todo"
    },
    {
      "order": 3,
      "title": "Los próximos pasos",
      "start_heading": "Los próximos pasos"
    }
  ],
  "warnings": [
    "No se detectaron headings de capítulo estándar (\"Capítulo 1\", etc.). La división fue inferida del texto — revisá en el editor que los cortes tengan sentido."
  ]
}
```

---

### Ejemplo 3 — Capítulo muy corto (`pt-BR`)

**Variables de input:**
```
content_locale: "pt-BR"
main_ebook_title: "Clientes novos todo mês"
```

**Output esperado (fragmento):**
```json
{
  "chapters": [
    { "order": 1, "title": "Introdução", "start_heading": "Introdução" },
    { "order": 2, "title": "Por que o marketing orgânico funciona", "start_heading": "Capítulo 1" },
    { "order": 3, "title": "Seu primeiro calendário de conteúdo", "start_heading": "Capítulo 2" },
    { "order": 4, "title": "Conclusão", "start_heading": "Conclusão" }
  ],
  "warnings": [
    "O capítulo 3 (\"Conclusão\") tem menos de 200 palavras — considere incorporá-lo ao capítulo anterior ou expandir o conteúdo."
  ]
}
```

---

### Ejemplo 4 — Error: texto vacío

**Output esperado:**
```json
{
  "error": "INVALID_INPUT",
  "reason": "El texto extraído está vacío. Verificá que el archivo tenga contenido de texto seleccionable."
}
```

---

## 8. Casos límite

| Caso | Descripción | Output esperado |
|------|-------------|-----------------|
| Sin headings detectables | Documento todo como flujo continuo | Intentar dividir por señales secundarias; generar warning de "sin headings estándar" |
| Documento muy corto (<500 palabras) | Manuscrito incompleto o solo el índice subido | Generar los capítulos que detecte + warning de contenido escaso |
| Tabla de contenidos al inicio | El texto empieza con "Índice: Capítulo 1..., Capítulo 2..." | Ignorar la tabla de contenidos y procesar el cuerpo del documento |
| Un solo bloque sin divisiones | Todo el ebook como un único capítulo | Proponer 1 capítulo con el texto completo; warning de "no se detectaron divisiones internas" |
| Capítulos muy desiguales | Capítulo 1: 4000 palabras. Capítulo 2: 200 palabras | Incluir ambos; warning de desproporción en el capítulo corto |
| Headings en mayúsculas | "CAPÍTULO 1", "INTRODUCCIÓN" | Detectarlos igual; incluirlos verbatim en `start_heading` |
| Idioma diferente al `content_locale` | Manuscrito en inglés, `content_locale: "es"` | Detectar capítulos igual; proponer `title` traducido al `content_locale` (no verbatim del heading) |
| Contenido no relacionado al tema | Páginas de promoción de otros productos mezcladas | Warning de "contenido no relacionado"; no crear capítulos para esas secciones si son claramente material promocional |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-13 | v1.0 | Versión inicial | Nuevo prompt para el path upload del wizard |

### Decisiones tomadas

- **El modelo detecta el chapter count (no lo recibe como input):** En el path upload, el wizard no muestra el selector de cantidad de capítulos. El modelo propone la estructura que encuentra. El usuario la ajusta en la alignment UI.
- **`start_heading` verbatim, no índices de carácter:** Copiar el texto exacto del heading permite que la implementación lo localice con una búsqueda de string en el texto original. Es más robusto que índices de carácter (que pueden corromperse con normalizaciones de espacios, encoding, etc.) y más simple de implementar.
- **Output compacto — sin cuerpo de capítulo:** El modelo devuelve títulos + marcadores, no el texto completo de cada capítulo. La implementación reconstruye el cuerpo haciendo slice entre marcadores. Esto mantiene el output en ~1500 tokens máximo, independientemente del largo del manuscrito.
- **Warnings no bloqueantes:** La desproporción de longitud entre capítulos no bloquea el flujo. El usuario decide en la alignment UI qué hacer. El modelo informa, no decide.
- **Sonnet en lugar de Haiku:** El input puede ser largo (~27.000 tokens para un manuscrito de 20.000 palabras) y la tarea requiere comprensión estructural del texto. Haiku no es confiable para este tipo de análisis de documentos largos.
- **Temperatura 0.3:** La fidelidad al texto original es crítica. `start_heading` debe ser exacto para que la búsqueda funcione. Temperatura baja reduce el riesgo de que el modelo "corrija" o reformule los headings en `start_heading`.
- **Solo main ebook:** Bonuses y order bumps siempre se generan con IA — en ambos paths. Este prompt solo aplica al ebook principal.

### Decisiones descartadas

- **Pasar character ranges como output:** Frágil ante transformaciones del texto (trim, normalización de saltos de línea, encoding). Reemplazado por `start_heading` verbatim + búsqueda de string.
- **Incluir el body text de cada capítulo en el output:** El output se volvería tan largo como el input (el manuscrito completo re-emitido). Innecesario cuando la implementación puede hacer el slice directamente.
- **Modelo Haiku:** Insuficiente para documentos largos con estructura implícita. Sonnet es necesario para inferir capítulos cuando los headings no son explícitos.
- **Selector de capítulos en el wizard (path upload):** El wizard no muestra el selector de cantidad de capítulos cuando el usuario elige subir un archivo. El modelo detecta la estructura existente en el documento.

### Próximos experimentos

- [ ] Testear en documentos sin headings (flujo continuo) — evaluar si la detección por señales secundarias produce divisiones razonables
- [ ] Testear con documentos en pt-BR para verificar que el modelo detecta "Capítulo N" y "Módulo N" en portugués
- [ ] Evaluar si agregar una instrucción de "máximo N capítulos" mejora o empeora la propuesta cuando el documento está muy fragmentado
- [ ] Evaluar si pasar las primeras 2000 palabras del manuscrito como "preview" en el user prompt mejora la detección (actualmente el manuscrito completo va en el user prompt)

### Problemas conocidos en producción

- *Ninguno registrado — versión inicial.*
