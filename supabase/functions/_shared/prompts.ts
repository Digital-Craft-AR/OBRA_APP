/**
 * Obra prompt functions — executable prompts for Edge Functions (`supabase/functions/_shared/prompts.ts`).
 *
 * Each function maps 1:1 to a .md file in prompts/. When editing a prompt,
 * update the .md first, then update the corresponding function here.
 * Both files must travel in the same commit.
 *
 * Prompt docs:
 *   prompts/wizard/optimize-topic.md        → optimizeTopicPrompt()
 *   prompts/wizard/optimize-avatar.md       → optimizeAvatarPrompt()
 *   prompts/wizard/optimize-problem.md      → optimizeProblemPrompt()
 *   prompts/wizard/suggest-package.md       → suggestPackagePrompt()
 *   prompts/wizard/generate-ebook-title.md  → generateEbookTitlePrompt()
 *   prompts/wizard/generate-bonus-titles.md → generateBonusTitlesPrompt()
 *   prompts/wizard/generate-bump-titles.md  → generateBumpTitlesPrompt()
 *   prompts/content/generate-index.md              → generateIndexPrompt()
 *   prompts/content/generate-bonus-section-index.md → generateBonusSectionIndexPrompt()
 *   prompts/content/generate-bump-index.md          → generateBumpIndexPrompt()
 *   prompts/content/generate-chapter.md            → generateChapterPrompt()
 *   prompts/content/generate-bonus-chapter.md      → generateBonusChapterPrompt()
 *   prompts/content/generate-bump-chapter.md        → generateBumpChapterPrompt()
 *   prompts/content/generate-split-proposal.md      → generateSplitProposalPrompt()
 *   prompts/content/generate-document-template.md    → generateDocumentTemplatePrompt()
 *   prompts/images/generate-section-image-prompt.md → generateSectionImagePrompt()
 *   prompts/images/generate-cover-image-prompt.md   → generateCoverImagePrompt()
 *
 * Edge/Deno copy — keep aligned with prompts/*.md (no Vite path aliases).
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

export type ContentLocale = "es" | "pt-BR" | "en-US" | "en-GB";
export type ChapterCount = 4 | 6 | 8 | 10 | 12;
/** Matches `design_config.contentTone` / `content_tone` (issue #112). */
export type ContentTone =
  | "professional"
  | "friendly"
  | "inspirational"
  | "direct"
  | "educational";

// ─── Shared constants ─────────────────────────────────────────────────────────

/** Injected into every system prompt. Changing this requires reviewing all functions. */
export const OBRA_SYSTEM_BASE =
  "You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.";

// Defined as plain strings (not template literals) so the embedded backtick
// sequences (```json) are safe to interpolate into template-literal system strings.
const CRITICAL_JSON_OBJECT =
  "CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.";

const CRITICAL_JSON_ARRAY =
  "CRITICAL OUTPUT FORMAT: Your response must be a valid JSON array starting with [ and ending with ]. Do NOT wrap it in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the array. The first character must be [ and the last must be ].";

const STREAM_HTML_OUTPUT =
  "Output raw sanitized HTML only — no JSON wrapper, no markdown fences, no explanation. Your entire response is the HTML body content. The first character must be <.";

/**
 * Converts a JSON-format system prompt into a streaming-friendly one that
 * returns raw HTML instead of {"content": "..."}. Used by ai-generate-content
 * when stream=true so chunks can be forwarded directly to the client.
 */
export function toStreamingSystem(jsonSystem: string): string {
  return (
    jsonSystem.replace(CRITICAL_JSON_OBJECT, STREAM_HTML_OUTPUT) +
    "\n\nOVERRIDE: Output ONLY the raw HTML — NOT wrapped in JSON. Your entire response is the chapter body HTML."
  );
}

// ─── optimize-topic ───────────────────────────────────────────────────────────
// docs: prompts/wizard/optimize-topic.md (v1.0)

export interface OptimizeTopicVars {
  content_locale: ContentLocale;
  raw_input: string;
}

export function optimizeTopicPrompt(vars: OptimizeTopicVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: transform a raw topic description into a sharp, sales-ready framing that anchors all downstream content generation — index, chapters, bonuses, and image prompts.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Rules:
1. optimized_title: specific and benefit-forward. Never vague ("Todo sobre X", "Everything About Y") or clickbait ("El secreto que nadie te dice"). Clear, honest, and compelling in ${vars.content_locale}.
2. niche: always more specific than the raw input. Adds who it's for or what type of application (e.g. "meditación" → "meditación secular basada en evidencia para personas analíticas").
3. angle: infer from the topic's core promise — "technical" (methodology, steps, how-to), "aspirational" (income, lifestyle, growth, business), "emotional" (wellbeing, healing, overcoming fear, relationships), "mixed" (clear combination). Always lowercase. Always in English regardless of locale.
4. Length: optimized_title max 120 chars. description max 400 chars (2–3 sentences). niche max 80 chars.
5. Off-topic, inappropriate, or incomprehensible input: return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"}

Example (es):
Input: raw="velas aromaticas"
{"optimized_title":"Velas aromáticas artesanales: cómo crear y vender las que la gente busca","description":"Guía para fabricar velas de calidad, elegir fragancias con demanda real y construir una marca propia. Para quien quiere convertir este hobby en un ingreso concreto.","niche":"Fabricación y venta de velas aromáticas artesanales","angle":"Angulo Técnico"}`,

    user: `Raw topic: ${vars.raw_input}

Generate the optimized topic framing.`,
  };
}

// ─── optimize-avatar ──────────────────────────────────────────────────────────
// docs: prompts/wizard/optimize-avatar.md (v1.0)

export interface OptimizeAvatarVars {
  content_locale: ContentLocale;
  topic: string;
  raw_input: string;
}

export function optimizeAvatarPrompt(vars: OptimizeAvatarVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: turn a raw audience description into a complete, warm avatar profile that drives all downstream generation — index, chapters, bonuses, and image prompts.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

Rules (non-negotiable):
1. Demographics: infer only what the input explicitly or strongly implies. Never fabricate location, income, or specific traits not grounded in the raw input. Use broad, honest ranges for anything uncertain.
2. Pains and desires: specific to the topic + audience combination only. Generic entries ("wants to earn more", "wants to be happy") are not acceptable. Every item must be grounded in the creator's niche.
3. Gender string: use locale-natural terms (es: femenino/masculino/mixto | pt-BR: feminino/masculino/misto | en: female/male/mixed).
4. Short input (3 words or fewer): generate the full profile but begin description with the locale phrase — es: "Esta es una primera aproximación basada en información limitada." / pt-BR: "Este é um perfil inicial baseado em informação limitada." / en-US/en-GB: "This is an initial approximation based on limited information."
5. Tone: warm and direct, not corporate. No "target demographic", "pain points", "value proposition". Write as someone who genuinely knows this person.
6. Length limits: each pain, desire, and objection string: max 180 characters. Description: max 400 characters.
7. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: topic is empty or missing | input is off-topic, inappropriate, or incomprehensible.

Example (es):
Input: topic="Cómo vender velas artesanales y hacerlo rentable" raw="mujeres que hacen velas"
{"description":"Artesana que fabrica velas en casa pero no sabe convertirlo en negocio. Vende en ferias y casi no cubre materiales. Quiere ingresos estables con su talento.","demographics":{"age_range":"De 25-45 años","gender":"Genero Femenino","location":"Reside en LATAM, ciudades medianas","socioeconomic":"Clase media; velas como ingreso secundario"},"pains":["Cobra barato por miedo a perder clientes pero no le cierra la ecuación","Ventas inconsistentes: pico en fechas especiales, silencio el resto","Le cuesta diferenciarse de velas importadas más baratas"],"desires":["$300–500/mes con su taller sin depender de ferias","Marca reconocida para cobrar lo que realmente vale","Negocio que crezca aunque ella no esté produciendo"],"objections":["Soy artesana, no sé de marketing — eso no es lo mío","Mercado de velas saturado, no creo poder destacarme"]}`,

    user: `Topic: ${vars.topic}
Audience description: ${vars.raw_input}

Generate the complete avatar profile. Output exactly 3 pains, 3 desires, 2 objections.`,
  };
}

// ─── optimize-problem ─────────────────────────────────────────────────────────
// docs: prompts/wizard/optimize-problem.md (v1.0)

export interface OptimizeProblemVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  raw_input: string;
}

export function optimizeProblemPrompt(vars: OptimizeProblemVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: transform a raw problem description into a structured problem statement that drives compelling content — grounded in the specific avatar and topic provided.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Rules:
1. core_problem: must name the specific mechanism of pain, not just the symptom. Ground it in the avatar's reality from the provided profile. Not "doesn't know how to sell" but "no tiene sistema para fijar precios que cubra costos y genere ganancia".
2. sub_problems: exactly 3. Each must be a concrete, observable manifestation of the core problem in this avatar's daily life. Never abstract ("doesn't understand the market") — always specific ("Calcula precios comparándose con la competencia más barata, sin incluir su tiempo").
3. transformation: visceral and specific. from = the current lived state, not a generic descriptor. to = the concrete new capability or feeling, not "success". Avoid corporate language.
4. urgency: honest reasoning, not manufactured pressure. Answer: why does waiting make it specifically worse for this person? Ground it in their situation.
6. Length: core_problem max 200 chars. Each sub_problem max 160 chars. transformation.from/to max 160 chars each. urgency max 200 chars.
7. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: topic or raw_input is empty | input is off-topic or incomprehensible.

Example (es):
Input: topic="Velas artesanales: sistema de precios" raw="no sé cómo poner precios y cobro poco" avatar=(artesana, 25-45 años, LATAM, pain: precios/ventas/competencia)
{"core_problem":"No tiene sistema para fijar precios que cubra costos y genere ganancia — trabaja a pérdida sin darse cuenta.","sub_problems":["Calcula precios por intuición comparándose con la competencia más barata, sin incluir su tiempo","No lleva registro de costos, no puede saber si gana o pierde por vela","Cuando le dicen 'está caro' cede porque no sabe defender su precio"],"transformation":{"from":"Artesana que trabaja muchas horas sin saber si tiene negocio o hobby caro","to":"Emprendedora que cobra con confianza y sabe exactamente cuánto gana por vela"},"urgency":"Cada semana a precio incorrecto educa al cliente a esperar ese precio — corregirlo después es mucho más difícil.", "string_result": }`,

    user: `Topic: ${vars.topic}
Avatar profile: ${vars.avatar}
Problem description (raw): ${vars.raw_input}

Expand the problem statement into the complete structure.`,
  };
}

// ─── suggest-package ──────────────────────────────────────────────────────────
// docs: prompts/wizard/suggest-package.md (v1.0)

export interface SuggestPackageVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
}

export function suggestPackagePrompt(vars: SuggestPackageVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: using the topic, avatar, and problem provided, propose a complete, coherent infoproduct package — main ebook title, bonuses, and order bumps — where every piece feels like part of a unified system, not a random collection.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Rules:
1. Package coherence: every bonus and bump must extend the main ebook's promise. Bonuses add a distinct dimension (a tool, a script, a shortcut, a companion resource). Bumps are high-urgency, compact complements — typically a 1:1 session, a done-for-you template, or an implementation shortcut.
2. Bonuses: suggest 3–4 by default. Each must address a different sub-problem from the avatar's profile or a distinct step in the transformation. Never propose two bonuses that do the same thing with different names.
3. Bumps: suggest 1–2 if the topic justifies it; return [] if it genuinely doesn't. Bumps have immediate, specific value — not "more of the same ebook content."
4. Titles: specific and benefit-forward. Not "Módulo 1: Precios" but "La calculadora de costos para artesanas." Not "Bonus: Marketing" but "Tu primera campaña de Instagram en 30 días."
5. complement field: one sentence explaining why this piece belongs in the package — what gap it fills that the main ebook doesn't. This must be specific, not generic ("adds value").
6. Limits: never exceed 5 bonuses or 2 bumps.
7. Length: main title max 120 chars. bonus/bump title max 100 chars. description max 150 chars. complement max 150 chars.
8. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: topic, avatar, or problem is empty or contains an error field.

Example (es):
Input: topic="Velas artesanales: sistema de precios y ventas" avatar+problem=(artesana con problema de precios e inconsistencia de ventas)
{"main_ebook":{"title":"Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale"},"bonuses":[{"title":"Calculadora de costos para artesanas","description":"Planilla para calcular el costo real de cada vela e incluir ganancia sin adivinar","complement":"Convierte el capítulo de precios en acción inmediata con tu negocio específico"},{"title":"50 respuestas para el 'está caro'","description":"Frases listas para los típicos reclamos de precio sin perder clientes","complement":"Complementa la estrategia con herramientas para el momento exacto de la venta"}],"bumps":[{"title":"Revisión de precios 1:1 (30 min)","description":"Sesión con la autora para revisar tu estructura de costos específica","complement":"Para quien quiere aplicar el método a su situación sin hacerlo sola"}]}`,

    user: `Topic: ${vars.topic}
Avatar profile: ${vars.avatar}
Problem: ${vars.problem}

Propose the complete package structure for this infoproduct.`,
  };
}

