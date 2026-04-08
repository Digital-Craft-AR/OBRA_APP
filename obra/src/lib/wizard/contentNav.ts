export type ContentPackageNavTarget =
  | { kind: "main" }
  | { kind: "bonus"; index: number }
  | { kind: "bump"; index: number };

/** Stable key for React state maps and selection persistence. */
export function contentNavTargetToKey(target: ContentPackageNavTarget): string {
  if (target.kind === "main") return "main";
  if (target.kind === "bonus") return `bonus:${target.index}`;
  return `bump:${target.index}`;
}

export function parseContentNavKey(key: string): ContentPackageNavTarget | null {
  if (key === "main") return { kind: "main" };
  if (key.startsWith("bonus:")) {
    const index = Number(key.slice("bonus:".length));
    return Number.isInteger(index) && index >= 0 ? { kind: "bonus", index } : null;
  }
  if (key.startsWith("bump:")) {
    const index = Number(key.slice("bump:".length));
    return Number.isInteger(index) && index >= 0 ? { kind: "bump", index } : null;
  }
  return null;
}

/**
 * Ordered nav targets: main ebook, then each bonus, then each bump.
 * Counts are clamped to non-negative integers.
 */
export function buildContentPackageNavTargets(bonusCount: number, bumpCount: number): ContentPackageNavTarget[] {
  const bonuses = Math.max(0, Math.floor(bonusCount));
  const bumps = Math.max(0, Math.floor(bumpCount));
  const out: ContentPackageNavTarget[] = [{ kind: "main" }];
  for (let i = 0; i < bonuses; i++) out.push({ kind: "bonus", index: i });
  for (let i = 0; i < bumps; i++) out.push({ kind: "bump", index: i });
  return out;
}

/** Main ebook and order bumps use a multi-chapter TOC; bonuses use a single section. */
export function usesMultiChapterContentNavTarget(target: ContentPackageNavTarget): boolean {
  return target.kind === "main" || target.kind === "bump";
}
