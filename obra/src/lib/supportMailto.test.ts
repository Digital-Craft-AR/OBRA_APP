import { describe, expect, it } from "vitest";
import { buildSupportMailtoHref } from "@/lib/supportMailto";

describe("buildSupportMailtoHref", () => {
  it("returns bare mailto when no subject exists", () => {
    expect(buildSupportMailtoHref("support@obra.app")).toBe("mailto:support@obra.app");
  });

  it("encodes subject when provided", () => {
    expect(buildSupportMailtoHref("support@obra.app", { subject: "Soporte Obra" })).toBe(
      "mailto:support@obra.app?subject=Soporte+Obra",
    );
  });
});
