/**
 * generateChapterPrompt — builds system + user prompts for chapter body generation.
 * docs: prompts/content/generate-chapter.md (v1.0)
 *
 * Client-side copy. Keep aligned with supabase/functions/_shared/prompts.ts.
 * When editing the prompt, update both files and the .md source in the same commit.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type ContentLocale = "es" | "pt-BR" | "en-US" | "en-GB";
export type ContentTone =
  | "professional"
  | "friendly"
  | "inspirational"
  | "direct"
  | "educational";

export interface PreviousChapter {
  number: number;
  title: string;
  /** Full HTML body of the chapter as stored in chapters.content. */
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
   * Pass as JSON.stringify(indexOutput) — full output of generateIndexPrompt.
   * Must include narrative_arc and chapters[].{number, title, description, key_concepts, word_count_target}.
   */
  index: string;
  chapter_number: number;
  chapter_count: number;
  /**
   * Already-generated chapters in order. Pass [] for chapter 1.
   * For chapters 6+, caller may truncate older chapter HTML to 2–3 sentence summaries
   * to stay within context limits — the index always provides structural coherence.
   */
  previous_chapters: PreviousChapter[];
  /** Author name or brand. Omitted from user prompt when null/undefined. */
  author?: string | null;
}

// ─── Internal types for index parsing ────────────────────────────────────────

interface IndexChapter {
  number: number;
  title: string;
  description: string;
  key_concepts: string[];
  word_count_target: number;
}

interface ParsedIndex {
  narrative_arc?: string;
  chapters?: IndexChapter[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBRA_SYSTEM_BASE =
  "You are Obra's content AI. Obra creates infoproduct packages (ebook + bonuses + order bumps) for LATAM creators who need professional results fast, without design or code skills.";

// Defined as a plain string (not a template literal) so the embedded backtick
// sequences are safe to interpolate into template-literal system strings.
const CRITICAL_JSON_OBJECT =
  "CRITICAL OUTPUT FORMAT: Your response must start with { and end with }. Do NOT wrap the JSON in markdown code blocks. Do NOT use ```json or ``` anywhere. Do NOT add any text before or after the JSON object. The first character of your response must be { and the last character must be }.";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseIndex(indexJson: string): ParsedIndex | null {
  try {
    const parsed = JSON.parse(indexJson) as ParsedIndex;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function findChapter(parsed: ParsedIndex, chapterNumber: number): IndexChapter | null {
  if (!Array.isArray(parsed.chapters)) return null;
  return parsed.chapters.find((c) => c.number === chapterNumber) ?? null;
}

function formatKeyConcepts(keyConcepts: string[]): string {
  return keyConcepts.map((kc, i) => `  ${i + 1}. ${kc}`).join("\n");
}

// ─── Main function ────────────────────────────────────────────────────────────

/**
 * Builds the system and user prompts for generating one chapter of the main ebook.
 *
 * Returns null if the index cannot be parsed or if chapter_number is not found in it —
 * callers should treat null as a build error and not invoke the AI.
 */
export function generateChapterPrompt(
  vars: GenerateChapterVars,
): { system: string; user: string } | null {
  const parsedIndex = parseIndex(vars.index);
  if (!parsedIndex) return null;

  const chapter = findChapter(parsedIndex, vars.chapter_number);
  if (!chapter) return null;

  const previousChaptersJson = JSON.stringify(
    vars.previous_chapters.map((c) => ({
      number: c.number,
      title: c.title,
      content: c.content,
    })),
  );

  const authorLine =
    vars.author != null && vars.author.trim().length > 0
      ? `Author: ${vars.author.trim()}\n`
      : "";

  const system = `${CRITICAL_JSON_OBJECT}

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

If input is missing required fields or contains error fields, return:
{"error": "INVALID_INPUT", "message": "<brief reason in ${vars.content_locale}>"}`;

  const user = `Topic: ${vars.topic}
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
${formatKeyConcepts(chapter.key_concepts)}
- Word count target: ${chapter.word_count_target}

Write the full HTML body of this chapter. Do not include the chapter title as <h1>. Start directly with the chapter body.`;

  return { system, user };
}
