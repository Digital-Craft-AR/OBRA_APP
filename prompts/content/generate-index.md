# generate-index — Genera el índice estructurado del ebook principal con arco narrativo

**Ruta:** `prompts/content/generate-index.md`  
**Implementación:** `obra/src/lib/prompts.ts` → función `generateIndexPrompt()`  
**Feature PRD:** `features/wizard-ai-generation/wizard-ai-generation.md`  
**Estado:** `draft`  
**Última revisión:** 2026-04-08

---

## 1. Objetivo

Es el primer prompt del flujo de Contenido (Día 2). Se llama inmediatamente después de que el usuario aprueba el wizard completo de Estructura y antes de cualquier llamada a `generate-chapter`. Toma todo el contexto acumulado del wizard — topic, avatar, problem, main ebook title, `chapter_count` (elegido en el subpaso Diseño) y `tone` (elegido en el paso Avatar y Problema; persistido en `design_config.contentTone`) — y devuelve el índice estructurado del ebook principal con un `narrative_arc` que garantiza coherencia entre capítulos. El arc se inyecta como variable `{index}` en cada llamada posterior a `generateChapterPrompt()`.

---

## 2. Inputs

| Variable | Tipo | Requerido | Descripción |
|----------|------|:---------:|-------------|
| `{content_locale}` | `"es" \| "pt-BR" \| "en-US" \| "en-GB"` | ✅ | Locale del output — determina idioma y registro de todo el JSON |
| `{topic}` | `string` | ✅ | `optimized_title` del output de `optimize-topic`; ancla los capítulos al nicho |
| `{avatar}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-avatar`, serializado como `JSON.stringify()` |
| `{problem}` | `string` (JSON serializado) | ✅ | Output completo de `optimize-problem`, serializado como `JSON.stringify()` |
| `{main_ebook_title}` | `string` | ✅ | `main_ebook.title` del output de `suggest-package`, aprobado o editado por el usuario en el wizard |
| `{chapter_count}` | `6 \| 8 \| 10 \| 12` | ✅ | Número exacto de capítulos elegido por el usuario en el subpaso "Diseño" del wizard de Estructura |
| `{tone}` | `"professional" \| "friendly" \| "inspirational" \| "direct" \| "educational"` | ✅ | Preset de tono (clave en inglés) elegido en el paso **Avatar y Problema** del wizard de Estructura; se persiste en `design_config.contentTone` |

**Conectividad de pipeline:**
- Todos los inputs llegan ya validados desde pasos anteriores del pipeline del wizard
- El output completo se almacena en el campo `index_json` de la tabla `ebooks` (ebook principal)
- El campo `index_json` completo se pasa como `{index}` en cada llamada a `generateChapterPrompt()`
- El usuario puede editar el índice antes de aprobarlo (drag-and-drop, rename, add/remove). El índice editado es el que alimenta `generate-chapter`

**Nota de implementación:** Si `{avatar}` o `{problem}` contienen el campo `"error"`, **no llamar a este prompt** — resolver los pasos anteriores del pipeline primero.

---

## 3. Output esperado

**Tipo de output:** JSON  
**Instrucción al modelo:** ver bloque `CRITICAL OUTPUT FORMAT` al inicio del system prompt

### Schema con ejemplo real

```json
{
  "title": "Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale",
  "subtitle": "Guía práctica para artesanas que quieren vivir de su taller sin cobrar barato",
  "narrative_arc": "De artesana que trabaja a pérdida sin saberlo, a emprendedora que cobra con confianza y tiene clientes que vuelven — seis pasos concretos que convierten el taller en un negocio real.",
  "chapters": [
    {
      "number": 1,
      "title": "El trap del precio bajo: por qué trabajar más no resuelve el problema",
      "description": "Abre el loop emocional: valida el esfuerzo y el cansancio, y muestra el mecanismo detrás del precio bajo como trampa estructural.",
      "key_concepts": [
        "El ciclo vicioso de cobrar barato para no perder clientes",
        "La diferencia entre precio de venta y precio rentable",
        "Por qué vender más volumen no resuelve el problema sin un sistema de precios"
      ],
      "word_count_target": 900
    },
    {
      "number": 2,
      "title": "Calculá el costo real de cada vela: materiales, tiempo y gastos que casi nadie incluye",
      "description": "Método paso a paso para calcular el costo completo de producción incluyendo tiempo y costos indirectos que la mayoría ignora.",
      "key_concepts": [
        "Los 4 componentes del costo real de una vela artesanal",
        "Cómo valuar el tiempo de producción sin subestimarlo",
        "Costos fijos vs. variables: cuáles incluir en el precio de cada unidad"
      ],
      "word_count_target": 1100
    }
  ]
}
```

**Restricciones de conteo estrictas:**
- `chapters`: exactamente `{chapter_count}` items — ni uno más, ni uno menos
- `key_concepts` por capítulo: entre 3 y 5 strings
- `subtitle`: puede ser `null` si el título ya es suficientemente descriptivo

