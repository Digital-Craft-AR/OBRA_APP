import { describe, expect, it } from "vitest";
import {
  MAIN_TOC_MAX_CHAPTERS,
  MAIN_TOC_MIN_CHAPTERS,
  validateMainTocForConfirm,
} from "@/lib/wizard/contentIndexApi";

describe("validateMainTocForConfirm", () => {
  it("accepts non-empty titles within bounds", () => {
    expect(validateMainTocForConfirm([{ title: "A" }, { title: "B" }])).toBe("ok");
  });

  it("rejects empty titles", () => {
    expect(validateMainTocForConfirm([{ title: "   " }])).toBe("empty_title");
    expect(validateMainTocForConfirm([{ title: "Ok" }, { title: "" }])).toBe("empty_title");
  });

  it("rejects too few chapters", () => {
    expect(validateMainTocForConfirm([])).toBe("too_few");
  });

  it("rejects too many chapters", () => {
    const rows = Array.from({ length: MAIN_TOC_MAX_CHAPTERS + 1 }, (_, i) => ({
      title: `C${i}`,
    }));
    expect(validateMainTocForConfirm(rows)).toBe("too_many");
    expect(MAIN_TOC_MIN_CHAPTERS).toBeGreaterThanOrEqual(1);
  });
});
