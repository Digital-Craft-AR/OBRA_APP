import { describe, expect, it } from "vitest";
import { DEFAULT_SUPPORT_EMAIL, getSupportEmail } from "@/lib/supportEmail";

describe("getSupportEmail", () => {
  it("falls back to default when env is missing", () => {
    expect(getSupportEmail()).toBe(DEFAULT_SUPPORT_EMAIL);
  });
});