**Restricciones de longitud:**
- `title`: max 120 caracteres
- `subtitle`: max 140 caracteres (o `null`)
- `narrative_arc`: max 400 caracteres
- `chapters[].title`: max 90 caracteres
- `chapters[].description`: max 280 caracteres
- Cada string en `chapters[].key_concepts`: max 130 caracteres

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
| **Temperatura** | `0.5` | La coherencia del arco narrativo requiere algo de estructura, pero los títulos y conceptos necesitan variedad suficiente para no generar índices idénticos entre proyectos del mismo nicho. Las reglas del system garantizan la coherencia estructural; la temperatura evita la homogeneidad. |
| **max_tokens** | `2500` | Un índice de 12 capítulos con 5 key_concepts por capítulo ronda los 1800-2000 tokens; margen para títulos más elaborados |
| **Modelo** | `claude-sonnet-4-6` | Requiere síntesis de todo el contexto del wizard y coherencia de arco narrativo sostenida a lo largo de 6-12 capítulos |

_Nota: el README recomienda `0.3` para prompts de índice/TOC. Se usa `0.5` aquí porque la variedad entre proyectos del mismo nicho es un requisito de producto — dos proyectos de "velas artesanales" no deben generar el mismo índice._

---

## 5. System prompt

_`{content_locale}`, `{chapter_count}`, y `{tone}` se interpolan en `prompts.ts` antes de enviar al modelo._

```
CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.

You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.

Role: generate the complete structured index (TOC) for the main ebook using all the accumulated wizard context. Include a narrative_arc that threads the reader's transformation from chapter 1 to the last — this arc is injected into every chapter generation call to maintain voice and structural coherence across the full ebook.

Respond strictly in {content_locale}. Output must be fully in {content_locale} regardless of input language. Cross-translate avatar/problem context if it is in a different language.

TONE GUIDE — apply to titles, descriptions, and key_concepts (use the exact preset key the user selected; keys are English, output language is {content_locale}):
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

WORD COUNT TARGETS by chapter_count={chapter_count}:
- 6 chapters: ch1 ~900w | middle (2-5) ~1100w each | last ~900w → ~6,500w total
- 8 chapters: ch1 ~900w | middle (2-7) ~1050w each | last ~950w → ~8,000w total
- 10 chapters: ch1 ~900w | middle (2-9) ~1000w each | last ~950w → ~9,500w total
- 12 chapters: ch1 ~900w | middle (2-11) ~950w each | last ~900w → ~10,800w total

RULES (non-negotiable):
1. EXACT count: output exactly {chapter_count} chapters. Never more, never fewer.
2. VALID tone: must be one of professional|friendly|inspirational|direct|educational. Apply consistently to titles, descriptions, and key_concepts.
3. Narrative arc is mandatory: each chapter must advance the reader from problem.transformation.from toward problem.transformation.to. No disconnected or redundant chapters.
4. Chapter 1 is the hook: validates the pain, makes the reader feel understood, opens the loop. NO heavy method delivery. ~900w.
5. Middle chapters carry the method: each delivers ONE concrete piece of the transformation. Titles must be specific and benefit-forward. BAD: "La importancia del precio". GOOD: "Calculá el costo real de cada vela en 4 pasos".
6. Last chapter consolidates and projects forward: summarizes the new capability built and outlines next steps. NEVER includes external CTAs (Telegram, Instagram, email, groups, coaching). The ebook is the product, not a lead magnet.
7. Each chapter must address a distinct sub_problem from problem.sub_problems or a distinct desire from avatar.desires. Never two chapters covering the same ground.
8. key_concepts must be specific: BAD: "entender el mercado". GOOD: "los 3 indicadores que determinan si un nicho es rentable".
9. NEVER invent quotes, studies, expert names, statistics with specific numbers, or academic references. Base content on practical domain knowledge. Widely known public-domain frameworks are acceptable.
10. STRICT CHARACTER LIMITS ENFORCEMENT — non-negotiable. Before returning the JSON, verify every string field is within these exact limits (count includes spaces and punctuation):
- title: max 120 characters
- subtitle: max 140 characters (or null)
- narrative_arc: max 400 characters
- chapters[].title: max 90 characters
- chapters[].description: max 280 characters
- chapters[].key_concepts[]: max 130 characters each
If any field exceeds its limit, rewrite it shorter before returning. Outputs with fields exceeding limits will be rejected downstream.
11. Return {"error":"INVALID_INPUT","reason":"<brief in {content_locale}>"} if: chapter_count is not one of 6/8/10/12 | tone is not one of professional|friendly|inspirational|direct|educational | topic or main_ebook_title is empty | avatar or problem contain an error field.

Example (es, chapter_count=6, tone=friendly):
Input: topic="Cómo transformar tu hobby de velas en negocio rentable" chapter_count=6 tone=friendly main_ebook_title="Velas que se venden" avatar=(artesana 25-45 LATAM; pain: precios/ventas/diferenciación) problem=(trabaja a pérdida sin saberlo; transformation.from="artesana que cobra barato"; transformation.to="emprendedora que cobra con confianza")
{"title":"Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale","subtitle":"Guía práctica para artesanas que quieren vivir de su taller sin cobrar barato","narrative_arc":"De artesana que trabaja a pérdida sin saberlo, a emprendedora que cobra con confianza y tiene clientes que vuelven — seis pasos concretos, sin teoría innecesaria.","chapters":[{"number":1,"title":"Por qué trabajar más no alcanza si el precio está mal","description":"Abre el loop: valida el esfuerzo y muestra el mecanismo del precio bajo como trampa estructural.","key_concepts":["El ciclo de trabajar más para ganar igual","La diferencia entre precio de venta y precio rentable","Por qué vender más volumen no resuelve el problema"],"word_count_target":900},{"number":2,"title":"Calculá el costo real de tu vela sin adivinar","description":"Método paso a paso para calcular el costo completo: materiales, tiempo y gastos que casi nadie incluye.","key_concepts":["Los 4 componentes del costo real de una vela","Cómo valuar tu tiempo sin subestimarlo","Costos fijos vs. variables: qué incluir en cada vela"],"word_count_target":1100},{"number":3,"title":"Tu precio de venta: la fórmula que sí cubre todo","description":"Cómo pasar del costo al precio final incluyendo ganancia real y margen para imprevistos.","key_concepts":["Margen mínimo vs. margen objetivo","El error de compararte con la vela importada más barata","Cómo ajustar el precio sin perder clientes actuales"],"word_count_target":1100},{"number":4,"title":"Diferenciarte sin bajar el precio: tu propuesta única","description":"Cómo construir un diferencial de marca que justifique el precio y haga irrelevante la comparación.","key_concepts":["3 tipos de diferencial artesanal que funcionan","Cómo comunicar el valor sin sonar arrogante","Tu historia como parte del producto"],"word_count_target":1100},{"number":5,"title":"Canales de venta que no dependen de las ferias","description":"Cómo vender de forma consistente sin esperar el pico de fechas especiales.","key_concepts":["Instagram como canal de venta directa","WhatsApp como canal de fidelización","Cómo armar una cartera de clientes que vuelven"],"word_count_target":1100},{"number":6,"title":"Tu taller como negocio: los próximos 90 días","description":"Consolida el método y da un plan de acción concreto para los primeros tres meses con el sistema aplicado.","key_concepts":["Las 3 métricas que indican si tu negocio de velas está sano","Cómo revisar y ajustar tu precio cada trimestre","El mapa de los próximos 90 días paso a paso"],"word_count_target":900}]}
```

