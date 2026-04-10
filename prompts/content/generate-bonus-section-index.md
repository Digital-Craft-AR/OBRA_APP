# generate-bonus-section-index — Single body section title for a bonus PDF

**Path:** `prompts/content/generate-bonus-section-index.md`  
**Implementation:** `supabase/functions/_shared/prompts.ts` → `generateBonusSectionIndexPrompt()`  
**Edge entry:** `supabase/functions/ai-generate-index/index.ts` when `target_ebook_id` refers to an `ebooks` row with `type = bonus`  
**Status:** draft  
**Last review:** 2026-04-10

---

## 1. Goal

Bonuses in Obra use a **single** chapter row in the content wizard (one primary section for a short deliverable). Regenerating the “outline” for a bonus must return **exactly one** section title aligned with wizard context (topic, avatar, problem, main ebook title, bonus product title, tone).

---

## 2. Inputs

| Variable | Type | Required | Description |
| -------- | ---- | -------- | ----------- |
| `content_locale` | `ContentLocale` | yes | Output language |
| `topic` | string | yes | Project topic |
| `avatar` | string (JSON) | yes | Serialized optimize-avatar output |
| `problem` | string (JSON) | yes | Serialized optimize-problem output |
| `main_ebook_title` | string | yes | `projects.main_title` |
| `bonus_product_title` | string | yes | `ebooks.title` for the bonus slot |
| `tone` | `ContentTone` | yes | From `design_config.contentTone` |

---

## 3. Output

Strict JSON object: `{ "chapters": [ { "number": 1, "title", "description", "key_concepts", "word_count_target" } ] }` — exactly one chapter. The client persists `title` as the single TOC row; other fields are for model quality and may be ignored by the edge response mapping.

---

## 4. Errors

Same pattern as `generate-index`: `{"error":"INVALID_INPUT","reason":"..."}` for invalid inputs.