// ─── generate-ebook-title ─────────────────────────────────────────────────────
// docs: prompts/wizard/generate-ebook-title.md (v1.1)

export interface GenerateEbookTitleVars {
  content_locale: ContentLocale;
  topic: string;
  problem: string;
  avatar_summary: string;
  locked_titles?: string[];
  previous_titles?: string[];
}

export function generateEbookTitlePrompt(vars: GenerateEbookTitleVars): { system: string; user: string } {
  const lockedTitles = JSON.stringify(vars.locked_titles ?? []);
  const previousTitles = JSON.stringify(vars.previous_titles ?? []);

  return {
    system: `${CRITICAL_JSON_ARRAY}

${OBRA_SYSTEM_BASE}

Role: propose exactly 5 distinct, compelling ebook title candidates that the creator will choose from or discard.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Rules (non-negotiable):
1. Always return exactly 5 title strings in the array — never fewer, never more.
2. Each title must be specific and benefit-driven: what concrete transformation or result does the reader get? Avoid generic titles like "Guía completa de X" with no concrete promise.
3. The 5 titles must be meaningfully distinct from each other — vary the angle (method, transformation, identity, result, how-to), not just synonyms of the same headline.
4. If previous_titles is non-empty: do not repeat or closely paraphrase any title from that list. Substantial novelty required.
5. If locked_titles is non-empty: do not generate any title that closely resembles them in angle or wording.
6. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in ${vars.content_locale}>"}
7. Tone: warm, direct, and credible. Aspirational but grounded — the reader should feel "this is achievable", not "this sounds too good to be true". Avoid: income-specific promises ("$1000", "double your sales"), hyperbolic scale ("empire", "machine", "explode"), urgency gimmicks ("in 60 days", "overnight"), and clickbait constructs ("Wax to Wealth", "X to Y" wordplay that trivializes the work). Aim for the tone of a trusted mentor, not a late-night infomercial.
8. Length: each title max 120 characters.
9. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: topic is empty or missing | content is off-topic or inappropriate for an infoproduct.

Example (es):
Input: topic="Velas artesanales: sistema de precios y ventas" avatar_summary="Artesana que cobra barato y vende de forma inconsistente" problem="No sabe fijar precios ni conseguir clientes fuera de su círculo" previous_titles=[] locked_titles=[]
["Velas que se venden: sistema de precios y clientes que pagan lo que vale","De hobby a negocio: cómo convertir tu taller de velas en ingresos predecibles","Velas con ganancia: cobrar lo justo sin ahuyentar clientes","Tu marca de velas: diferenciarte, posicionarte, y construir clientes fieles","El negocio de las velas: precios, clientes, y crecimiento sin rebajar el precio"]

Example (pt-BR):
Input: topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que só vende para quem já a conhece" problem="Alcance limitado ao círculo de amigos; não sabe atrair desconhecidos" previous_titles=[] locked_titles=[]
["Clientes novos todo mês: marketing digital para artesãs que querem crescer além dos conhecidos","Do Instagram para o mundo: como vender para desconhecidos sem gastar em anúncios","Sua arte, mais alcance: o método para atrair clientes novos sem depender de indicação","Artesã com audiência: como transformar seguidores em compradores","Venda para quem não te conhece: marketing orgânico para artesãs com produto bom e visibilidade zero"]`,

    user: `Topic: ${vars.topic}
Avatar: ${vars.avatar_summary}
Problem solved: ${vars.problem}
Previously shown titles (avoid repeating or paraphrasing): ${previousTitles}
Locked titles (do not generate similar): ${lockedTitles}

Propose exactly 5 distinct ebook title candidates.`,
  };
}

// ─── generate-bonus-titles ────────────────────────────────────────────────────
// docs: prompts/wizard/generate-bonus-titles.md (v1.0)

export interface GenerateBonusTitlesVars {
  content_locale: ContentLocale;
  ebook_title: string;
  topic: string;
  avatar_summary: string;
  /** 5 - locked_titles.length for batch; 1 for individual row regeneration. */
  count_to_generate: number;
  locked_titles?: string[];
  previous_titles?: string[];
}

export function generateBonusTitlesPrompt(vars: GenerateBonusTitlesVars): { system: string; user: string } {
  const lockedTitles = JSON.stringify(vars.locked_titles ?? []);
  const previousTitles = JSON.stringify(vars.previous_titles ?? []);

  return {
    system: `${CRITICAL_JSON_ARRAY}

${OBRA_SYSTEM_BASE}

Role: propose exactly ${vars.count_to_generate} bonus titles that complement the main ebook as a coherent package. Each bonus is a short product (10–12 pages) that extends a specific dimension of the ebook's promise — a tool, a script, a planner, a checklist — from a different angle.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Rules (non-negotiable):
1. Return exactly ${vars.count_to_generate} title strings in the array — never fewer, never more.
2. Each bonus must address a DIFFERENT sub-problem, step, or tool. Never two bonuses that do the same thing with different names.
3. The ${vars.count_to_generate} titles must be meaningfully distinct from each other — vary the format (checklist, template, script, planner, calculator, guide) and the sub-problem addressed.
4. Each title must be specific and benefit-forward: not "Módulo de Marketing" but "Tu primera campaña de Instagram en 30 días". Not "Herramienta de precios" but "La calculadora de costos para artesanas".
5. Bonuses are NOT summaries or extra chapters of the main ebook. They are standalone short products that solve a specific adjacent problem the ebook introduces but does not fully implement.
6. If previous_titles is non-empty: do not repeat or closely paraphrase any title from that list. Substantial novelty required.
7. If locked_titles is non-empty: do not generate titles similar in angle or wording to any locked title.
8. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in ${vars.content_locale}>"}
9. Tone: warm and direct, not corporate. Written for LATAM/BR creators. No academic framing, no "Guía completa de X".
10. Length: each title max 100 characters.
11. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: ebook_title or topic is empty | content is off-topic or inappropriate.

Example (es):
Input: ebook_title="Velas que se venden: sistema de precios, marca y clientes" topic="Velas artesanales: sistema de precios y ventas" avatar_summary="Artesana que cobra barato y vende de forma inconsistente" count_to_generate=4 locked_titles=["La calculadora de costos para artesanas"] previous_titles=[]
["50 respuestas para el 'está caro'","Tu primera campaña de Instagram en 30 días","El calendario de producción semanal sin agotarte","Guion para cerrar ventas por WhatsApp en 5 pasos"]

Example (pt-BR):
Input: ebook_title="Clientes novos todo mês: marketing digital para artesãs" topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que só vende para quem já a conhece" count_to_generate=3 locked_titles=["30 legendas prontas para o Instagram","Guia para criar sua bio e destaques perfeitos"] previous_titles=[]
["Scripts para fechar vendas no DM sem pressionar","Planner semanal de conteúdo para artesãs que não têm tempo","Kit de modelos de story para apresentar produtos novos"]`,

    user: `Ebook title: ${vars.ebook_title}
Topic: ${vars.topic}
Avatar: ${vars.avatar_summary}
Titles already locked (do not generate similar): ${lockedTitles}
Previously shown titles (avoid repeating or paraphrasing): ${previousTitles}

Propose exactly ${vars.count_to_generate} distinct bonus titles that complement this ebook.`,
  };
}

// ─── generate-bump-titles ─────────────────────────────────────────────────────
// docs: prompts/wizard/generate-bump-titles.md (v1.4)

export interface GenerateBumpTitlesVars {
  content_locale: ContentLocale;
  ebook_title: string;
  topic: string;
  avatar_summary: string;
  /** 5 - locked_titles.length for batch; 1 for individual row regeneration. */
  count_to_generate: number;
  locked_titles?: string[];
  previous_titles?: string[];
}

