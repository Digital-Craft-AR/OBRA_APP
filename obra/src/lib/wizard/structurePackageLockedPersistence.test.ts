import { describe, expect, it } from "vitest";
import { isValidLockedPackageDraft } from "@/lib/wizard/structurePackageLockedPersistence";

describe("isValidLockedPackageDraft", () => {
  it("accepts empty drafts", () => {
    expect(isValidLockedPackageDraft([], [])).toBe(true);
  });

  it("accepts limits", () => {
    expect(
      isValidLockedPackageDraft(
        Array.from({ length: 5 }, () => ({ ebookId: null, title: "x" })),
        Array.from({ length: 2 }, () => ({ ebookId: null, title: "y" })),
      ),
    ).toBe(true);
  });

  it("rejects too many bonuses", () => {
    expect(
      isValidLockedPackageDraft(
        Array.from({ length: 6 }, () => ({ ebookId: null, title: "x" })),
        [],
      ),
    ).toBe(false);
  });

  it("rejects too many bumps", () => {
    expect(
      isValidLockedPackageDraft(
        [],
        Array.from({ length: 3 }, () => ({ ebookId: null, title: "y" })),
      ),
    ).toBe(false);
  });
});
