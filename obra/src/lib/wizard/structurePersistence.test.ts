import { describe, expect, it } from "vitest";
import { isLikelyMissingProjectsColumnError } from "@/lib/wizard/structurePersistence";

describe("isLikelyMissingProjectsColumnError", () => {
  it("returns false for null", () => {
    expect(isLikelyMissingProjectsColumnError(null)).toBe(false);
  });

  it("detects PGRST204", () => {
    expect(isLikelyMissingProjectsColumnError({ code: "PGRST204", message: "x" })).toBe(true);
  });

  it("detects schema cache wording", () => {
    expect(
      isLikelyMissingProjectsColumnError({
        message: "Could not find the 'book_template_id' column of 'projects' in the schema cache",
      }),
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isLikelyMissingProjectsColumnError({ message: "permission denied", code: "42501" })).toBe(false);
  });
});