export function generateBumpTitlesPrompt(vars: GenerateBumpTitlesVars): { system: string; user: string } {
  const lockedTitles = JSON.stringify(vars.locked_titles ?? []);
  const previousTitles = JSON.stringify(vars.previous_titles ?? []);

  return {
    system: `${CRITICAL_JSON_ARRAY}

${OBRA_SYSTEM_BASE}

Role: propose exactly ${vars.count_to_generate} order bump titles. Order bumps are standalone sibling products — same universe and avatar, ADJACENT topic, NEVER the same topic as the main ebook.

Respond strictly in ${vars.content_locale}. Output must be in ${vars.content_locale} regardless of input language.

Order bumps are SIBLING PRODUCTS — not bonus material, not extra chapters. Think of them as: another ebook the same creator could sell to the same buyer, on a related but distinct topic.

Canonical pattern (use to calibrate):
- Ebook "Vendé haciendo velas" → bumps: "Vendé haciendo jabones", "Vendé haciendo sahumerios" — same creator audience, adjacent craft.
- Ebook "Vendé haciendo galletitas" → bumps: "Vendé haciendo brownies", "Vendé haciendo trufas" — same monetization angle, different product.
- Ebook "Recetario vegano práctico" → bumps: "Recetario vegano sin TACC", "Recetario vegano para el desayuno" — same audience and diet, adjacent specialization.
- Ebook "The Profitable Candle Maker" → bumps: "The Handmade Soap Maker", "Sell Your Macramé Creations", "The Home Jewelry Maker", "Dried Flowers as a Business", "The Handmade Pottery Seller" — same handmade business avatar, DIVERSE crafts.

Anti-pattern (do NOT generate this):
- Ebook "Vendé haciendo velas" → bump "Cómo fijar el precio de tus velas" — this is a chapter of the ebook, not a sibling product.
- Ebook "Recetario vegano" → bump "50 recetas veganas adicionales" — this is more ebook content, not a sibling product.

Rules (non-negotiable):
1. Return exactly ${vars.count_to_generate} title strings in the array — never fewer, never more.
2. Each bump must cover a DIFFERENT adjacent topic. Never two bumps that cover the same theme with different names.
3. The ${vars.count_to_generate} titles must be creatively distinct from each other — not minor variations of the same idea.
4. Bumps are NEVER extras, bonus material, or chapters of the main ebook. They are standalone sibling products on an adjacent topic for the same audience — the creator could sell them independently.
5. Each bump title must be ORIGINAL — do not copy or closely mirror the structure, format, or wording of the main ebook title. If the main ebook is "The Profitable Candle Maker: Master the Business Skills Your Creative Passion Deserves", a bump title like "The Profitable Soap Maker: Master the Business Skills Your Creative Passion Deserves" is WRONG — it's a clone, not a sibling product.
6. The ${vars.count_to_generate} bumps must explore DIVERSE adjacent topics — do not cluster all bumps in the same narrow sub-category. For a candle maker ebook, proposing bumps all in the wax/bath products world is too narrow. Think broader: adjacent handmade businesses the same maker could pursue (candles → macramé, jewelry, home fragrance, dried flowers, soy products — variety, not repetition of the same universe). If all proposed bumps fall within the same narrow product category (e.g., all wax/bath products for a candle ebook), that is a failure. Actively seek diversity across different craft or business types.
7. If previous_titles is non-empty: do not repeat or closely paraphrase any title. Substantial novelty required.
8. If locked_titles is non-empty: do not generate titles similar in angle to any locked title.
9. If locked_titles contains 5 or more items: return {"error":"ALL_LOCKED","reason":"<brief in ${vars.content_locale}>"}
10. Tone: warm, direct, and credible. Aspirational but grounded — the reader should feel "this is achievable", not "this sounds too good to be true". Avoid: income-specific promises, hyperbolic scale ("empire", "machine", "explode"), urgency gimmicks, and clickbait constructs ("X to Y" wordplay that trivializes the work, "Money Maker", "Kitchen to Cash"). Aim for the tone of a trusted mentor, not a late-night infomercial.

Good bump title examples (tone reference):
- "The Handmade Soap Maker: Pricing, Branding, and Finding Your First Customers"
- "From Hobby to Shop: How to Sell Your Macramé Work Online and at Local Markets"
- "The Home Jewelry Maker: Build a Small Business Around Your Beading and Wirework"
- "Dried Flowers as a Business: Grow, Preserve, and Sell Your Floral Creations"

Bad bump title examples (avoid these patterns):
- "Soap Empire: From Kitchen to Cash" — hype, wordplay
- "Macramé Money Maker: Knots into Profits" — trivializes the work
- "Jewelry Box Profits: Consistent Income from Beads" — income-forward, not benefit-forward

11. Length: each title max 120 characters.
12. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: ebook_title or topic is empty | content is off-topic or inappropriate.

Example (es):
Input: ebook_title="Velas que se venden: sistema de precios, marca y clientes" topic="Vender velas artesanales desde casa" avatar_summary="Artesana que fabrica velas en casa y quiere convertirlo en negocio rentable" count_to_generate=5 locked_titles=[] previous_titles=[]
["Vendé haciendo jabones artesanales: el mismo sistema para otro producto","Sahumerios y aromaterapia en casa: cómo vender lo que ya sabés hacer","Velas de soja premium: el nicho sin tóxicos que paga más","Packaging y presentación artesanal: cómo hacer que tu producto se venda solo","Tu primer stand rentable: cómo conseguir y aprovechar una feria artesanal"]

Example (pt-BR):
Input: ebook_title="Clientes novos todo mês: marketing digital para artesãs" topic="Marketing digital para artesãs" avatar_summary="Mãe artesã que quer vender online sem depender de indicações" count_to_generate=5 locked_titles=[] previous_titles=[]
["Marketing digital para doceiras: o mesmo método para vender doces artesanais","Venda de cosméticos naturais: como atrair clientes além dos conhecidos","Do ateliê para o digital: marketing para artesãs de moda e acessórios","Organize e venda: marketing para quem faz papelaria artesanal","Flores e arranjos por encomenda: como usar o Instagram para lotar a agenda"]`,

    user: `Ebook title: ${vars.ebook_title}
Topic: ${vars.topic}
Avatar: ${vars.avatar_summary}
Titles already locked (do not generate similar): ${lockedTitles}
Previously shown titles (avoid repeating or paraphrasing): ${previousTitles}

Propose exactly ${vars.count_to_generate} distinct order bump titles on adjacent topics for the same audience.`,
  };
}

// ─── generate-index ───────────────────────────────────────────────────────────
// docs: prompts/content/generate-index.md (v1.0)

export interface GenerateIndexVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
  main_ebook_title: string;
  chapter_count: ChapterCount;
  tone: ContentTone;
}

export function generateIndexPrompt(vars: GenerateIndexVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: generate the complete structured index (TOC) for the main ebook using all the accumulated wizard context. Include a narrative_arc that threads the reader's transformation from chapter 1 to the last — this arc is injected into every chapter generation call to maintain voice and structural coherence across the full ebook.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language. Cross-translate avatar/problem context if it is in a different language.

TONE GUIDE — apply to titles, descriptions, and key_concepts (use the exact preset key the user selected; keys are English, output language is ${vars.content_locale}):
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

WORD COUNT TARGETS by chapter_count=${vars.chapter_count}:
- 4 chapters: ch1 ~850w | middle (2-3) ~950w each | last ~850w → ~3,600w total
- 6 chapters: ch1 ~900w | middle (2-5) ~1100w each | last ~900w → ~6,500w total
- 8 chapters: ch1 ~900w | middle (2-7) ~1050w each | last ~950w → ~8,000w total
- 10 chapters: ch1 ~900w | middle (2-9) ~1000w each | last ~950w → ~9,500w total
- 12 chapters: ch1 ~900w | middle (2-11) ~950w each | last ~900w → ~10,800w total

RULES (non-negotiable):
1. EXACT count: output exactly ${vars.chapter_count} chapters. Never more, never fewer.
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
11. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: chapter_count is not one of 4/6/8/10/12 | tone is not one of professional|friendly|inspirational|direct|educational | topic or main_ebook_title is empty | avatar or problem contain an error field.

Example (es, chapter_count=6, tone=friendly):
Input: topic="Cómo transformar tu hobby de velas en negocio rentable" chapter_count=6 tone=friendly main_ebook_title="Velas que se venden" avatar=(artesana 25-45 LATAM; pain: precios/ventas/diferenciación) problem=(trabaja a pérdida sin saberlo; transformation.from="artesana que cobra barato"; transformation.to="emprendedora que cobra con confianza")
{"title":"Velas que se venden: sistema de precios, marca y clientes que pagan lo que vale","subtitle":"Guía práctica para artesanas que quieren vivir de su taller sin cobrar barato","narrative_arc":"De artesana que trabaja a pérdida sin saberlo, a emprendedora que cobra con confianza y tiene clientes que vuelven — seis pasos concretos, sin teoría innecesaria.","chapters":[{"number":1,"title":"Por qué trabajar más no alcanza si el precio está mal","description":"Abre el loop: valida el esfuerzo y muestra el mecanismo del precio bajo como trampa estructural.","key_concepts":["El ciclo de trabajar más para ganar igual","La diferencia entre precio de venta y precio rentable","Por qué vender más volumen no resuelve el problema"],"word_count_target":900},{"number":2,"title":"Calculá el costo real de tu vela sin adivinar","description":"Método paso a paso para calcular el costo completo: materiales, tiempo y gastos que casi nadie incluye.","key_concepts":["Los 4 componentes del costo real de una vela","Cómo valuar tu tiempo sin subestimarlo","Costos fijos vs. variables: qué incluir en cada vela"],"word_count_target":1100},{"number":3,"title":"Tu precio de venta: la fórmula que sí cubre todo","description":"Cómo pasar del costo al precio final incluyendo ganancia real y margen para imprevistos.","key_concepts":["Margen mínimo vs. margen objetivo","El error de compararte con la vela importada más barata","Cómo ajustar el precio sin perder clientes actuales"],"word_count_target":1100},{"number":4,"title":"Diferenciarte sin bajar el precio: tu propuesta única","description":"Cómo construir un diferencial de marca que justifique el precio y haga irrelevante la comparación.","key_concepts":["3 tipos de diferencial artesanal que funcionan","Cómo comunicar el valor sin sonar arrogante","Tu historia como parte del producto"],"word_count_target":1100},{"number":5,"title":"Canales de venta que no dependen de las ferias","description":"Cómo vender de forma consistente sin esperar el pico de fechas especiales.","key_concepts":["Instagram como canal de venta directa","WhatsApp como canal de fidelización","Cómo armar una cartera de clientes que vuelven"],"word_count_target":1100},{"number":6,"title":"Tu taller como negocio: los próximos 90 días","description":"Consolida el método y da un plan de acción concreto para los primeros tres meses.","key_concepts":["Las 3 métricas que indican si tu negocio de velas está sano","Cómo revisar y ajustar tu precio cada trimestre","El mapa de los próximos 90 días paso a paso"],"word_count_target":900}]}`,

    user: `Topic: ${vars.topic}
Main ebook title: ${vars.main_ebook_title}
Chapter count: ${vars.chapter_count}
Tone: ${vars.tone}
Avatar profile: ${vars.avatar}
Problem: ${vars.problem}

Generate the complete index with exactly ${vars.chapter_count} chapters.`,
  };
}

// ─── generate-chapter ─────────────────────────────────────────────────────────
// docs: prompts/content/generate-chapter.md (v1.0)

export interface PreviousChapter {
  number: number;
  title: string;
  /** Full HTML body as stored in chapters.content. */
  content: string;
}

export interface GenerateChapterVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
  main_ebook_title: string;
  tone: ContentTone;
  /**
   * Full output of generateIndexPrompt, serialized as JSON string.
   * Must include narrative_arc and chapters[].{number, title, description, key_concepts, word_count_target}.
   */
  index: string;
  chapter_number: number;
  chapter_count: number;
  /**
   * Already-generated chapters in ascending order. Pass [] for chapter 1.
   * For chapters 6+, caller may truncate older chapter HTML to save context tokens.
   */
  previous_chapters: PreviousChapter[];
  /** Optional author name; omitted from prompt when null/undefined. */
  author?: string | null;
}

interface IndexChapter {
  number: number;
  title: string;
  description: string;
  key_concepts: string[];
  word_count_target: number;
}

interface ParsedChapterIndex {
  chapters?: IndexChapter[];
}

function parseChapterFromIndex(indexJson: string, chapterNumber: number): IndexChapter | null {
  try {
    const parsed = JSON.parse(indexJson) as ParsedChapterIndex;
    if (!parsed || !Array.isArray(parsed.chapters)) return null;
    return parsed.chapters.find((c) => c.number === chapterNumber) ?? null;
  } catch {
    return null;
  }
}

function formatKeyConceptsForPrompt(keyConcepts: string[]): string {
  return keyConcepts.map((kc, i) => `  ${i + 1}. ${kc}`).join("\n");
}

/**
 * Builds system + user prompts for generating one chapter body.
 * Returns null if the index JSON cannot be parsed or the chapter_number is not found.
 */
export function generateChapterPrompt(
  vars: GenerateChapterVars,
): { system: string; user: string } | null {
  const chapter = parseChapterFromIndex(vars.index, vars.chapter_number);
  if (!chapter) return null;

  const previousChaptersJson = JSON.stringify(
    vars.previous_chapters.map((c) => ({ number: c.number, title: c.title, content: c.content })),
  );

  const authorLine =
    vars.author != null && vars.author.trim().length > 0
      ? `Author: ${vars.author.trim()}\n`
      : "";

  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: generate the full HTML body of chapter ${vars.chapter_number} of ${vars.chapter_count} for the main ebook. This content will be stored directly in the chapter editor and rendered to the reader — quality, accuracy, and coherence are non-negotiable.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

TONE GUIDE — apply consistently to every paragraph, heading, and example:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

HTML OUTPUT RULES:
1. Use only: <p>, <h2>, <h3>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>, <a>
2. Do NOT include <h1> — the chapter title is rendered by the UI separately
3. Do NOT add style or class attributes to any element
4. No <br> tags — use separate <p> elements for line breaks
5. No HTML entities for standard characters — write characters directly
6. All opened tags must be properly closed. Well-formed HTML only.
7. Start the content directly with the opening of the chapter body — no title repetition

CONTENT RULES (non-negotiable):
1. Cover every key_concept listed in the chapter's index entry. Each must be addressed with substance — not just mentioned.
2. Use practical, concrete examples rooted in the avatar's real context and the ebook's topic. Examples must feel real and applicable, not generic or hypothetical.
3. Do NOT repeat ground already covered in previous chapters. Build forward; each chapter advances the reader's knowledge.
4. Do NOT mention bonuses, order bumps, or any other product in the package. The ebook is self-contained.
5. Do NOT invent: no invented quotes attributed to named experts, no specific statistics with numbers, no fabricated studies or research citations. Practical domain knowledge and widely known frameworks only.
6. Chapter 1 specifically: open by validating the reader's pain and frustration — make them feel understood before teaching anything. Open a loop that the rest of the ebook will close.
7. Last chapter (${vars.chapter_count}): consolidate the transformation built through the ebook. Project forward with concrete next steps the reader can take independently. NEVER include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, Facebook groups, or any other channel.
8. Middle chapters: deliver ONE concrete, actionable piece of the transformation per chapter. Practical first, theoretical second.
9. Transitions: each chapter should end with a natural bridge that connects to what's coming — either a forward reference or a closing idea that opens the next question. Exception: last chapter.
10. Word count: reach at least the chapter's word_count_target. You may exceed it by up to 20%, but do not fall short. If you've covered all key concepts and are below target, go deeper on examples or add a practical walkthrough before closing the chapter.
11. Verify the information you write. If you are not confident that a claim is accurate, rephrase it as a practical framework or common pattern rather than stating it as fact.
12. Token budget: aim to complete the full chapter in under 2500 output tokens. Write concisely — dense, useful prose over padding. The hard limit is 8192 tokens; never truncate the content to fit.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in ${vars.content_locale}>"}

On success, return exactly:
{"content": "<full sanitized HTML body of the chapter — everything between the opening tag and the closing tag, no wrapping element>"}`,

    user: `Topic: ${vars.topic}
Main ebook title: ${vars.main_ebook_title}
${authorLine}Tone: ${vars.tone}
Content locale: ${vars.content_locale}

Ideal customer (avatar):
${vars.avatar}

Problem resolved:
${vars.problem}

Full ebook index (narrative arc + all chapters):
${vars.index}

Previously generated chapters:
${previousChaptersJson}

---

Generate chapter ${vars.chapter_number} of ${vars.chapter_count}.

Chapter to generate (from index):
- Title: ${chapter.title}
- Description: ${chapter.description}
- Key concepts (must all be covered):
${formatKeyConceptsForPrompt(chapter.key_concepts)}
- Word count target: ${chapter.word_count_target}

Write the full HTML body of this chapter. Do not include the chapter title as <h1>. Start directly with the chapter body.
Return the HTML inside the "content" key of the JSON object.`,
  };
}