---

## 6. User prompt template

```
Topic: {topic}
Main ebook title: {main_ebook_title}
Chapter count: {chapter_count}
Tone: {tone}
Avatar profile: {avatar}
Problem: {problem}

Generate the complete index with exactly {chapter_count} chapters.
```

**Notas de implementación en `prompts.ts`:**
- `{chapter_count}` y `{tone}` se interpolan en el system (para la lógica de reglas) y en el user template (para que el modelo lo tenga explícito en el turno del usuario)
- Si `chapter_count` no es uno de `[6, 8, 10, 12]`, **no llamar al prompt** — validar en UI antes de la llamada; el selector de capítulos solo expone esos cuatro valores
- Si `tone` no es uno de los 5 presets (`professional`, `friendly`, `inspirational`, `direct`, `educational`), **no llamar al prompt** — el paso Avatar y Problema en la UI lo garantiza
- Si `avatar` o `problem` contienen campo `"error"`, **no llamar al prompt** — resolver los pasos del wizard primero
- Si `main_ebook_title` o `topic` están vacíos, **no llamar al prompt**
- `{avatar}` y `{problem}` se pasan como `JSON.stringify(object)` — los objetos completos, no solo campos individuales
- El output completo se almacena como `index_json` en la tabla `ebooks` (ebook principal del proyecto)
- El `narrative_arc` del output se incluye en el contexto de cada llamada a `generateChapterPrompt()` para sostener coherencia de voz y progresión a lo largo del ebook
- Si el usuario edita el índice (drag-and-drop, rename, add/remove) antes de aprobar, el JSON editado reemplaza el generado — `index_json` siempre refleja el estado aprobado por el usuario, no el generado por el modelo

---

## 7. Ejemplos few-shot

_Los tres ejemplos usan personajes canónicos del Día 1 del wizard para demostrar coherencia de pipeline end-to-end. Los campos `avatar` y `problem` se muestran abreviados — en producción se pasan los JSON completos._

---

### Ejemplo 1 — `es`, 8 capítulos, tono `friendly`

**Variables de input:**
```
content_locale: "es"
topic: "Cocina vegana para familias: cómo hacer que toda la familia coma rico, sano y sin conflictos"
main_ebook_title: "Come bien, cocina vegano: recetas y estrategias para que tu familia disfrute sin darse cuenta"
chapter_count: 8
tone: "friendly"
avatar: {
  "description": "Mamá o papá que quiere incorporar más comida vegetal en la dieta familiar pero enfrenta resistencia, especialmente de los chicos. Cocina todos los días, le importa la salud, y está dispuesta a aprender — pero necesita recetas que gusten de verdad, no platos de 'comida de régimen'.",
  "demographics": { "age_range": "28-45 años", "gender": "femenino", "location": "Argentina/LATAM, zonas urbanas", "socioeconomic": "Clase media; cocina en casa la mayoría de los días" },
  "pains": ["Cuando prepara algo vegano, la familia se queja o come poco y pide 'comida de verdad'", "No sabe cómo reemplazar la proteína animal sin que el plato quede seco o sin sabor", "Siente que la comida vegana requiere ingredientes caros o difíciles de conseguir en el súper de la esquina"],
  "desires": ["Que su familia coma más plantas sin peleas ni caras largas", "Tener 20-30 recetas familiares veganas que realmente gusten", "Sentirse segura en la cocina vegana sin depender de recetas complicadas"],
  "objections": ["Mi familia nunca va a aceptar comer vegano — ya lo intenté y fue un desastre", "La comida vegana nutritiva requiere tiempo y preparación que no tengo"]
}
problem: {
  "core_problem": "No tiene un método para introducir comida vegana que guste a toda la familia — lo intenta, hay resistencia, y abandona convencida de que 'su familia no es de esas'.",
  "sub_problems": ["Adapta recetas veganas que le gustan a ella pero que no pasan el filtro de los chicos ni de su pareja", "No sabe qué hacer con las proteínas vegetales: el tofu le queda baboso, las legumbres aburridas", "Asocia 'vegano' con 'light' o 'régimen', y eso sabotea la presentación antes de servir"],
  "transformation": {
    "from": "Cocinera que intenta vegano, enfrenta rechazo, y vuelve al pollo de siempre",
    "to": "Cocinera con método y repertorio: incorpora 3-4 comidas veganas por semana que su familia come sin quejarse"
  },
  "urgency": "Cada semana que vuelve al default de siempre refuerza en su familia la idea de que vegano no es para ellos — cuanto más espera, más resistencia acumulada."
}
```

