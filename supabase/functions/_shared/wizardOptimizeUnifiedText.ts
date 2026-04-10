/**
 * Convert optimize-topic / optimize-avatar / optimize-problem JSON into one multiline string
 * for `optimized` (blocks separated by a blank line). Used by `ai-optimize`.
 */

export function topicFramingToUnifiedText(framing: Record<string, unknown>): string {
  const parts: string[] = [];

  const title = typeof framing.optimized_title === "string" ? framing.optimized_title.trim() : "";
  if (title) parts.push(title);

  const description = typeof framing.description === "string" ? framing.description.trim() : "";
  if (description) parts.push(description);

  const niche = typeof framing.niche === "string" ? framing.niche.trim() : "";
  if (niche) parts.push(niche);

  const angle = typeof framing.angle === "string" ? framing.angle.trim() : "";
  if (angle) parts.push(angle);

  return parts.join("\n");
}

function appendStringArrayParts(parts: string[], framing: Record<string, unknown>, key: string): void {
  const raw = framing[key];
  if (!Array.isArray(raw)) return;
  for (const item of raw) {
    if (typeof item === "string") {
      const s = item.trim();
      if (s) parts.push(s);
    }
  }
}

export function avatarProfileToUnifiedText(profile: Record<string, unknown>): string {
  const parts: string[] = [];

  const desc = typeof profile.description === "string" ? profile.description.trim() : "";
  if (desc) parts.push(desc);

  const demo = profile.demographics;
  if (demo && typeof demo === "object" && demo !== null && !Array.isArray(demo)) {
    const d = demo as Record<string, unknown>;
    const order = ["age_range", "gender", "location", "socioeconomic"] as const;
    const lines = order.map((k) => (typeof d[k] === "string" ? (d[k] as string).trim() : "")).filter(Boolean);
    if (lines.length) parts.push(lines.join("\n"));
  }

  appendStringArrayParts(parts, profile, "pains");
  appendStringArrayParts(parts, profile, "desires");
  appendStringArrayParts(parts, profile, "objections");

  return parts.join("\n");
}

/** core_problem, sub_problems, transformation (from -> to), urgency — blocks separated by a blank line. */
export function problemFramingToUnifiedText(framing: Record<string, unknown>): string {
  const parts: string[] = [];

  const core = typeof framing.core_problem === "string" ? framing.core_problem.trim() : "";
  if (core) parts.push(core);

  const subsRaw = framing.sub_problems;
  if (Array.isArray(subsRaw)) {
    for (const item of subsRaw) {
      if (typeof item === "string") {
        const s = item.trim();
        if (s) parts.push(s);
      }
    }
  }

  const trans = framing.transformation;
  if (trans && typeof trans === "object" && trans !== null && !Array.isArray(trans)) {
    const t = trans as Record<string, unknown>;
    const from = typeof t.from === "string" ? t.from.trim() : "";
    const to = typeof t.to === "string" ? t.to.trim() : "";
    if (from && to) {
      parts.push(`${from} -> ${to}`);
    } else if (from) {
      parts.push(from);
    } else if (to) {
      parts.push(to);
    }
  }

  const urgency = typeof framing.urgency === "string" ? framing.urgency.trim() : "";
  if (urgency) parts.push(urgency);

  return parts.join("\n");
}
