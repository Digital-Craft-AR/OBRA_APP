import { describe, expect, it } from "vitest";
import { normalizeUiLocale } from "@/lib/uiLocale";

describe("normalizeUiLocale", () => {
  it("returns es and pt-BR unchanged", () => {
    expect(normalizeUiLocale("es")).toBe("es");
    expect(normalizeUiLocale("pt-BR")).toBe("pt-BR");
  });

  it("falls back to es for unknown or empty values", () => {
    expect(normalizeUiLocale("")).toBe("es");
    expect(normalizeUiLocale("en")).toBe("es");
    expect(normalizeUiLocale(undefined)).toBe("es");
    expect(normalizeUiLocale(null)).toBe("es");
  });
});