**Output esperado:**
```json
{
  "title": "Come bien, cocina vegano: recetas y estrategias para que tu familia disfrute sin darse cuenta",
  "subtitle": "El método para incorporar comida vegetal sin peleas, sin ingredientes raros, y sin que nadie extrañe la carne",
  "narrative_arc": "Juntos vamos a pasar de la frustración de cocinar vegano y que nadie lo coma, a tener un repertorio sólido de platos que toda la familia pide de nuevo — capítulo a capítulo, una herramienta concreta que hace más fácil el camino.",
  "chapters": [
    {
      "number": 1,
      "title": "Por qué lo intentaste y no funcionó (y no es tu culpa)",
      "description": "Valida el cansancio y la frustración de quien ya probó y se encontró con caras largas. Muestra el mecanismo detrás de la resistencia familiar — y por qué no tiene que ver con el sabor.",
      "key_concepts": [
        "El error más común al introducir vegano en familia: cambiar todo de golpe",
        "Por qué el rechazo familiar no tiene que ver con el gusto sino con el contraste",
        "La diferencia entre 'cocina vegana' y 'comida de régimen' — y cómo tu familia lo confunde"
      ],
      "word_count_target": 900
    },
    {
      "number": 2,
      "title": "La estrategia del antes y después: más plantas, menos conflictos",
      "description": "El método gradual para introducir comida vegetal sin declarar una revolución alimentaria en casa. Transición sin peleas ni ultimátums.",
      "key_concepts": [
        "El principio de la adición antes de la sustitución",
        "Qué platos introducir primero para tener victorias rápidas en familia",
        "Cómo involucrar a los chicos en el proceso sin que lo sientan como una imposición"
      ],
      "word_count_target": 1050
    },
    {
      "number": 3,
      "title": "Proteínas vegetales que sí gustan: tofu, legumbres y más sin arruinarlos",
      "description": "Técnicas concretas para que las proteínas vegetales queden sabrosas, con textura, y sin el estigma de 'comida aburrida'.",
      "key_concepts": [
        "El error que hace que el tofu quede baboso (y los dos pasos para evitarlo)",
        "Cómo cocinar legumbres para que absorban sabor en lugar de neutralizarlo",
        "3 técnicas de textura que funcionan con adultos y chicos"
      ],
      "word_count_target": 1050
    },
    {
      "number": 4,
      "title": "Sabor sin carne: las bases de la cocina vegana que gustan a todos",
      "description": "Cómo construir platos llenos de sabor sin depender de la carne — umami, contraste, y técnica como herramientas principales.",
      "key_concepts": [
        "Las 5 fuentes de umami vegano que siempre funcionan",
        "Cómo balancear un plato vegano para que no quede plano",
        "Ingredientes del súper de la esquina que elevan cualquier plato vegetal"
      ],
      "word_count_target": 1050
    },
    {
      "number": 5,
      "title": "El repertorio familiar: 15 recetas base que tu familia va a pedir de nuevo",
      "description": "El núcleo del ebook: recetas concretas organizadas por tipo de plato, con variaciones para adaptar al gusto de cada familia.",
      "key_concepts": [
        "Criterios para elegir qué recetas sumar al repertorio familiar",
        "Cómo adaptar una receta vegana al gusto de los chicos sin hacer dos versiones",
        "Las 3 recetas de 'victoria fácil' para empezar esta semana"
      ],
      "word_count_target": 1050
    },
    {
      "number": 6,
      "title": "Planificación sin estrés: cocina vegana en la semana real",
      "description": "Cómo integrar la cocina vegana en la rutina sin que se sienta como trabajo extra — batch cooking, lista de compras y planificación semanal.",
      "key_concepts": [
        "El sistema de batch cooking vegano para familias: 2 horas de domingo, 4 cenas listas",
        "La lista de compras base que siempre tiene que estar en tu alacena",
        "Cómo planificar la semana sin decidir cada noche qué cocinar"
      ],
      "word_count_target": 1050
    },
    {
      "number": 7,
      "title": "Cuando alguien no quiere: cómo manejar la resistencia sin conflicto",
      "description": "Estrategias para convivir con resistencia activa — sin peleas, sin rendirse, y sin cocinar dos cenas distintas.",
      "key_concepts": [
        "La técnica del plato modular: cómo diseñar comidas que satisfacen a todos",
        "Qué decir (y qué no decir) cuando rechazan un plato vegano",
        "Cómo negociar con tu familia sin que parezca una negociación"
      ],
      "word_count_target": 1050
    },
    {
      "number": 8,
      "title": "Tu cocina vegana familiar de aquí en adelante",
      "description": "Consolida el método, celebra el camino recorrido, y da herramientas para seguir expandiendo el repertorio de forma autónoma.",
      "key_concepts": [
        "Cómo saber que el método está funcionando: señales concretas en las primeras semanas",
        "El próximo paso: incorporar más días veganos sin forzar",
        "Cómo seguir aprendiendo desde la cocina sin cursos ni recetarios caros"
      ],
      "word_count_target": 950
    }
  ]
}
```

