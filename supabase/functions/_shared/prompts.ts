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