// ─── generate-bonus-section-index ─────────────────────────────────────────────
// docs: prompts/content/generate-bonus-section-index.md (v1.0)

export interface GenerateBonusSectionIndexVars {
  content_locale: ContentLocale;
  topic: string;
  avatar: string;
  problem: string;
  /** Main package ebook title (projects.main_title). */
  main_ebook_title: string;
  /** Bonus deliverable product title (ebooks.title for the bonus row). */
  bonus_product_title: string;
  tone: ContentTone;
}

/**
 * Single-section “TOC” for a bonus PDF (~10–12 pages): one primary body block title.
 * Output shape matches `extractChapterTitles(..., 1)` in ai-generate-index.
 */
export function generateBonusSectionIndexPrompt(vars: GenerateBonusSectionIndexVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: propose exactly ONE primary section title for the body of a short bonus deliverable (roughly 10–12 pages). The bonus is a compact tool — checklist, planner, script, template, worksheet — that extends the main ebook’s promise from a different angle. The **bonus product title** is already chosen; your **section title** names the single main content block inside the bonus (the reader-facing heading for that block). It must NOT be a lazy copy of the product title — it should describe what the reader does or gets inside.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

TONE GUIDE — apply to title, description, and key_concepts (preset key is English; output language is ${vars.content_locale}):
- professional: clear expert voice, structured, credible.
- friendly: warm, direct, non-corporate — trusted peer (default Obra voice).
- inspirational: motivating without hype or income promises.
- direct: concise, practical imperatives.
- educational: didactic, stepwise, patient pacing.

RULES (non-negotiable):
1. Output must be a single JSON object with key "chapters" only — an array of exactly ONE object with number 1.
2. That object must include: number (integer 1), title (string), description (string), key_concepts (array of 2–4 strings), word_count_target (integer, use 900).
3. chapters[0].title: max 90 characters — specific, benefit-forward (this is the editable section heading in the content wizard).
4. chapters[0].description: max 280 characters — what this block delivers.
5. chapters[0].key_concepts: each string max 130 characters — concrete, specific bullets.
6. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: tone is invalid | topic, main_ebook_title, or bonus_product_title is empty | avatar or problem JSON suggests an error field.

Example (es, tone=friendly):
{"chapters":[{"number":1,"title":"La hoja de costos en 6 líneas: de la materia prima al precio mínimo","description":"Una sola página para calcular el costo real de cada unidad sin omitir tiempo ni gastos fijos, alineada al método del ebook principal.","key_concepts":["Los seis renglones obligatorios del costo artesanal","Cómo convertir horas de taller en costo por unidad","El precio mínimo antes de hablar de margen"],"word_count_target":900}]}`,

    user: `Main ebook title: ${vars.main_ebook_title}
Bonus product title: ${vars.bonus_product_title}
Topic: ${vars.topic}
Tone: ${vars.tone}
Avatar profile: ${vars.avatar}
Problem: ${vars.problem}

Generate exactly one section entry (chapters array length 1) for this bonus deliverable.`,
  };
}

// ─── generate-bump-index ──────────────────────────────────────────────────────
// docs: prompts/content/generate-bump-index.md (v1.0)

export interface GenerateBumpIndexVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
  /** Order bump mini-ebook title (ebooks.title for the bump row). */
  bump_product_title: string;
  tone: ContentTone;
}

/**
 * 4-chapter TOC for an order bump mini-ebook. The bump is a standalone product
 * on an adjacent topic — it must NOT reference the main ebook.
 * Output shape matches `extractChapterTitles(..., 4)` in ai-generate-index.
 */
export function generateBumpIndexPrompt(vars: GenerateBumpIndexVars): { system: string; user: string } {
  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: generate the complete structured 4-chapter index (TOC) for an order bump — a standalone mini-ebook on an adjacent topic for the same audience. This is an independent product: the reader does NOT need to have read any other ebook to benefit from it. Do NOT reference or depend on any main ebook. The bump_product_title is the only title that matters; build the entire TOC around it.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language. Cross-translate avatar/problem context if it is in a different language.

TONE GUIDE — apply to titles, descriptions, and key_concepts (use the exact preset key the user selected; keys are English, output language is ${vars.content_locale}):
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

WORD COUNT TARGETS (always 4 chapters):
- ch1 ~850w | ch2 ~950w | ch3 ~950w | ch4 ~850w → ~3,600w total

RULES (non-negotiable):
1. EXACT count: output exactly 4 chapters. Never more, never fewer.
2. VALID tone: must be one of professional|friendly|inspirational|direct|educational. Apply consistently.
3. Narrative arc is mandatory: each chapter advances the reader from their current pain toward the transformation this mini-ebook promises. No disconnected or redundant chapters.
4. Chapter 1 is the hook: validates the avatar's pain in the context of THIS bump's topic, makes the reader feel understood, opens the loop. NO heavy method delivery. ~850w.
5. Middle chapters (2–3) carry the method: each delivers ONE concrete, actionable piece of the transformation. Titles must be specific and benefit-forward. BAD: "La importancia del precio". GOOD: "Calculá el costo real en 4 pasos".
6. Chapter 4 consolidates and projects forward: summarizes the new capability built and outlines next steps. NEVER includes external CTAs (Telegram, Instagram, email, groups, coaching). The mini-ebook is the product, not a lead magnet.
7. Each chapter must address a distinct sub-problem or desire from the avatar/problem context. No two chapters cover the same ground.
8. key_concepts must be specific: BAD: "entender el mercado". GOOD: "los 3 indicadores que determinan si un nicho es rentable".
9. NEVER invent quotes, studies, expert names, statistics with specific numbers, or academic references. Base content on practical domain knowledge.
10. STRICT CHARACTER LIMITS — non-negotiable. Verify every string field before returning:
- narrative_arc: max 400 characters
- chapters[].title: max 90 characters
- chapters[].description: max 280 characters
- chapters[].key_concepts[]: max 130 characters each
If any field exceeds its limit, rewrite it shorter before returning.
11. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: tone is invalid | bump_product_title or topic is empty | avatar or problem contain an error field.

Example (es, tone=friendly):
Input: topic="Velas artesanales" bump_product_title="Guía de packaging para artesanas: presentación que justifica el precio" avatar=(artesana 25-45 LATAM) problem=(packs caseros que no se ven profesionales) tone=friendly
{"narrative_arc":"De artesana que envía en bolsas de plástico sin marca, a emprendedora cuyo packaging justifica el precio y genera recomendaciones — cuatro pasos concretos.","chapters":[{"number":1,"title":"Por qué el packaging vende (o arruina) tu vela antes de abrirla","description":"Valida la frustración: el producto es bueno pero la presentación envía la señal equivocada sobre el precio.","key_concepts":["El impacto de la primera impresión en el valor percibido","Por qué el packaging barato hace que bajen el precio","El costo real de un mal unboxing: devoluciones y falta de recomendaciones"],"word_count_target":850},{"number":2,"title":"Materiales de packaging con presencia profesional sin gastar de más","description":"Cómo elegir cajas, papel y cintas que comuniquen calidad sin duplicar el costo de la vela.","key_concepts":["Los 3 materiales de packaging que dan mejor relación costo-percepción","Dónde comprar al por mayor en LATAM sin mínimos altos","Cómo calcular el costo de packaging por unidad"],"word_count_target":950},{"number":3,"title":"Tu marca en el packaging: etiquetas y detalles que no se olvidan","description":"Cómo incluir identidad de marca en el packaging aunque no tengas diseñador ni presupuesto.","key_concepts":["Etiquetas básicas que toda artesana puede hacer hoy","La tarjeta de presentación que genera recompra","Cómo usar el color y la tipografía sin ser diseñadora"],"word_count_target":950},{"number":4,"title":"Tu sistema de packaging: del pedido al unboxing en menos de 10 minutos","description":"Arma un flujo repetible para preparar pedidos de forma consistente, rápida y sin improvisar.","key_concepts":["La lista de materiales que siempre debe estar en stock","Cómo estandarizar el armado para pedidos múltiples","Los 90 días: mide la diferencia en preguntas de precio y recomendaciones"],"word_count_target":850}]}`,

    user: `Bump product title: ${vars.bump_product_title}
Topic: ${vars.topic}
Tone: ${vars.tone}
Content locale: ${vars.content_locale}
Avatar profile: ${vars.avatar}
Problem: ${vars.problem}

Generate the complete 4-chapter index for this order bump mini-ebook. The bump is standalone — do not reference any main ebook or other package artifact.`,
  };
}

