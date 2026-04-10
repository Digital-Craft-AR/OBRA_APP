/**
 * Read chapter count and content tone from `projects.design_config` JSON (issue #112).
 */

import type { ChapterCount, ContentTone } from "./prompts.ts";

const TONE_KEYS: readonly ContentTone[] = [
  "professional",
  "friendly",
  "inspirational",
  "direct",
  "educational",
];

const DEFAULT_CHAPTER_COUNT: ChapterCount = 8;
const DEFAULT_CONTENT_TONE: ContentTone = "friendly";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseDesignConfigForAi(designConfig: unknown): {
  chapterCount: ChapterCount;
  contentTone: ContentTone;
} {
  if (!isObject(designConfig)) {
    return { chapterCount: DEFAULT_CHAPTER_COUNT, contentTone: DEFAULT_CONTENT_TONE };
  }

  const chapterRaw =
    designConfig.chapterCount !== undefined
      ? designConfig.chapterCount
      : designConfig.chapter_count !== undefined
        ? designConfig.chapter_count
        : undefined;
  const n = typeof chapterRaw === "number" ? chapterRaw : Number(chapterRaw);
  const chapterCount =
    n === 6 || n === 8 || n === 10 || n === 12 ? (n as ChapterCount) : DEFAULT_CHAPTER_COUNT;

  const toneRaw =
    typeof designConfig.contentTone === "string"
      ? designConfig.contentTone
      : typeof designConfig.content_tone === "string"
        ? designConfig.content_tone
        : null;
  const contentTone =
    toneRaw && (TONE_KEYS as readonly string[]).includes(toneRaw)
      ? (toneRaw as ContentTone)
      : DEFAULT_CONTENT_TONE;

  return { chapterCount, contentTone };
}
