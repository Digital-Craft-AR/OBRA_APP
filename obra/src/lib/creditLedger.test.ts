import { describe, expect, it } from "vitest";
import {
  type CreditLedgerReason,
  type CreditLedgerRow,
  formatCreditDelta,
  isCreditLedgerReason,
} from "./creditLedger";

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
    expect(isCreditLedgerReason("adjustment")).toBe(true);
    expect(isCreditLedgerReason("grant")).toBe(true);
    expect(isCreditLedgerReason("refund")).toBe(true);
    expect(isCreditLedgerReason("other")).toBe(true);
  });
  it("rejects unknown", () => {
    expect(isCreditLedgerReason("nope")).toBe(false);
    expect(isCreditLedgerReason("")).toBe(false);
    expect(isCreditLedgerReason("Consumption")).toBe(false);
  });
});

describe("CreditLedgerRow type (audit contract)", () => {
  it("has no user-content fields — only audit metadata", () => {
    // This test documents the shape of ledger rows returned to the client.
    // The row MUST NOT contain chapter content, manuscript text, or PII.
    const row: CreditLedgerRow = {
      id: "uuid",
      created_at: "2026-01-01T00:00:00Z",
      delta: -2,
      balance_after: 48,
      reason: "consumption" satisfies CreditLedgerReason,
      project_id: "proj-uuid",
      source_function: "ai-generate-content",
    };
    const keys = Object.keys(row);
    // Must not include content fields
    expect(keys).not.toContain("content");
    expect(keys).not.toContain("chapter_content");
    expect(keys).not.toContain("manuscript");
    // Must include audit fields
    expect(keys).toContain("source_function");
    expect(keys).toContain("reason");
    expect(keys).toContain("project_id");
  });
});
