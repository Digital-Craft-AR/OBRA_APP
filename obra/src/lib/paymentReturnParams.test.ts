import { describe, expect, it } from "vitest";
import { looksLikePaymentReturnQuery, parsePaymentReturnOutcome } from "./paymentReturnParams";

describe("parsePaymentReturnOutcome", () => {
  it("treats status=success as success", () => {
    const q = new URLSearchParams("status=success");
    expect(parsePaymentReturnOutcome(q)).toBe("success");
  });

  it("treats collection_status=approved as success", () => {
    const q = new URLSearchParams("collection_status=approved");
    expect(parsePaymentReturnOutcome(q)).toBe("success");
  });

  it("treats preapproval_id presence as success (MP subscription back_url)", () => {
    const q = new URLSearchParams("preapproval_id=4a1ecd1d574742289b6684f214198130");
    expect(parsePaymentReturnOutcome(q)).toBe("success");
  });

  it("treats failure and pending", () => {
    expect(parsePaymentReturnOutcome(new URLSearchParams("status=failure"))).toBe("failure");
    expect(parsePaymentReturnOutcome(new URLSearchParams("status=pending"))).toBe("pending");
  });
});

describe("looksLikePaymentReturnQuery", () => {
  it("detects typical Mercado Pago keys", () => {
    expect(looksLikePaymentReturnQuery(new URLSearchParams("collection_id=1"))).toBe(true);
    expect(looksLikePaymentReturnQuery(new URLSearchParams("preference_id=x"))).toBe(true);
    expect(looksLikePaymentReturnQuery(new URLSearchParams("foo=bar"))).toBe(false);
  });
});