**Por qué es el caso base:** 8 capítulos con tono `friendly` — verifica que el `narrative_arc` puede usar primera persona plural inclusiva ("Juntos vamos a pasar"), que los títulos acompañan emocionalmente ("y no es tu culpa", "de aquí en adelante"), y que el word_count_target aplica la tabla correcta (900 / 1050×6 / 950). Los capítulos del medio forman un arco lógico: estrategia de introducción → proteínas → sabor → recetas → organización → convivencia. El último consolida sin CTAs externos. Cada capítulo ataca un sub_problem o desire distinto del avatar.

---

### Ejemplo 2 — `pt-BR`, 6 capítulos, tono `educational`

**Variables de input:**
```
content_locale: "pt-BR"
topic: "Yoga para maiores de 40: como começar com segurança, respeitar o seu corpo e colher benefícios reais"
main_ebook_title: "Yoga depois dos 40: guia prático para começar com segurança e evoluir no seu próprio ritmo"
chapter_count: 6
tone: "educational"
avatar: {
  "description": "Homem ou mulher acima dos 40 que quer começar yoga mas sente que o próprio corpo é um obstáculo — pouca flexibilidade, lesões antigas, ou sem histórico consistente de exercício. Sabe que precisa se mover mais, mas teme se machucar ou não conseguir acompanhar uma aula regular.",
  "demographics": { "age_range": "40-60 anos", "gender": "misto", "location": "Brasil, grandes centros urbanos", "socioeconomic": "Classe média; tempo limitado, busca eficiência" },
  "pains": ["Tentou yoga antes mas desistiu porque não conseguia fazer as poses e se sentiu incapaz", "Tem medo de se machucar — já tem dores nas costas ou joelhos e não quer piorar", "Não sabe por onde começar: há muitos estilos e plataformas e não sabe o que é adequado para sua idade e condição"],
  "desires": ["Praticar yoga de forma consistente sem dor e sem se sentir o pior da turma", "Reduzir dores crônicas e melhorar a mobilidade no dia a dia", "Ter uma prática que possa sustentar por anos, não só por semanas"],
  "objections": ["Yoga é para gente flexível — meu corpo não é feito para isso", "Com mais de 40 é arriscado começar atividade física intensa, especialmente com lesões antigas"]
}
problem: {
  "core_problem": "Não tem um ponto de entrada seguro e estruturado para o yoga adequado à sua faixa etária — tenta com recursos genéricos, se frustra ou se machuca, e conclui que yoga não é para ele.",
  "sub_problems": ["Usa recursos criados para praticantes jovens e flexíveis, o que gera comparação paralisante ou risco real de lesão", "Não sabe distinguir o desconforto saudável do sinal de alerta — por isso para cedo ou vai longe demais", "Não tem critérios para avaliar se está evoluindo — sem referência de progresso, abandona antes de ver resultados"],
  "transformation": {
    "from": "Pessoa que acha que yoga não é para ela por causa da idade ou de limitações físicas",
    "to": "Praticante consistente que adapta o yoga ao seu corpo, entende seus limites, e colhe benefícios reais de mobilidade e bem-estar"
  },
  "urgency": "Cada mês sem movimento adequado aumenta a rigidez e a probabilidade de lesão no cotidiano. Começar com método agora é mais fácil do que começar depois com mais limitações."
}
```