// ─── generate-all-bonus-section-index ────────────────────────────────────────
// docs: prompts/content/generate-all-bonus-section-index.md (v1.0)

export interface GenerateAllBonusSectionIndexVars {
  content_locale: ContentLocale;
  topic: string;
  avatar: string;
  problem: string;
  /** Main package ebook title (projects.main_title). */
  main_ebook_title: string;
  /** All bonus product titles (ebooks.title per bonus row), in package_ordinal order. */
  bonus_titles: string[];
  tone: ContentTone;
}

/**
 * Generates section TOC entries for ALL bonuses in a single Claude call so the
 * model has full package context and avoids repeating titles across bonuses.
 * Output shape: { bonuses: [{ chapters: [BonusSectionChapter] }, ...] }
 * where bonuses[i] corresponds to bonus_titles[i].
 */
export function generateAllBonusSectionIndexPrompt(
  vars: GenerateAllBonusSectionIndexVars,
): { system: string; user: string } {
  const count = vars.bonus_titles.length;
  const bonusList = vars.bonus_titles
    .map((t, i) => `  ${i + 1}. "${t}"`)
    .join("\n");

  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: for each bonus in the package, propose exactly ONE primary section title — the editable heading for the single content block inside that deliverable. Each bonus is a compact tool (checklist, planner, script, template, worksheet, ~10–12 pages) that extends the main ebook's promise from a different angle. The bonus product titles are already chosen; your section titles name the single main content block inside each bonus (the reader-facing heading). Section titles must NOT be lazy copies of the product titles — describe what the reader does or gets inside.

This call generates all ${count} bonus section(s) at once so the model has full package context and can guarantee NO TWO section titles repeat or overlap across bonuses.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

TONE GUIDE — apply to title, description, and key_concepts (preset key is English; output language is ${vars.content_locale}):
- professional: clear expert voice, structured, credible.
- friendly: warm, direct, non-corporate — trusted peer (default Obra voice).
- inspirational: motivating without hype or income promises.
- direct: concise, practical imperatives.
- educational: didactic, stepwise, patient pacing.

RULES (non-negotiable):
1. Output must be a single JSON object with a single key "bonuses" — an array of exactly ${count} object(s), one per bonus, in the same order as the input list.
2. Each object in "bonuses" must have exactly one key: "chapters" — an array of exactly ONE chapter object.
3. Each chapter object must include: number (integer 1), title (string), description (string), key_concepts (array of 2–4 strings), word_count_target (integer, always 900).
4. chapters[0].title: max 90 characters — specific and benefit-forward. NEVER copy or paraphrase the bonus_product_title. Name what the reader does or gets inside the deliverable.
5. chapters[0].description: max 280 characters — what this block delivers or what the reader does inside it.
6. chapters[0].key_concepts: 2–4 strings, max 130 characters each — concrete elements covered. Specific over generic.
7. UNIQUENESS (non-negotiable): Every section title across all ${count} bonus(es) must be meaningfully different — no shared phrasing, no overlapping topics. If two bonuses address different tools for the same theme, the section titles must be clearly distinct in angle and wording. Verify uniqueness before returning.
8. Each section must complement the main ebook and extend or apply one piece of its method without repeating it.
9. Return {"error":"INVALID_INPUT","reason":"<brief in ${vars.content_locale}>"} if: tone is invalid | topic or main_ebook_title is empty | any bonus_product_title is empty | avatar or problem JSON contains an error field.

Example output (2 bonuses, es, tone=friendly):
{"bonuses":[{"chapters":[{"number":1,"title":"Tu costo real en una planilla: completá los 6 campos y conocé tu precio mínimo","description":"Una planilla de una página para calcular el costo real de cada vela sin adivinar: materiales, tiempo, costos fijos y ganancia mínima incluidos.","key_concepts":["Los 6 campos que no pueden faltar en el costo de una vela","Cómo cargar tu tiempo de producción sin subestimarlo","El número que resulta: tu precio mínimo no negociable"],"word_count_target":900}]},{"chapters":[{"number":1,"title":"Las 12 objeciones de precio más comunes y cómo responder cada una sin ceder","description":"Scripts listos para usar ante las objeciones más frecuentes: precio alto, comparación con competidores, pedidos de descuento.","key_concepts":["Las 4 categorías de objeción de precio y su lógica","La estructura del script: reconocer, reencuadrar, cerrar","Cuándo negociar tiene sentido y cuándo no"],"word_count_target":900}]}]}`,

    user: `Main ebook title: ${vars.main_ebook_title}
Topic: ${vars.topic}
Tone: ${vars.tone}
Avatar profile: ${vars.avatar}
Problem: ${vars.problem}

Bonus titles (generate one section entry per bonus, in the same order — bonuses[0] for title 1, bonuses[1] for title 2, etc.):
${bonusList}

Generate exactly ${count} section entr${count === 1 ? "y" : "ies"} — one per bonus. Return the complete JSON object with the "bonuses" array.`,
  };
}

// ─── generate-bonus-chapter ───────────────────────────────────────────────────
// docs: prompts/content/generate-bonus-chapter.md (v1.0)

export interface GenerateBonusChapterVars {
  content_locale: ContentLocale;
  topic: string;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
  main_ebook_title: string;
  /** Bonus deliverable product title (ebooks.title for the bonus row). */
  bonus_product_title: string;
  tone: ContentTone;
  /**
   * Full output of generateBonusSectionIndexPrompt, serialized as JSON string.
   * Must include chapters[0].{title, description, key_concepts, word_count_target}.
   */
  bonus_index: string;
  /** Optional author name; omitted from prompt when null/undefined. */
  author?: string | null;
}

/**
 * Builds system + user prompts for generating the single chapter body of a bonus deliverable.
 * Returns null if bonus_index cannot be parsed or chapter 1 is not found.
 */
export function generateBonusChapterPrompt(
  vars: GenerateBonusChapterVars,
): { system: string; user: string } | null {
  const chapter = parseChapterFromIndex(vars.bonus_index, 1);
  if (!chapter) return null;

  const authorLine =
    vars.author != null && vars.author.trim().length > 0
      ? `Author: ${vars.author.trim()}\n`
      : "";

  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: generate the full HTML body of a bonus deliverable — a compact, practical tool (checklist, template, script, planner, or quick guide) that extends one specific aspect of the main ebook's method. This is NOT a chapter of the ebook; it is a standalone, immediately usable artifact of roughly 900 words.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

TONE GUIDE — apply consistently:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype.
- direct: concise, no filler. Instructions and fields only — no padding.
- educational: didactic and stepwise. Defines terms; patient pacing.

HTML OUTPUT RULES:
1. Allowed tags only: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <ul>, <ol>, <li>, <h2>, <h3>, <blockquote>, <a>, <code>
2. Do NOT include <h1> — the bonus title is rendered by the UI separately
3. Do NOT add style attributes to any element
4. All opened tags must be properly closed. Well-formed HTML only.
5. Use <code> for fillable fields in templates: <code>[field name]</code>
6. Use <blockquote> for ready-to-use script text or highlighted examples
7. Infer the deliverable format from the bonus_product_title and key_concepts:
   - Checklist / list of actions → <ol> or <ul> with action items
   - Template / planner / worksheet → structured fields with <code>[field]</code>
   - Script / swipe copy → <blockquote> blocks with context headings <h3>
   - Step-by-step guide → <ol> for steps, <h2> for sections
   Start the content with a brief orientation paragraph (1–2 sentences) explaining how to use the deliverable, then deliver the tool itself.

CONTENT RULES (non-negotiable):
1. Cover every key_concept listed in the bonus index entry. Each must appear with substance — not just mentioned.
2. The deliverable must be immediately usable by the avatar — not a summary of the ebook, not theory. The reader should be able to apply it without re-reading the ebook.
3. Do NOT repeat or summarize content already in the main ebook. Extend or apply one specific piece of the method.
4. Do NOT mention order bumps or any other product in the package. This deliverable is self-contained.
5. Do NOT invent: no invented quotes, no specific statistics with numbers, no fabricated study citations.
6. Do NOT include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, or any other channel.
7. Word count: reach at least the word_count_target. Do not fall short. If you have covered all key concepts and are below target, add a practical example, an edge case, or a "common mistakes" section.
8. The deliverable ends naturally — no "next steps" that reference external resources or other products.
9. Token budget: aim to complete the deliverable in under 2500 output tokens. Write concisely — dense, useful prose over padding. The hard limit is 8192 tokens; never truncate the content to fit.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in ${vars.content_locale}>"}

On success, return exactly:
{"content": "<full sanitized HTML body of the bonus deliverable>"}`,

    user: `Topic: ${vars.topic}
Main ebook title: ${vars.main_ebook_title}
Bonus product title: ${vars.bonus_product_title}
${authorLine}Tone: ${vars.tone}
Content locale: ${vars.content_locale}

Ideal customer (avatar):
${vars.avatar}

Problem resolved:
${vars.problem}

Bonus index (section title + key concepts to cover):
${vars.bonus_index}

---

Generate the full HTML body of this bonus deliverable.

Section to generate (from index):
- Title: ${chapter.title}
- Description: ${chapter.description}
- Key concepts (must all be covered):
${formatKeyConceptsForPrompt(chapter.key_concepts)}
- Word count target: ${chapter.word_count_target}

Infer the format (checklist, template, script, guide) from the bonus_product_title and key_concepts.
Do not include the bonus title as <h1>. Start with a brief orientation paragraph, then deliver the tool.
Return the HTML inside the "content" key of the JSON object.`,
  };
}

// ─── generate-bump-chapter ────────────────────────────────────────────────────
// docs: prompts/content/generate-bump-chapter.md (v1.0)

export interface GenerateBumpChapterVars {
  content_locale: ContentLocale;
  /** Pass as JSON.stringify(avatarOutput) — full output of optimizeAvatarPrompt. */
  avatar: string;
  /** Pass as JSON.stringify(problemOutput) — full output of optimizeProblemPrompt. */
  problem: string;
  /** Order bump mini-ebook title (ebooks.title for the bump row). */
  bump_product_title: string;
  tone: ContentTone;
  /**
   * Full output of generateIndexPrompt with chapter_count=4, serialized as JSON string.
   * Must include narrative_arc and chapters[4].{number, title, description, key_concepts, word_count_target}.
   */
  index: string;
  /** Chapter number to generate (1–4). */
  chapter_number: number;
  /**
   * Already-generated chapters of this bump in order. Pass [] for chapter 1.
   * Does NOT include chapters from the main ebook — the bump is standalone.
   */
  previous_chapters: PreviousChapter[];
  /** Optional author name; omitted from prompt when null/undefined. */
  author?: string | null;
}

/**
 * Builds system + user prompts for generating one chapter body of an order bump mini-ebook.
 * Returns null if index cannot be parsed or chapter_number is not found.
 */
