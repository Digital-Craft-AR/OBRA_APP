import { describe, expect, it } from "vitest";
import {
  isValidBonusDraftOnly,
  isValidBumpDraftOnly,
  isValidLockedPackageDraft,
} from "@/lib/wizard/structurePackageLockedPersistence";

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

describe("isValidBonusDraftOnly", () => {
  it("accepts up to five rows", () => {
    expect(isValidBonusDraftOnly(Array.from({ length: 5 }, () => ({ ebookId: null, title: "x" })))).toBe(true);
  });
  it("rejects more than five", () => {
    expect(isValidBonusDraftOnly(Array.from({ length: 6 }, () => ({ ebookId: null, title: "x" })))).toBe(false);
  });
});

describe("isValidBumpDraftOnly", () => {
  it("accepts up to two rows", () => {
    expect(isValidBumpDraftOnly(Array.from({ length: 2 }, () => ({ ebookId: null, title: "y" })))).toBe(true);
  });
  it("rejects more than two", () => {
    expect(isValidBumpDraftOnly(Array.from({ length: 3 }, () => ({ ebookId: null, title: "y" })))).toBe(false);
  });
});
