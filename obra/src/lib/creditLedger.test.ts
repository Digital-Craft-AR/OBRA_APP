import { describe, expect, it } from "vitest";
import { formatCreditDelta, isCreditLedgerReason } from "./creditLedger";

describe("formatCreditDelta", () => {
  it("prefixes positive values with +", () => {
    expect(formatCreditDelta(100)).toMatch(/^\+/);
    expect(formatCreditDelta(-30)).toBe("-30");
  });
});

describe("isCreditLedgerReason", () => {
  it("accepts known reasons", () => {
    expect(isCreditLedgerReason("top_up")).toBe(true);
    expect(isCreditLedgerReason("consumption")).toBe(true);
  });
  it("rejects unknown", () => {
    expect(isCreditLedgerReason("nope")).toBe(false);
  });
});