export function generateBumpChapterPrompt(
  vars: GenerateBumpChapterVars,
): { system: string; user: string } | null {
  const chapter = parseChapterFromIndex(vars.index, vars.chapter_number);
  if (!chapter) return null;

  const previousChaptersJson = JSON.stringify(
    vars.previous_chapters.map((c) => ({ number: c.number, title: c.title, content: c.content })),
  );

  const authorLine =
    vars.author != null && vars.author.trim().length > 0
      ? `Author: ${vars.author.trim()}\n`
      : "";

  return {
    system: `${CRITICAL_JSON_OBJECT}

${OBRA_SYSTEM_BASE}

Role: generate the full HTML body of chapter ${vars.chapter_number} of 4 for an order bump — a standalone mini-ebook on an adjacent topic for the same audience. This is an independent product: the reader does NOT need to have read the main ebook to use it. Write it accordingly.

Respond strictly in ${vars.content_locale}. Output must be fully in ${vars.content_locale} regardless of input language.

TONE GUIDE — apply consistently to every paragraph, heading, and example:
- professional: clear expert voice, structured, credible. Suitable for readers who want authority and precision without fluff.
- friendly: warm, direct, non-corporate — like a trusted peer. Conversational but still actionable (default Obra voice).
- inspirational: motivating and forward-looking. Emphasizes possibility and momentum without hype, fake urgency, or income promises.
- direct: concise, no filler. Gets to the point quickly; practical imperatives and concrete next steps.
- educational: didactic and stepwise. Teaches systematically; defines terms when needed; patient pacing for learners.

HTML OUTPUT RULES:
1. Use only: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <ul>, <ol>, <li>, <h2>, <h3>, <blockquote>, <a>, <code>
2. Do NOT include <h1> — the chapter title is rendered by the UI separately
3. Do NOT add style attributes to any element
4. All opened tags must be properly closed. Well-formed HTML only.
5. Start the content directly with the chapter body — no title repetition

CONTENT RULES (non-negotiable):
1. Cover every key_concept in the chapter's index entry. Each must be addressed with substance — not just mentioned.
2. Use practical, concrete examples relevant to the avatar and the bump's topic. The reader should be able to apply the content without any prior knowledge of the main ebook.
3. Do NOT repeat ground already covered in previous chapters of this bump. Build forward.
4. Do NOT mention the main ebook, bonuses, or any other product in the package. This mini-ebook is fully standalone.
5. Do NOT invent: no invented quotes attributed to named experts, no specific statistics with numbers, no fabricated studies.
6. Chapter 1 specifically: open by validating the reader's pain or situation in the context of THIS bump's topic. Open a loop that the next 3 chapters will close.
7. Last chapter (4): consolidate the mini-ebook's transformation. Project forward with concrete next steps. NEVER include external CTAs: no mention of Telegram, Instagram, email lists, coaching programs, Facebook groups, or any other channel.
8. Middle chapters (2 and 3): deliver ONE concrete, actionable piece of the transformation. Practical first, theoretical second.
9. Transitions: each chapter (except the last) should end with a natural bridge connecting to the next.
10. Word count: reach at least the chapter's word_count_target. Do not fall short. If you've covered all key concepts and are below target, go deeper on examples or add a practical walkthrough.
11. Verify the information you write. If you are not confident a claim is accurate, rephrase it as a practical framework rather than a stated fact.
12. Token budget: aim to complete the full chapter in under 2500 output tokens. Write concisely — dense, useful prose over padding. The hard limit is 8192 tokens; never truncate the content to fit.

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in ${vars.content_locale}>"}

On success, return exactly:
{"content": "<full sanitized HTML body of the chapter>"}`,

    user: `Bump product title: ${vars.bump_product_title}
${authorLine}Tone: ${vars.tone}
Content locale: ${vars.content_locale}

Ideal customer (avatar):
${vars.avatar}

Problem context:
${vars.problem}

Full bump index (narrative arc + 4 chapters):
${vars.index}

Previously generated chapters of this bump:
${previousChaptersJson}

---

Generate chapter ${vars.chapter_number} of 4.

Chapter to generate (from index):
- Title: ${chapter.title}
- Description: ${chapter.description}
- Key concepts (must all be covered):
${formatKeyConceptsForPrompt(chapter.key_concepts)}
- Word count target: ${chapter.word_count_target}

Write the full HTML body of this chapter. Do not include the chapter title as <h1>. Start directly with the chapter body.
Return the HTML inside the "content" key of the JSON object.`,
  };
}

// ─── generateSectionImagePrompt ───────────────────────────────────────────────
// Docs: prompts/images/generate-section-image-prompt.md

export interface GenerateSectionImageVars {
  artifact_type: "main" | "bonus" | "order_bump";
  artifact_title: string;
  chapter_title: string;
  chapter_description: string;
  key_concepts: string;
  chapter_number: number;
  chapter_count: number;
  image_style: string;
  palette_description: string;
  content_locale: ContentLocale;
}

export function generateSectionImagePrompt(
  vars: GenerateSectionImageVars
): { system: string; user: string } {
  const system = `You are a visual prompt engineer for Gemini Imagen. Your job is to write optimized image generation prompts that translate infoproduct chapter content into compelling visual compositions.

OUTPUT RULES (non-negotiable):
1. Respond with the image prompt ONLY. No explanation, no preamble, no JSON.
2. Always write in English regardless of input language — Gemini performs best with English prompts.
3. Length: 60 to 120 words. Concise but specific.
4. Always include: visual composition, lighting, mood, color palette reference, style descriptor, and "No text overlays."
5. Never include: overlaid titles, copy, logos, recognizable brand elements, or explicit faces.
6. People: allowed as abstract figures, silhouettes, or hands — never identifiable faces.
7. The image must feel contextually connected to the chapter's theme — not generic stock photography.

STYLE GUIDE — apply the user's chosen style consistently:
- minimalist: clean surfaces, negative space, few elements, soft light, neutral base tones
- illustrated: hand-drawn or vector aesthetic, flat shapes, bold outlines, graphic feel
- photography: realistic scene, natural or studio light, textured surfaces, editorial quality
- flat: 2D graphic composition, solid color areas, geometric shapes, no shadows
- editorial: magazine-quality, intentional composition, strong mood, typographic awareness (no actual text)

COLOR PALETTE: anchor the image in ${vars.palette_description}. The palette should be felt — not every element needs to be those exact colors, but the dominant visual mood must reflect them.

CHAPTER POSITION RULES:
- Chapter 1: the image should reflect tension, a problem unsolved, or a moment before the transformation. Mood: questioning, honest, slightly melancholic but not hopeless.
- Middle chapters: visual clarity, forward movement, concrete action or tools. Mood: focused, methodical, purposeful.
- Last chapter: resolution, capability, light. Mood: calm confidence, arrival, new horizon.`;

  const user = `Artifact type: ${vars.artifact_type}
Artifact title: ${vars.artifact_title}
Chapter ${vars.chapter_number} of ${vars.chapter_count}

Chapter title: ${vars.chapter_title}
Chapter description: ${vars.chapter_description}
Key concepts: ${vars.key_concepts}

Image style: ${vars.image_style}
Color palette: ${vars.palette_description}
Content locale: ${vars.content_locale}

Generate the Gemini image prompt for this chapter's visual.`;

  return { system, user };
}

// ─── generateCoverImagePrompt ─────────────────────────────────────────────────
// Docs: prompts/images/generate-cover-image-prompt.md

export interface GenerateCoverImageVars {
  artifact_type: "main" | "bonus" | "order_bump";
  artifact_title: string;
  author?: string | null;
  topic: string;
  image_style: string;
  palette_description: string;
  content_locale: ContentLocale;
}

export function generateCoverImagePrompt(
  vars: GenerateCoverImageVars
): { system: string; user: string } {
  const system = `You are a visual prompt engineer for Gemini Imagen specializing in book cover design. Your job is to write optimized image generation prompts that produce editorial, commercially compelling infoproduct covers.

OUTPUT RULES (non-negotiable):
1. Respond with the image prompt ONLY. No explanation, no preamble, no JSON.
2. Always write in English regardless of input language — Gemini performs best with English prompts.
3. Length: 70 to 130 words. Longer than section prompts — covers require explicit typographic instructions.
4. Always start with "Vertical A4" or "Portrait A4" to anchor the composition.
5. Always include: vertical composition structure, color palette reference, lighting, visual style, and explicit text placement instructions for the title and author (if provided).
6. The artifact title MUST appear verbatim in quotes in the prompt — this increases Gemini's accuracy in rendering the text.
7. Author name (if provided) always placed at the bottom of the cover — standard editorial convention.
8. If no author is provided, omit the author line entirely.
9. Never include: decorative frames, borders, inner margins, vignettes, stock-photo collages, gradients in multiple directions, overly complex layouts. The composition must bleed to the absolute edge of the canvas — no containment device of any kind.
10. The cover must look like a premium infoproduct — not a social media graphic, not a textbook, not a stock photo.
11. NEVER invent subtitles, taglines, or secondary text lines. The only text in the image is the artifact_title (verbatim) and the author name if provided. Do not pull phrases from the topic or any other field.
12. The generated image IS the cover page itself — a flat, full-screen composition that fills the entire canvas edge to edge, viewed straight on. NEVER render the cover as: a physical book, a 3D book mockup, a book rendered at an angle with visible spine or depth, a floating book with drop shadow, a book spine, or any composition that places the cover as an object within a three-dimensional scene or environment.

MODERN QUALITY STANDARD (applies to all styles — non-negotiable):
The cover must feel contemporary and high-production regardless of the audience or topic. Visual references: think Kinfolk magazine, modern non-fiction book design, Apple product photography, 2020s editorial design. Avoid anything that reads as: generic stock photo, clip art, 90s/2000s design, busy background textures, drop shadows on text, symmetric clip-art-style compositions, or low-fi illustration.
Regardless of style: clean composition, intentional negative space, confident use of color, modern typography placement. The cover should feel like it belongs on the homepage of a premium online course platform.

STYLE GUIDE — apply the user's chosen style to the visual elements only. The modern quality standard always applies on top:
- minimalist: single hero object or abstract shape, generous negative space, precise lighting, ultra-clean — think modern brand identity or premium product packaging
- illustrated: contemporary flat or semi-flat illustration — bold shapes, restrained palette, graphic confidence — think modern editorial illustration (2020s), not clip art
- photography: high-end editorial flat-lay or scene — intentional props, precise styling, professional studio or controlled natural light — think product launch photography, not generic stock
- flat: bold geometric composition, solid or carefully graduated color fields, strong visual hierarchy — think modern motion design stills or app icon aesthetics
- editorial: sophisticated magazine or non-fiction book cover — strong focal image or concept, tight composition, the kind of cover that wins design awards

COLOR PALETTE: anchor the entire cover in ${vars.palette_description}. For covers, the dominant color of the background must come from the palette. Title text should use a high-contrast palette color. Accent color (10%) can highlight the author name or a single detail element.

COVER COMPOSITION RULES — structure the vertical space in three zones. These zones describe the flat page surface itself — this image IS the page, not a representation of a physical book object:
- Top zone (roughly upper 40%): visual element — scene, object, illustration, or abstract graphic
- Middle zone (title area): the title text, large and legible, in a high-contrast palette color
- Bottom zone: author name (if provided) in a smaller size, accent color; plus generous breathing room

For main ebooks: use the full three-zone structure. The visual element should evoke the book's core promise or transformation — not just the topic literally.
For bonuses and order bumps: a more compact treatment is acceptable — the visual element can be smaller or more abstract, giving more space to the title.

WHAT MAKES A COVER SELL: strong contrast between title text and background, a clear visual metaphor or mood that matches the promise, professional typography placement, and a color story that feels intentional — not random. The cover should make someone want to pick it up.`;

  const authorLine = vars.author ? `\nAuthor: ${vars.author}` : "";

  const user = `Artifact type: ${vars.artifact_type}
Artifact title: ${vars.artifact_title}${authorLine}
Topic: ${vars.topic}

Image style: ${vars.image_style}
Color palette: ${vars.palette_description}
Content locale: ${vars.content_locale}

Generate the Gemini image prompt for this infoproduct cover.`;

  return { system, user };
}

