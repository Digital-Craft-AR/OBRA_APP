import { describe, expect, it } from "vitest";
import {
  buildContentPackageNavTargets,
  contentNavTargetToKey,
  parseContentNavKey,
  usesMultiChapterContentNavTarget,
} from "@/lib/wizard/contentNav";

describe("contentNavTargetToKey", () => {
  it("maps main, bonus, and bump targets", () => {
    expect(contentNavTargetToKey({ kind: "main" })).toBe("main");
    expect(contentNavTargetToKey({ kind: "bonus", index: 0 })).toBe("bonus:0");
    expect(contentNavTargetToKey({ kind: "bump", index: 2 })).toBe("bump:2");
  });
});

describe("parseContentNavKey", () => {
  it("round-trips valid keys", () => {
    const targets = buildContentPackageNavTargets(2, 1);
    for (const t of targets) {
      expect(parseContentNavKey(contentNavTargetToKey(t))).toEqual(t);
    }
  });

  it("returns null for invalid input", () => {
    expect(parseContentNavKey("")).toBeNull();
    expect(parseContentNavKey("other")).toBeNull();
    expect(parseContentNavKey("bonus:x")).toBeNull();
    expect(parseContentNavKey("bonus:-1")).toBeNull();
  });
});

describe("buildContentPackageNavTargets", () => {
  it("returns main only when counts are zero", () => {
    expect(buildContentPackageNavTargets(0, 0)).toEqual([{ kind: "main" }]);
  });

  it("orders main, bonuses, bumps", () => {
    expect(buildContentPackageNavTargets(2, 1)).toEqual([
      { kind: "main" },
      { kind: "bonus", index: 0 },
      { kind: "bonus", index: 1 },
      { kind: "bump", index: 0 },
    ]);
  });

  it("clamps negative and fractional counts", () => {
    expect(buildContentPackageNavTargets(-3, 1.9)).toEqual([
      { kind: "main" },
      { kind: "bump", index: 0 },
    ]);
  });
});

describe("usesMultiChapterContentNavTarget", () => {
  it("is true for main and bumps, false for bonuses", () => {
    expect(usesMultiChapterContentNavTarget({ kind: "main" })).toBe(true);
    expect(usesMultiChapterContentNavTarget({ kind: "bump", index: 0 })).toBe(true);
    expect(usesMultiChapterContentNavTarget({ kind: "bonus", index: 0 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// allArtifactsApproved logic
//
// This mirrors the WizardContentPage useMemo:
//   navItems.length > 0 && navItems.every((item) => item.tocConfirmed)
// Tested here as a pure helper to avoid mounting the full page component.
// ---------------------------------------------------------------------------

function allArtifactsApproved(navItems: Array<{ tocConfirmed?: boolean }>): boolean {
  return navItems.length > 0 && navItems.every((item) => item.tocConfirmed);
}

describe("allArtifactsApproved (WizardContentPage gate logic)", () => {
  it("returns false when navItems is empty", () => {
    expect(allArtifactsApproved([])).toBe(false);
  });

  it("returns false when any item is not confirmed", () => {
    expect(allArtifactsApproved([{ tocConfirmed: true }, { tocConfirmed: false }])).toBe(false);
  });

  it("returns false when all items are unconfirmed", () => {
    expect(allArtifactsApproved([{ tocConfirmed: false }, { tocConfirmed: false }])).toBe(false);
  });

  it("returns false when tocConfirmed is undefined", () => {
    expect(allArtifactsApproved([{}])).toBe(false);
  });

  it("returns true when all items are confirmed", () => {
    expect(
      allArtifactsApproved([
        { tocConfirmed: true },
        { tocConfirmed: true },
        { tocConfirmed: true },
      ]),
    ).toBe(true);
  });

  it("returns true for a single confirmed item", () => {
    expect(allArtifactsApproved([{ tocConfirmed: true }])).toBe(true);
  });
});