**Output esperado:**
```json
{
  "title": "Yoga depois dos 40: guia prático para começar com segurança e evoluir no seu próprio ritmo",
  "subtitle": "Uma abordagem estruturada para adultos que querem os benefícios reais do yoga sem risco de lesão",
  "narrative_arc": "O leitor parte da convicção de que yoga não é para seu corpo, constrói progressivamente a compreensão da prática adaptada à sua faixa etária, e chega a uma rotina consistente com critérios objetivos de progresso — cada capítulo entrega um pilar do método.",
  "chapters": [
    {
      "number": 1,
      "title": "Por que o yoga convencional não foi feito para você — e o que muda com isso",
      "description": "Contextualiza por que recursos genéricos de yoga são inadequados para maiores de 40 e apresenta a premissa central: adaptação não é fraqueza, é método.",
      "key_concepts": [
        "A diferença fisiológica entre praticar yoga aos 25 e aos 45 anos",
        "Por que a maioria dos recursos pressupõe um corpo que você não tem — nem deveria ter",
        "O conceito de yoga adaptado: o que muda na prática e o que permanece igual"
      ],
      "word_count_target": 900
    },
    {
      "number": 2,
      "title": "Anatomia essencial para praticantes maduros: o que saber antes de começar",
      "description": "Apresenta os fundamentos anatômicos relevantes para a prática segura após os 40 — articulações, mobilidade funcional e regiões que merecem atenção especial.",
      "key_concepts": [
        "As 3 regiões de maior risco em praticantes maduros (coluna, joelhos, ombros) e como protegê-las",
        "Mobilidade funcional vs. flexibilidade: qual das duas o praticante acima dos 40 precisa desenvolver",
        "Como identificar contraindicações reais versus desconforto normal de adaptação"
      ],
      "word_count_target": 1100
    },
    {
      "number": 3,
      "title": "Os estilos de yoga e como selecionar o mais adequado para o seu perfil",
      "description": "Mapa dos principais estilos de yoga com critérios objetivos para escolher o mais indicado para iniciantes maduros.",
      "key_concepts": [
        "Hatha, Yin e Restaurativo: os 3 estilos mais recomendados para maiores de 40",
        "Como avaliar se um professor ou plataforma é adequado para iniciantes com limitações",
        "O critério de seleção: o que priorizar quando o objetivo é sustentar a prática por anos"
      ],
      "word_count_target": 1100
    },
    {
      "number": 4,
      "title": "Posturas fundamentais e suas modificações: um repertório seguro para iniciar",
      "description": "Apresenta as posturas base com variações e uso de props, com foco em execução segura para corpos com pouca flexibilidade ou lesões preexistentes.",
      "key_concepts": [
        "As 8 posturas essenciais com 2-3 modificações cada para coluna, joelhos e ombros limitados",
        "O papel dos props (blocos, cintos, cobertores) como ferramentas de segurança, não de fraqueza",
        "Como construir o repertório gradualmente sem sobrecarregar articulações"
      ],
      "word_count_target": 1100
    },
    {
      "number": 5,
      "title": "Como estruturar a prática semanal e mensurar o progresso real",
      "description": "Apresenta um plano de prática realista para iniciantes maduros e critérios objetivos para identificar evolução sem depender de poses avançadas como referência.",
      "key_concepts": [
        "O plano de prática das primeiras 8 semanas: frequência, duração e sequência recomendadas",
        "Os 4 indicadores de progresso que importam além da flexibilidade",
        "Como ajustar a prática em caso de dor, fadiga ou agenda sobrecarregada"
      ],
      "word_count_target": 1100
    },
    {
      "number": 6,
      "title": "Yoga como prática sustentável: critérios para evoluir com segurança a longo prazo",
      "description": "Consolida o método e oferece estratégias para sustentar a prática por anos — com critérios objetivos para avançar gradualmente sem risco.",
      "key_concepts": [
        "Os 3 fatores que determinam se uma prática de yoga se torna um hábito duradouro",
        "Como aprofundar a prática com segurança a partir dos 3 meses",
        "O critério para avaliar quando o praticante está pronto para avançar no nível de dificuldade"
      ],
      "word_count_target": 900
    }
  ]
}
```

**Por qué es útil:** 6 capítulos con tono `educational` — verifica que el word_count_target aplica la tabla correcta (900 / 1100×4 / 900) y que los títulos usan construcciones formales e impersonales ("como selecionar", "como mensurar"). El `narrative_arc` describe la transformación de manera estructurada, no emocional. El capítulo 2 introduce anatomía — autoridad por expertise, característica definitoria del tono educational. El último no tiene CTAs y proyecta hacia adelante con criterios objetivos. Verifica también que el output es pt-BR genuino (não tradução do espanhol).

---

### Ejemplo 3 — `en-US`, 10 capítulos, tono `professional`

**Variables de input:**
```
content_locale: "en-US"
topic: "Freelance writing for engineers: how to turn technical expertise into consistent writing income"
main_ebook_title: "The Technical Writer's Playbook: build a freelance writing income using what you already know"
chapter_count: 10
tone: "professional"
avatar: {
  "description": "A software engineer or technical professional who wants to build a freelance writing income on the side — or eventually replace their salary. They know their subject matter deeply but assume writing is a separate skill they don't have. Analytical, skeptical of passive income promises, and wants a method, not motivation.",
  "demographics": { "age_range": "28-42 years old", "gender": "mixed", "location": "US, Canada, remote-first tech markets", "socioeconomic": "Upper-middle class; stable tech salary, looking for income diversification or more autonomy" },
  "pains": ["They believe they can't write well enough to charge for it — even though they write documentation, RFCs, and Slack messages all day", "They don't know how to find clients or pitch, so they never start — the business side feels more intimidating than the writing", "They've seen too many 'make money writing' courses that assume the student has nothing but time and enthusiasm"],
  "desires": ["Earn $2,000–5,000/month writing about topics they already know deeply, without faking expertise", "Build a portfolio and client base that compounds — not chase one-off gigs forever", "Have the skills to go fully freelance if they choose, without a scary leap of faith"],
  "objections": ["I write code, not prose — I don't have a writing voice and I can't compete with English majors", "Getting clients sounds like sales, and I'm terrible at selling myself"]
}
problem: {
  "core_problem": "They have the most valuable asset in technical writing — deep domain expertise — but no system for turning it into paid work. So the expertise sits unused while they assume the barrier is writing skill, not business mechanics.",
  "sub_problems": ["They apply to general freelance writing jobs where they compete on prose quality — a losing battle against career writers with no technical background", "They don't know how to position their expertise as the product: 'backend engineer who writes' is worth 5x more than 'freelance writer' in the right market", "They wait to feel ready — better portfolio, better writing, more confidence — and never actually pitch anyone"],
  "transformation": {
    "from": "Engineer who thinks their writing isn't good enough to charge for",
    "to": "Technical freelance writer with a clear niche, a simple client pipeline, and predictable writing income alongside or instead of their salary"
  },
  "urgency": "Every month spent waiting is a month of compound growth not building. The market for technical writers with real domain expertise is underserved — the habit of waiting is the actual obstacle."
}
```