// ─── generateSplitProposalPrompt ──────────────────────────────────────────────
// Docs: prompts/content/generate-split-proposal.md

export interface GenerateSplitProposalVars {
  manuscript_text: string;
  main_ebook_title: string;
  topic: string;
  content_locale: ContentLocale;
}

export function generateSplitProposalPrompt(
  vars: GenerateSplitProposalVars
): { system: string; user: string } {
  const system = `${CRITICAL_JSON_OBJECT}

You are Obra's manuscript analyzer. Your job is to read a plain-text manuscript and propose a chapter structure for an infoproduct ebook. The user has already written the content — you are not rewriting or summarizing it. You are identifying how it is organized and proposing clean chapter titles and precise start markers.

Respond strictly in ${vars.content_locale} for titles and warnings. Output must be fully in ${vars.content_locale} regardless of input language.

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
- Capitalize naturally for ${vars.content_locale}

START_HEADING RULES:
- Copy the heading line VERBATIM from the manuscript — do not edit, clean, or translate it
- Include enough text to be unique in the document (typically the full heading line)
- If the same heading appears twice (unlikely but possible), use the first occurrence

WARNINGS (non-blocking — array of strings in ${vars.content_locale}):
Flag these situations if detected:
- A chapter that is significantly shorter than the others (under ~300 words) — user may want to merge it
- A chapter that is very long compared to the others (over 3× the average) — user may want to split it
- A document where no clear headings were found — inform the user that the split was inferred from content and may need manual adjustment
- Content that appears unrelated to the ebook title/topic

Do NOT warn about normal variation in chapter length, writing quality, or missing content.

Return {"error": "INVALID_INPUT", "reason": "<brief in ${vars.content_locale}>"} only if manuscript_text is empty or too short to analyze (under 100 words).`;

  const user = `Main ebook title: ${vars.main_ebook_title}
Topic: ${vars.topic}
Content locale: ${vars.content_locale}

Manuscript text:
---
${vars.manuscript_text}
---

Analyze the manuscript and propose the chapter structure.`;

  return { system, user };
}

// ─── Document HTML generation (multi-step) ───────────────────────────────────
// Doc: prompts/content/generate-document-template.md
//
// Generation is split into two phases to avoid output token limits:
//   1. generateDocumentHeaderPrompt  — CSS toolkit + cover + title page + TOC
//   2. generateChapterHtmlPrompt     — one chapter opener + body per call (run in parallel)
// The Edge Function assembles header + chapters + </body></html>.
// Image slots remain as empty divs — injectAll() fills them later.
// Output tags: <obra-header>...</obra-header> and <obra-chapter>...</obra-chapter>

export type ArtifactType = "main_ebook" | "bonus" | "bump";

// ─── Shared page dimension lookup ────────────────────────────────────────────

const PAGE_DIMS: Record<string, Record<string, { w: string; h: string }>> = {
  a4: { portrait: { w: "210mm", h: "297mm" }, landscape: { w: "297mm", h: "210mm" } },
  letter: { portrait: { w: "215.9mm", h: "279.4mm" }, landscape: { w: "279.4mm", h: "215.9mm" } },
};

function tocLabel(locale: ContentLocale): string {
  return locale === "pt-BR" ? "Índice" : (locale === "en-US" || locale === "en-GB") ? "Table of Contents" : "Índice";
}
function chapterLabel(locale: ContentLocale): string {
  return locale === "pt-BR" ? "Capítulo" : (locale === "en-US" || locale === "en-GB") ? "Chapter" : "Capítulo";
}

// ─── generateDocumentHeaderPrompt ────────────────────────────────────────────
// Phase 1: generates CSS toolkit + cover + title page + TOC.
// Output: raw HTML wrapped in <obra-header>...</obra-header>.
// Does NOT include </body></html> — those are appended after all chapters.

export interface GenerateDocumentHeaderVars {
  content_locale: ContentLocale;
  artifact_type: ArtifactType;
  title: string;
  author: string | null;
  chapter_titles: string[]; // for TOC and cover slot description
  palette: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
  page: { size: string; orientation: string };
}

export function generateDocumentHeaderPrompt(
  vars: GenerateDocumentHeaderVars,
): { system: string; user: string } {
  const dims = PAGE_DIMS[vars.page.size]?.[vars.page.orientation] ?? PAGE_DIMS.a4!.portrait!;
  const pageDimensions = `${dims.w} ${dims.h}`;
  const toc = tocLabel(vars.content_locale);
  const chapter = chapterLabel(vars.content_locale);

  const system = `CRITICAL OUTPUT FORMAT: Return only raw HTML wrapped in <obra-header> and </obra-header> tags. No markdown, no backticks, no explanation. Start with <obra-header> and end with </obra-header>.

You are Obra's editorial design AI. You produce premium infoproduct documents for LATAM creators — quality comparable to commercial publishers like Penguin or Planeta.

Your output: complete <!DOCTYPE html> → <head> with <style> → <body> opening → Cover page → TOC page.
Do NOT include chapter openers, chapter body, or </body></html> — those come separately.

═══ MANDATORY CSS — copy these rules EXACTLY into <style>. Do NOT add, remove, or alter any rule here. ═══

/* ⛔ The ONLY margin source is padding on .obra-body/.obra-toc — nothing else. */
@page { size: ${pageDimensions}; margin: 0; }
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body { margin: 0; padding: 0; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

/* Every .obra-page forces a page break after it */
.obra-page { break-after: page; page-break-after: always; }
.obra-page:last-child { break-after: avoid; page-break-after: avoid; }

/* Full-bleed pages: fixed height, overflow hidden — NO padding, NO margin */
.obra-cover,
.obra-chapter-opener {
  position: relative;
  overflow: hidden;
  height: ${dims.h};
  min-height: ${dims.h};
  break-inside: avoid;
  page-break-inside: avoid;
}

/* Content pages: padding IS the only margin. Background fills the full page. */
.obra-body,
.obra-toc {
  padding: 15mm;
  background: var(--page-bg);
  box-sizing: border-box;
}

/* ── Break rules — prevent ugly cuts ── */
.obra-body h2,
.obra-body h3 { break-after: avoid; page-break-after: avoid; }

/* keep heading glued to the element that follows it */
.obra-body h2 + *,
.obra-body h3 + * { break-before: avoid; page-break-before: avoid; }

.obra-body p { orphans: 4; widows: 4; }

/* Every editorial container: never split across pages */
.obra-callout,
.obra-pull-quote,
figure,
table,
blockquote,
.obra-image-slot--chapter { break-inside: avoid; page-break-inside: avoid; }

.obra-body li { break-inside: avoid; page-break-inside: avoid; orphans: 3; widows: 3; }

/* Screen preview — page cards */
@media screen {
  html { zoom: 0.75; }
  body { background: #c8d0dc; padding: 32px 16px; }
  .obra-page { width: ${dims.w}; margin: 0 auto 32px; box-shadow: 0 4px 28px rgba(0,0,0,0.18); }
  .obra-toc,
  .obra-body { min-height: ${dims.h}; }
}

⛔ After these mandatory rules, do NOT add any rule that sets margin or padding on body, html, or .obra-page.

═══ CSS VARIABLES — define in :root ═══

:root {
  --color-primary: [primary hex];
  --color-secondary: [secondary hex];
  --color-accent: [accent hex];
  --font-heading: "[Heading Font]", Georgia, serif;
  --font-body: "[Body Font]", system-ui, sans-serif;

  /* --page-bg is ALWAYS the secondary color — the light neutral that fills pages */
  --page-bg: var(--color-secondary);

  /* Derive tints for richer design — stay within the same palette families */
  /* e.g. --color-primary-dark, --color-accent-muted, --color-secondary-deep */
  /* Mix with white/black/opacity — never introduce unrelated hues */
}

═══ FULL EDITORIAL CSS TOOLKIT — define ALL of these classes ═══

Base typography:
  body { font-family: var(--font-body); font-size: 11pt; line-height: 1.72; color: #1a1a1a; -webkit-font-smoothing: antialiased; }
  h1, h2, h3, h4 { font-family: var(--font-heading); }
  h2 { font-size: 1.22rem; font-weight: 700; color: var(--color-primary); margin: 1.8em 0 0.5em; padding-bottom: 0.35em; border-bottom: 2px solid var(--color-secondary); }
  h3 { font-size: 0.98rem; font-weight: 600; color: var(--color-primary); margin: 1.4em 0 0.4em; }
  p { margin-bottom: 0.85em; hyphens: auto; }
  ul, ol { margin: 0.4em 0 0.85em 1.2em; }
  li { margin-bottom: 0.25em; }
  li::marker { color: var(--color-accent); }
  strong { font-weight: 700; }
  blockquote { border-left: 3px solid var(--color-accent); padding: 0.5rem 1rem; margin: 1rem 0; font-style: italic; color: #444; }
  hr { border: none; height: 2px; background: linear-gradient(90deg, transparent, var(--color-accent), transparent); margin: 1.5rem 0; }

Editorial components — MUST be visually distinctive and richly designed:

  .obra-callout {
    /* MUST include break-inside: avoid — keep content ≤ 4 lines to guarantee it works */
    break-inside: avoid; page-break-inside: avoid;
    background: [light tint of secondary or accent — e.g. rgba of --color-secondary at 60%]];
    border-left: 4px solid var(--color-accent);
    padding: 0.85rem 1.1rem;
    border-radius: 0 8px 8px 0;
    margin: 1.2rem 0;
  }
  .obra-callout::before {
    content: "Concepto clave" / "Key concept" / "Nota" (match content_locale);
    display: block;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-accent);
    margin-bottom: 0.3rem;
  }

  .obra-pull-quote {
    /* MUST include break-inside: avoid — keep to 1–2 sentences */
    break-inside: avoid; page-break-inside: avoid;
    font-family: var(--font-heading);
    font-size: 1.25rem;
    font-style: italic;
    line-height: 1.45;
    color: var(--color-primary);
    border-left: 4px solid var(--color-accent);
    padding: 1rem 1.5rem;
    margin: 1.6rem 0;
    background: [subtle tint of primary at ~6% opacity];
  }

  .obra-section-divider {
    width: 3rem; height: 3px;
    background: var(--color-accent);
    border-radius: 2px;
    margin: 1.8rem 0;
  }

  .obra-highlight {
    background: [accent at 20% opacity — use rgba];
    padding: 0 4px;
    border-radius: 3px;
  }

  .obra-styled-list {
    list-style: none;
    padding-left: 1.4em;
    margin: 0.4em 0 0.85em;
  }
  .obra-styled-list li { break-inside: avoid; page-break-inside: avoid; }
  .obra-styled-list li::before {
    content: "→";
    color: var(--color-accent);
    font-weight: 700;
    margin-right: 0.5em;
    margin-left: -1.4em;
    display: inline-block;
    width: 1.4em;
  }

  .obra-two-col { column-count: 2; column-gap: 2rem; }
  .obra-two-col h2, .obra-two-col h3 { column-span: all; }

Tables — always no-split:
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.82rem; }
  th { background: var(--color-primary); color: white; font-weight: 700; text-align: left; padding: 0.5rem 0.7rem; font-size: 0.7rem; letter-spacing: 0.05em; text-transform: uppercase; }
  td { padding: 0.45rem 0.7rem; border-bottom: 1px solid var(--color-secondary); }
  tr:nth-child(even) td { background: rgba(0,0,0,0.03); }

Image slots:
  .obra-image-slot { display: block; background: var(--color-secondary); overflow: hidden; }
  .obra-image-slot--cover { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; }
  .obra-image-slot--opener { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 2; background: transparent; }
  .obra-image-slot--chapter { width: 100%; height: 180px; border-radius: 8px; margin: 1.4rem 0; }
  .obra-image-slot img { width: 100%; height: 100%; object-fit: cover; display: block; }

═══ COVER PAGE — FIXED TEMPLATE, copy verbatim ═══

Copy this EXACT structure. Only fill in: slot description, category label, title, tagline, and author.
Do NOT change any style, z-index, class, or structural property.

<div class="obra-page obra-cover">
  <!-- Layer 0: solid primary color — always visible, serves as background when no image -->
  <div style="position:absolute;inset:0;background:var(--color-primary);z-index:0;pointer-events:none"></div>
  <!-- Layer 1: full-bleed cover image -->
  <div class="obra-image-slot obra-image-slot--cover" data-slot-key="cover" data-slot-type="cover"
       data-slot-description="[vivid 2-sentence visual for AI image gen — describe mood, setting, and style matching the ebook topic and palette]"
       style="position:absolute;inset:0;z-index:1"></div>
  <!-- Layer 2: primary color overlay ~78% — creates dark editorial look over any image -->
  <div style="position:absolute;inset:0;z-index:2;background:var(--color-primary);opacity:0.78;pointer-events:none"></div>
  <!-- Layer 3: decorative circles — visual texture -->
  <div style="position:absolute;top:-80px;right:-100px;width:420px;height:420px;border-radius:50%;background:rgba(255,255,255,0.05);z-index:3;pointer-events:none"></div>
  <div style="position:absolute;bottom:-60px;right:60px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.04);z-index:3;pointer-events:none"></div>
  <div style="position:absolute;top:38%;left:-60px;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,0.04);z-index:3;pointer-events:none"></div>
  <!-- Layer 3: accent bar at bottom edge -->
  <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:var(--color-accent);z-index:3;pointer-events:none"></div>
  <!-- Layer 4: editorial content — bottom-left. Extra bottom padding leaves room for the JS-injected image button. -->
  <div style="position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;justify-content:flex-end;padding:2.5rem 2.5rem 5.5rem 2.5rem;pointer-events:none">
    <p style="font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:var(--color-accent);margin-bottom:0.9rem">[TOPIC CATEGORY — 2–3 words]</p>
    <h1 style="font-family:var(--font-heading);font-size:4.5rem;font-weight:800;color:#ffffff;line-height:1.0;letter-spacing:-0.03em;margin-bottom:0.9rem">[exact ebook title]</h1>
    <p style="font-size:1rem;color:rgba(255,255,255,0.7);max-width:380px;line-height:1.55;margin-bottom:0">[1-sentence tagline — core promise of the ebook]</p>
    [if author present: <p style="margin-top:1.4rem;font-size:0.88rem;color:rgba(255,255,255,0.48);font-weight:500">por [Author Name]</p>]
  </div>
</div>

═══ TOC PAGE ═══

Structure: <div class="obra-page obra-toc"> (background will be var(--page-bg) via CSS)

Layout:
  • "${toc}" heading: var(--font-heading); 2rem; font-weight: 600; color: var(--color-primary)
  • Decorative accent line below heading: width 40px; height 3px; background: var(--color-accent); border-radius 2px; margin-bottom: 2rem
  • Each chapter entry: chapter number in var(--color-accent) (font-weight 700), title in #1a1a1a
  • Subtle separator between entries (1px border-bottom in a light tint of secondary)
  • Links with href="#chapter-N" — style them (color: inherit; text-decoration: none)
  • Use a proper table layout or flexbox row (number | title) for clean alignment

STRUCTURAL TEXT: use "${chapter}" for chapter labels, "${toc}" for TOC heading.
⛔ NEVER use viewport units (vh, vw) — not in CSS, not in inline styles. Heights must use mm, %, or rem.`;

  const authorLine = vars.author ? `Author: ${vars.author}` : "Author: (none)";
  const tocEntries = vars.chapter_titles
    .map((t, i) => `  ${i + 1}. ${t}`)
    .join("\n");

  const user = `Title: ${vars.title}
${authorLine}
Artifact type: ${vars.artifact_type}
Content locale: ${vars.content_locale}
Page: ${vars.page.size} ${vars.page.orientation} (${dims.w} × ${dims.h})

Design system:
  Primary (60%): ${vars.palette.primary}
  Secondary (30%): ${vars.palette.secondary}
  Accent (10%): ${vars.palette.accent}
  Heading font: ${vars.fonts.heading}
  Body font: ${vars.fonts.body}

Chapters (for TOC):
${tocEntries}

Generate the document header: <!DOCTYPE html> through the TOC page (Cover → TOC). Do not include a title page, chapters, or </body></html>.`;

  return { system, user };
}

