# [nombre-del-prompt] — verbo-objeto en kebab-case

**Ruta:** `prompts/{carpeta}/nombre-del-prompt.md`  
**Implementación:** `supabase/functions/_shared/prompts.ts` → función `nombreDelPromptPrompt()`  
**Feature PRD:** `features/{slug}/{slug}.md` — §sección relevante  
**Estado:** `draft` | `production` | `deprecated`  
**Última revisión:** YYYY-MM-DD

---

## 1. Objetivo

_Una sola frase. Debe responder: qué hace este prompt, qué devuelve, y en qué momento del flujo se usa._

> Ejemplo: "Propone 5 títulos para el ebook principal basados en el tema, avatar, y problema del proyecto, para que el creador elija o edite en el paso de estructura antes de continuar a bonuses."

---

## 2. Inputs

Variables tipadas que recibe el prompt. Todas aparecen como `{curly_braces}` en los templates. Ningún valor debe estar hardcodeado.

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — siempre presente |
| `{topic}` | `string` | ✅ | Tema del infoproducto |
| `{avatar}` | `string` | ✅ | Descripción del cliente ideal |
| `{problem}` | `string` | ✅ | Problema que resuelve el producto |
| `{main_title}` | `string \| null` | ❌ | Título del ebook principal; null si aún no está confirmado |
| `{author}` | `string \| null` | ❌ | Nombre del autor/marca; omitir del prompt si es null |
| `{variable_adicional}` | `string` | ❌ | Describir; agregar o quitar filas según el prompt |

_Agregar filas según el prompt. Nunca incluir variables que no se usen en el template._

---

## 3. Output esperado

### Formato y tipo

**Tipo de output:** `JSON` | `HTML` | `texto plano` | `markdown`  
_(Elegir uno y eliminar los demás)_

**Para outputs JSON — incluir en el system:**
```
Respond ONLY with valid JSON. No preamble, no markdown code blocks, no explanation.
```

**Schema con ejemplo real** _(no descripción abstracta — un ejemplo concreto del output esperado)_:

```json
{
  "titles": [
    "Finanzas que sí funcionan: el método para salir de deudas sin sacrificar tu estilo de vida",
    "Libertad financiera en 90 días: la guía paso a paso para ordenar tu dinero de una vez",
    "El camino al ahorro: transforma tu relación con el dinero sin privarte de lo que amás",
    "Dinero inteligente: 7 hábitos para construir tu colchón financiero desde cero",
    "Presupuesto sin drama: cómo dejar de vivir al límite y empezar a crecer"
  ]
}
```

_Si hay campos opcionales, mostrarlos con `null` en el ejemplo. Si el output es texto libre, documentar: formato (HTML/markdown/plain), longitud aproximada en tokens, y cualquier restricción de estructura._

### Schema de error (aplica a todos los prompts JSON)

```json
{
  "error": "insufficient_input | out_of_scope | invalid_locale",
  "message": "Razón breve en {content_locale}"
}
```

---

## 4. Parámetros de modelo

| Parámetro | Valor recomendado | Razón |
|-----------|:-----------------:|-------|
| **Temperatura** | `0.X` | Baja (0.3) para estructura/determinismo; alta (0.7) para creatividad |
| **max_tokens** | `XXX` | Basado en longitud máxima esperada del output |
| **Modelo** | `claude-sonnet-4-6` | Ajustar a Haiku si la tarea es simple; Opus si es muy compleja |

_Documentar en "Notas de iteración" si se cambian estos valores y por qué._

---

## 5. System prompt

_Corto, denso, sin narrativa. El system define quién es Claude en este contexto, cuál es su rol específico, y las reglas invariables del output. Objetivo: ≤ 200 tokens para tareas estándar._

```
You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps)
for LATAM creators who need professional results fast, without design or code skills.

Role: [rol específico de este prompt en 1 línea].

Respond strictly in {content_locale}. Do not mix languages even if the user input is in 
another language.

Output: valid JSON only. No preamble, no markdown code blocks, no explanation.

If input is empty, too vague, or off-topic for an infoproduct, return:
{"error": "insufficient_input", "message": "<brief reason in {content_locale}>"}

If input contains inappropriate or off-scope content, return:
{"error": "out_of_scope", "message": "<brief reason in {content_locale}>"}

Never invent data. If a required field is missing, use null.
```

_Reemplazar `[rol específico]` con la responsabilidad concreta de este prompt. No copiar boilerplate que no aplique._

---

## 6. User prompt template