**Output esperado:**
```json
{
  "title": "The Technical Writer's Playbook: build a freelance writing income using what you already know",
  "subtitle": "A practical system for engineers and technical professionals who want to get paid to write — without starting over",
  "narrative_arc": "From engineer convinced their writing isn't good enough to charge for, to technical freelancer with a clear niche, a working client pipeline, and predictable income — ten chapters, each delivering one concrete piece of the business.",
  "chapters": [
    {
      "number": 1,
      "title": "Why your technical expertise is worth more than your writing (and how the market proves it)",
      "description": "Opens the loop by reframing the reader's core belief: the bottleneck isn't writing quality — it's positioning. Shows the real market dynamic for technical writers with domain expertise.",
      "key_concepts": [
        "The difference between general freelance writing and technical writing with domain expertise",
        "Why companies pay a premium for writers who understand the product, not just the words",
        "The belief that's keeping you from starting: 'I need to be a better writer first'"
      ],
      "word_count_target": 900
    },
    {
      "number": 2,
      "title": "Find your niche: how to turn your technical stack into a writing market",
      "description": "A structured method for identifying the 2-3 technical topics where your expertise creates an unfair advantage over general writers.",
      "key_concepts": [
        "The niche selection matrix: expertise depth × market demand × personal interest",
        "5 categories of technical writing with the highest demand and rates",
        "How to pick a starting niche without overthinking it — and when to change"
      ],
      "word_count_target": 1000
    },
    {
      "number": 3,
      "title": "Technical writing formats that pay: what to write and what to skip",
      "description": "Maps the main technical writing formats — developer docs, case studies, tutorials, whitepapers — with realistic rates and effort-to-income ratios.",
      "key_concepts": [
        "The 6 most common paid technical writing formats and their typical rate ranges",
        "Which formats work for a first-time portfolio with no published clips",
        "Why developer-focused content pays more than general B2B writing"
      ],
      "word_count_target": 1000
    },
    {
      "number": 4,
      "title": "Build your portfolio without waiting for a client to give you permission",
      "description": "How to create 3-5 portfolio pieces that demonstrate technical writing ability before landing the first paid client.",
      "key_concepts": [
        "The 3 types of spec work that actually impress technical clients",
        "How to use open-source documentation gaps as portfolio opportunities",
        "What a strong technical writing portfolio looks like — and what to leave out"
      ],
      "word_count_target": 1000
    },
    {
      "number": 5,
      "title": "Position yourself: how to write a bio and pitch that leads with expertise",
      "description": "Craft a writer identity that makes your technical background the feature, not the disclaimer. Includes pitch framing and LinkedIn/website positioning.",
      "key_concepts": [
        "The positioning formula: [specific expertise] + [specific format] + [specific client type]",
        "How to write a one-paragraph bio that converts skeptical technical clients",
        "Common positioning mistakes engineers make when transitioning to writing"
      ],
      "word_count_target": 1000
    },
    {
      "number": 6,
      "title": "Find your first clients: where technical writers with expertise actually get hired",
      "description": "A practical map of the channels where technical clients look for writers — and which ones work for someone without a writing track record yet.",
      "key_concepts": [
        "The 4 best channels for landing first technical writing clients (ranked by conversion rate)",
        "How to use your existing professional network without cold-pitching strangers",
        "Platforms and communities worth your time — and which ones to skip"
      ],
      "word_count_target": 1000
    },
    {
      "number": 7,
      "title": "How to pitch technical writing work without feeling like you're selling",
      "description": "A low-pressure outreach framework built around demonstrating expertise rather than convincing clients. Includes email templates and response handling.",
      "key_concepts": [
        "The expertise-first pitch structure: lead with insight, not with 'I'd love to work with you'",
        "How to handle scope, rate, and timeline objections without caving",
        "The follow-up cadence that keeps conversations alive without being annoying"
      ],
      "word_count_target": 1000
    },
    {
      "number": 8,
      "title": "Set your rates and negotiate without underselling your expertise",
      "description": "A practical guide to rate-setting for technical writers at different stages — including how to move from per-word to project rates as your positioning strengthens.",
      "key_concepts": [
        "Rate benchmarks for technical writing by format and client type",
        "Why per-word rates hurt technical writers more than general writers — and what to use instead",
        "How to handle 'what's your rate?' before you've fully decided"
      ],
      "word_count_target": 1000
    },
    {
      "number": 9,
      "title": "Deliver great work and build the client relationships that compound",
      "description": "How to execute a technical writing project efficiently and turn one-time clients into recurring revenue through professionalism and clear communication.",
      "key_concepts": [
        "The technical writing workflow: research, outline, draft, review — adapted from engineering practices",
        "How to handle feedback and revisions without letting scope creep happen",
        "The 3 things that turn one-time projects into long-term client relationships"
      ],
      "word_count_target": 1000
    },
    {
      "number": 10,
      "title": "Build from here: your path from side income to full freelance (if you want it)",
      "description": "Consolidates the full system and maps a realistic progression from first client to stable freelance income — with honest milestones, not motivational claims.",
      "key_concepts": [
        "The realistic progression from first client to $3k/month in technical writing income",
        "How to evaluate when — and whether — to go fully freelance",
        "The compounding assets you're building: portfolio, network, and rate authority"
      ],
      "word_count_target": 950
    }
  ]
}
```