// ─── generateChapterHtmlPrompt ────────────────────────────────────────────────
// Phase 2: generates one chapter opener + body HTML.
// Output: raw HTML wrapped in <obra-chapter>...</obra-chapter>.
// Uses CSS classes defined by generateDocumentHeaderPrompt — no style redefinition.

export interface GenerateChapterHtmlVars {
  content_locale: ContentLocale;
  chapter_number: number; // 1-based
  chapter_total: number;
  chapter_title: string;
  chapter_content: string; // Tiptap sanitized HTML
  palette: { primary: string; secondary: string; accent: string };
  fonts: { heading: string; body: string };
}

export function generateChapterHtmlPrompt(
  vars: GenerateChapterHtmlVars,
): { system: string; user: string } {
  const chapter = chapterLabel(vars.content_locale);
  const numPadded = String(vars.chapter_number).padStart(2, "0");

  const system = `Output: raw HTML inside <obra-chapter></obra-chapter> only. No markdown, no explanation.

Generate ONE chapter: opener div + one or more body divs. Include EVERY word of the content verbatim — no omissions, no paraphrasing.

══ OPENER — FIXED TEMPLATE, copy verbatim. Only replace [chapter title here]. ══

Every chapter opener MUST use this EXACT structure — same shapes, same layout, same z-index stack.
Do NOT add, remove, or rearrange any element. Do NOT vary the design.
All values (id, data-slot-key, span text) are already set — only replace [chapter title here] in the h2.

<div class="obra-page obra-chapter-opener" id="chapter-${vars.chapter_number}">
  <!-- z-index 0: solid primary background -->
  <div style="position:absolute;inset:0;background:var(--color-primary);z-index:0"></div>
  <!-- z-index 1: decorative elements — visible through the transparent slot when no image is set -->
  <div style="position:absolute;top:-60px;right:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,0.06);z-index:1;pointer-events:none"></div>
  <div style="position:absolute;bottom:0;left:0;width:5px;height:55%;background:var(--color-accent);z-index:1;pointer-events:none"></div>
  <!-- z-index 2: full-bleed image slot — transparent background so primary shows through when empty -->
  <div class="obra-image-slot obra-image-slot--opener" data-slot-key="chapter-${vars.chapter_number}-image-1" data-slot-type="chapter" style="z-index:2;background:transparent"></div>
  <!-- z-index 3: gradient overlay — improves text legibility over any image -->
  <div style="position:absolute;inset:0;z-index:3;background:linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 60%);pointer-events:none"></div>
  <!-- z-index 4: text — bottom-left. Extra bottom padding leaves room for the JS-injected image button. -->
  <div style="position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;justify-content:flex-end;padding:2.5rem 2.5rem 5.5rem 2.5rem">
    <span style="display:block;font-family:var(--font-heading);font-size:4.5rem;line-height:1;color:var(--color-accent);font-weight:700">${chapter} ${numPadded}</span>
    <h2 style="font-family:var(--font-heading);font-size:2rem;font-weight:700;color:white;line-height:1.2;margin-top:0.6rem;max-width:80%;border:none;padding:0">[chapter title here]</h2>
  </div>
</div>

⛔ No vh/vw. Do not modify the template structure in any way.

══ BODY ══
<div class="obra-page obra-body">

⚠️ The FIRST element inside every .obra-body MUST be this image slot — copy verbatim, do not change anything:
<div class="obra-image-slot obra-image-slot--chapter" data-slot-key="chapter-${vars.chapter_number}-image-2" data-slot-type="chapter"></div>

Then convert chapter content into rich editorial HTML using these CSS classes actively:

  obra-callout — for key concepts, tips, warnings, definitions
    ⚠️ BREAK SAFETY: keep each callout ≤ 4 lines. break-inside: avoid only works if the element fits within one page.
    If a concept needs more space, use a heading + paragraph instead.

  obra-pull-quote — for 1–2 sentences that deserve visual emphasis
    ⚠️ BREAK SAFETY: keep to a single short sentence. Never wrap a paragraph in obra-pull-quote.

  obra-section-divider — between major topic shifts (a short accent line)

  obra-highlight — inline, for key terms, critical numbers, or memorable phrases

  obra-styled-list — wrap <ul> or <ol> when styled bullets improve readability

  obra-two-col — for lists of ≥ 6 short items (steps, ingredients, tools, etc.)

  h2 — for main section headings (already glued to next element via CSS break rules)
  h3 — for sub-sections

  table — for comparative or structured data (break-inside: avoid already in base CSS)

MULTIPLE BODY PAGES: if content is long, open a new <div class="obra-page obra-body"> at a natural section break.
This is the correct way to handle long chapters — do not put everything in one body div.

⛔ No viewport units (vh/vw) anywhere. No placeholders. No invented content. Include ALL original text verbatim.`;

  const user = `Chapter ${vars.chapter_number} of ${vars.chapter_total}
Chapter title (use this exact text in the opener <h2>): ${vars.chapter_title}

Design system:
  Primary: ${vars.palette.primary}
  Secondary: ${vars.palette.secondary}
  Accent: ${vars.palette.accent}
  Heading font: ${vars.fonts.heading}

=== CHAPTER CONTENT ===
${vars.chapter_content}
=== END CHAPTER CONTENT ===

Generate the chapter opener (using the fixed template above) and body pages. Include ALL content verbatim.`;

  return { system, user };
}

// ─── GenerateDocumentTemplateVars (kept for import compat) ───────────────────
export interface GenerateDocumentTemplateVars {
  content_locale: ContentLocale;
  artifact_type: ArtifactType;
  title: string;
  author: string | null;
  chapters: string;
  palette: string;
  fonts: string;
  page: string;
}

/**
 * Injects signed image URLs into .obra-image-slot divs in the HTML produced by
 * generateDocumentTemplatePrompt. The HTML already contains real content —
 * no text placeholder replacement is needed.
 *
 * @param htmlDoc - Complete HTML document from the Edge Function
 * @param images  - Map of slot-key → signed image URL
 */
function escapeSrcAmpForHtmlAttribute(url: string): string {
  return url.replace(/&/g, "&amp;");
}

export function injectAll(
  htmlDoc: string,
  opts: {
    /** Ignored — content is already embedded in the HTML. Kept for signature compat. */
    chapters?: Array<{ sort_order: number; title: string; content: string | null }>;
    /** Map of slot-key → signed image URL */
    images?: Record<string, string>;
  },
): string {
  let html = htmlDoc;

  if (opts.images) {
    for (const [slotKey, url] of Object.entries(opts.images)) {
      if (!url) continue;
      const slotRe = new RegExp(
        `(<div[^>]*data-slot-key="${slotKey}"[^>]*>)\\s*(<\\/div>)`,
        "i",
      );
      html = html.replace(
        slotRe,
        `$1<img src="${escapeSrcAmpForHtmlAttribute(url)}" alt="" loading="lazy" />$2`,
      );
    }
  }

  return html;
}
