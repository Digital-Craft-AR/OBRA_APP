import { describe, expect, it } from "vitest";
import { MANUSCRIPT_MAX_BYTES, validateManuscriptFile } from "./manuscriptUpload";

describe("validateManuscriptFile", () => {
  it("accepts docx under max size", () => {
    const file = new File([new Uint8Array([1])], "book.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateManuscriptFile(file)).toEqual({ ok: true });
  });

  it("accepts pdf under max size", () => {
    const file = new File([new Uint8Array([1])], "book.pdf", {
      type: "application/pdf",
    });
    expect(validateManuscriptFile(file)).toEqual({ ok: true });
  });

  it("rejects empty file", () => {
    const file = new File([], "empty.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateManuscriptFile(file)).toEqual({ ok: false, issue: "empty_file" });
  });

  it("rejects oversize", () => {
    const buf = new Uint8Array(MANUSCRIPT_MAX_BYTES + 1);
    const file = new File([buf], "big.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(validateManuscriptFile(file)).toEqual({ ok: false, issue: "too_large" });
  });

  it("rejects wrong mime", () => {
    const file = new File([new Uint8Array([1])], "x.txt", { type: "text/plain" });
    expect(validateManuscriptFile(file)).toEqual({ ok: false, issue: "unsupported_mime" });
  });

  it("accepts mime with charset suffix", () => {
    const file = new File([new Uint8Array([1])], "book.pdf", {
      type: "application/pdf; charset=binary",
    });
    expect(validateManuscriptFile(file)).toEqual({ ok: true });
  });
});