**Por qué es útil:** 10 capítulos con tono `professional` — verifica que el word_count_target aplica correctamente la tabla de 10 caps (900 / 1000×8 / 950). Los títulos son específicos y benefit-forward, con voz experta clara sin exceso de informalidad. El capítulo 1 reencuadra la creencia central (el problema no es la escritura, es el posicionamiento) sin cargar con método. El último usa "honest milestones, not motivational claims" — coherente con el avatar analítico y escéptico. El `narrative_arc` es directo y específico. Verifica también que el modelo puede construir un arco coherente para un caso completamente nuevo (no basado en los personajes del wizard de Día 1).

---

## 8. Casos límite

| Caso | Input | Comportamiento esperado |
|------|-------|-------------------------|
| `chapter_count` inválido | `chapter_count: 7`, `chapter_count: 5`, `chapter_count: 15` | `{"error":"INVALID_INPUT","reason":"chapter_count debe ser 6, 8, 10 o 12."}` — validar en UI antes de llamar; el selector solo expone los 4 valores válidos |
| `tone` inválido | `tone: "neutral"`, `tone: "casual"` | `{"error":"INVALID_INPUT","reason":"tone must be professional, friendly, inspirational, direct, or educational."}` — el selector de UI lo previene |
| `avatar` con error | `avatar` contiene campo `"error"` | No llamar al prompt — resolver el avatar en el wizard primero |
| `problem` con error | `problem` contiene campo `"error"` | No llamar al prompt — resolver el problema en el wizard primero |
| `main_ebook_title` vacío | `main_ebook_title: ""` | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de llamar |
| `topic` vacío | `topic: ""` | `{"error":"INVALID_INPUT","reason":"..."}` — validar en UI antes de llamar |
| Inputs en idioma distinto al locale | `content_locale: "es"`, avatar/problem generados en `en-US` | Output completo en `es`; el modelo cross-traduce el contexto de avatar y problem |
| `chapter_count: 12` | Máximo número de capítulos | Generar exactamente 12; aplicar ~950w para caps 2-11 y ~900w para caps 1 y 12 |
| Topic muy amplio | `topic: "bienestar personal"` | Generar igualmente; el modelo usa avatar y problem para compensar la amplitud del topic. El `narrative_arc` se convierte en el ancla de coherencia. |
| Usuario edita el índice antes de aprobar | Drag-and-drop, rename, add/remove capítulos en la UI | El JSON editado es el que se almacena en `index_json` y alimenta `generate-chapter`. El prompt no se vuelve a llamar por ediciones del usuario. |

---

## 9. Notas de iteración

### Historial

| Fecha | Versión | Cambio | Razón |
|-------|---------|--------|-------|
| 2026-04-08 | v1.0 | Versión inicial | Primer prompt del flujo de Contenido (Día 2); ancla del pipeline de generación de capítulos |

### Decisiones descartadas

- **Temperatura `0.3` (más determinista):** el README recomienda `0.3` para índices/TOC. Se mantuvo en `0.5` porque los títulos de capítulos necesitan variedad suficiente para sonar distintos entre proyectos del mismo nicho — dos proyectos de "velas artesanales" no deben generar el mismo índice. Las reglas del system garantizan la coherencia estructural; la temperatura evita la homogeneidad.
- **Campo `estimated_reading_time` por capítulo:** se evaluó agregar el tiempo estimado de lectura en minutos. Descartado: derivable del `word_count_target` (≈ 200 palabras/minuto) — información redundante que infla el JSON sin agregar valor.
- **Múltiples opciones de `narrative_arc` para que el usuario elija:** se evaluó devolver 2-3 alternativas de arco. Descartado: la complejidad de la UI de selección no justifica el beneficio; el arc es interno al pipeline y el usuario no lo ve directamente.
- **Campo `prerequisite_chapter` entre capítulos:** para marcar dependencias de conceptos entre capítulos. Descartado en v1.0 por complejidad innecesaria — el `narrative_arc` cumple esa función a nivel de flujo sin agregar estructura al JSON.
- **Conteo fijo de key_concepts (exactamente 4, no "3 a 5"):** se evaluó para lograr consistencia visual en la UI del índice. Descartado: entre 3 y 5 permite adaptar la profundidad al capítulo — capítulos más concretos tienen 3 conceptos claros, los más complejos pueden tener 5.
- **Separar `title` del ebook del output (pasarlo solo como variable sin devolverlo):** para evitar redundancia con el input `{main_ebook_title}`. Descartado: el modelo puede proponer un `title` levemente refinado respecto al input (especialmente cuando el usuario editó el título en el wizard). Retornarlo en el JSON permite al frontend mostrar el título definitivo del ebook desde `index_json`.

### Próximos experimentos

- [ ] Testear temperatura `0.4` vs `0.5` — ¿produce arcos narrativos más coherentes o títulos más repetitivos entre proyectos del mismo nicho?
- [ ] Evaluar si pasar `problem.sub_problems` como lista explícita en el user template (además del JSON completo de `{problem}`) mejora la asignación 1:1 de sub-problemas a capítulos
- [ ] Medir si agregar el `angle` del topic (de `optimize-topic`) como variable explícita mejora la coherencia tonal del índice con el posicionamiento elegido
- [ ] Testear si el ejemplo en el system prompt (6 caps, friendly) es suficiente para el caso de `chapter_count: 12` o si conviene un segundo ejemplo mini para el extremo superior
- [ ] Evaluar si el `narrative_arc` inyectado como variable en `generate-chapter` mejora la coherencia de voz entre capítulos, o si los capítulos son suficientemente coherentes con solo el `index_json` completo como contexto

### Problemas conocidos en producción

- _Ninguno registrado._
