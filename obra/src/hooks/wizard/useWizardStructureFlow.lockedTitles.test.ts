/**
 * Unit tests for the locked_titles logic used in regenerateItem and
 * regenerateAllItems inside useWizardStructureFlow.
 *
 * We test the pure array-manipulation invariants without rendering the hook,
 * matching the exact code paths in those two functions.
 */
import { describe, expect, it } from "vitest";

// ── types matching the hook's internal shape ──────────────────────────────────

interface BonusBumpItem {
  title: string;
  locked: boolean;
}

// ── helpers that mirror the hook logic exactly ────────────────────────────────

/** Mirrors regenerateItem: all titles except the one being regenerated. */
function buildLockedTitlesForSingleRegen(items: BonusBumpItem[], excludeIndex: number): string[] {
  return items
    .filter((_, i) => i !== excludeIndex)
    .map((x) => x.title.trim())
    .filter(Boolean);
}

/**
 * Mirrors regenerateAllItems: explicitly locked source titles + titles already
 * generated in the current batch (so successive calls cannot repeat them).
 */
function buildLockedTitlesForBatch(
  sourceItems: BonusBumpItem[],
  alreadyGenerated: Record<number, string>,
): string[] {
  return [
    ...sourceItems.filter((x) => x.locked).map((x) => x.title.trim()).filter(Boolean),
    ...Object.values(alreadyGenerated),
  ];
}

// ── regenerateItem ─────────────────────────────────────────────────────────────

describe("buildLockedTitlesForSingleRegen", () => {
  it("includes all other item titles regardless of locked status", () => {
    const items: BonusBumpItem[] = [
      { title: "Título A", locked: false },
      { title: "Título B", locked: true },
      { title: "Título C", locked: false },
    ];
    expect(buildLockedTitlesForSingleRegen(items, 0)).toEqual(["Título B", "Título C"]);
    expect(buildLockedTitlesForSingleRegen(items, 1)).toEqual(["Título A", "Título C"]);
    expect(buildLockedTitlesForSingleRegen(items, 2)).toEqual(["Título A", "Título B"]);
  });

  it("excludes only the target index", () => {
    const items: BonusBumpItem[] = [
      { title: "A", locked: false },
      { title: "B", locked: false },
      { title: "C", locked: false },
    ];
    // Regenerating index 1 — A and C should be locked, preventing duplication.
    expect(buildLockedTitlesForSingleRegen(items, 1)).toEqual(["A", "C"]);
  });

  it("returns empty array when there is only one item", () => {
    const items: BonusBumpItem[] = [{ title: "Solo", locked: false }];
    expect(buildLockedTitlesForSingleRegen(items, 0)).toEqual([]);
  });

  it("filters out blank titles", () => {
    const items: BonusBumpItem[] = [
      { title: "  ", locked: false },
      { title: "Real title", locked: false },
    ];
    expect(buildLockedTitlesForSingleRegen(items, 1)).toEqual([]);
  });
});

// ── regenerateAllItems ─────────────────────────────────────────────────────────

describe("buildLockedTitlesForBatch", () => {
  it("starts with only explicitly locked source titles on the first call", () => {
    const items: BonusBumpItem[] = [
      { title: "Locked one", locked: true },
      { title: "Unlocked A", locked: false },
      { title: "Unlocked B", locked: false },
    ];
    expect(buildLockedTitlesForBatch(items, {})).toEqual(["Locked one"]);
  });

  it("accumulates generated titles across batch iterations", () => {
    const items: BonusBumpItem[] = [
      { title: "Locked", locked: true },
      { title: "Unlocked A", locked: false },
      { title: "Unlocked B", locked: false },
      { title: "Unlocked C", locked: false },
    ];
    // Simulate loop: first iteration generates index 1
    const after1 = buildLockedTitlesForBatch(items, { 1: "Generated A" });
    expect(after1).toEqual(["Locked", "Generated A"]);

    // Second iteration generates index 2 — both locked and first result present
    const after2 = buildLockedTitlesForBatch(items, { 1: "Generated A", 2: "Generated B" });
    expect(after2).toEqual(["Locked", "Generated A", "Generated B"]);
  });

  it("prevents the model from repeating titles across the batch", () => {
    const items: BonusBumpItem[] = [
      { title: "Bonus A", locked: false },
      { title: "Bonus B", locked: false },
    ];
    // After generating "New Bonus A" for index 0, index 1 must see it as locked.
    const lockedForIndex1 = buildLockedTitlesForBatch(items, { 0: "New Bonus A" });
    expect(lockedForIndex1).toContain("New Bonus A");
  });

  it("returns empty array when nothing is locked and nothing generated yet", () => {
    const items: BonusBumpItem[] = [
      { title: "A", locked: false },
      { title: "B", locked: false },
    ];
    expect(buildLockedTitlesForBatch(items, {})).toEqual([]);
  });
});