_El user turn debe ser breve. El contexto del producto ya está en el system. Solo incluir los datos concretos de la request._

```
Topic: {topic}
Ideal customer: {avatar}
Problem solved: {problem}
[Incluir aquí solo las variables adicionales que este prompt necesita]

[Instrucción específica del user turn — 1 a 3 líneas]
```

**Reglas del user template:**
- No repetir contexto que ya está en el system
- No incluir instrucciones de formato (ya van en system)
- No incluir variables que no se usarán en este turn
- Variables opcionales con valor `null`: omitirlas del user template o manejarlas condicionalmente en código

---

## 7. Ejemplos few-shot

_Mínimo 2 ejemplos. Deben cubrir: input típico (`es`), input mínimo o ambiguo, y al menos un locale alternativo. Estos ejemplos son los casos de test para `_shared/prompts.ts`._

---

### Ejemplo 1 — Input típico (`es`)

**Variables de input:**
```
content_locale: "es"
topic: "[tema específico y rico en contexto]"
avatar: "[descripción detallada del cliente ideal]"
problem: "[problema concreto que resuelve el producto]"
```

**Output esperado:**
```json
{
  // Output completo tal como lo devolvería el modelo con este input
}
```

**Por qué es el caso típico:** _Explicar brevemente qué hace que este sea el happy path._

---

### Ejemplo 2 — Input mínimo / ambiguo (`es`)

**Variables de input:**
```
content_locale: "es"
topic: "[tema muy vago, e.g. 'meditación']"
avatar: "[descripción escueta, e.g. 'personas que quieren meditar']"
problem: "[problema genérico, e.g. 'no saben cómo empezar']"
```

**Output esperado:**
```json
{
  // Output que muestra cómo el modelo maneja el mínimo de información
}
```

**Por qué es útil:** _Verificar que el modelo produce algo usable (aunque genérico) con input mínimo, en lugar de fallar silenciosamente._

---

### Ejemplo 3 — Locale `pt-BR`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "[tema en portugués o que aplica al mercado brasileño]"
avatar: "[cliente ideal en contexto de Brasil]"
problem: "[problema relevante para el mercado brasileño]"
```

**Output esperado:**
```json
{
  // Output en pt-BR genuino — no traducción del español
}
```

**Por qué es útil:** _Verificar que el modelo respeta el locale y usa el registro correcto de pt-BR._

---

### Ejemplo 4 — Caso de error (input fuera de scope)

**Variables de input:**
```
content_locale: "es"
topic: "[algo que no es un infoproducto educativo]"
```

**Output esperado:**
```json
{
  "error": "out_of_scope",
  "message": "[Razón breve en español]"
}
```

---

## 8. Casos límite

_Documentar el comportamiento esperado ante inputs problemáticos. Estas instrucciones deben estar en el system prompt, no solo en esta tabla._

| Caso | Descripción del input | Output esperado |
|------|-----------------------|-----------------|
| **Topic vacío** | `topic: ""` o solo espacios | `{"error": "insufficient_input", "message": "..."}` |
| **Input ofensivo** | Contenido inapropiado o ilegal | `{"error": "out_of_scope", "message": "..."}` |
| **Fuera de scope de Obra** | No es un infoproducto educativo | `{"error": "out_of_scope", "message": "..."}` |
| **Idioma incorrecto** | Input en inglés con `content_locale: "es"` | Responder en `es`, ignorar idioma del input |
| **Datos faltantes** | `avatar: null` o campo ausente | Responder con lo disponible; usar `null` en campos dependientes |
| **Input muy largo** | Topic de 2000+ caracteres | Procesar los primeros ~500 caracteres efectivos; no truncar silenciosamente si puede afectar calidad |

---

## 9. Notas de iteración

_Registro cronológico de decisiones, cambios, y experimentos. Actualizar con cada cambio significativo._

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| YYYY-MM-DD | v1.0 | Versión inicial | — |

### Decisiones descartadas

_Documentar enfoques que se evaluaron y no se usaron, con el motivo._

- **[Enfoque descartado]:** [Por qué no se usó]

### Próximos experimentos

_Ideas para iterar sobre este prompt. Mover a "Historial" cuando se implementen._

- [ ] Testear temperatura X vs Y para [aspecto específico]
- [ ] Evaluar si few-shot en el prompt mejora [métrica] (costo: ~N tokens extra)
- [ ] [Otro experimento]

### Problemas conocidos en producción

_Si el prompt falla en casos reales, documentarlos aquí hasta que se corrijan._

- _Ninguno registrado._
