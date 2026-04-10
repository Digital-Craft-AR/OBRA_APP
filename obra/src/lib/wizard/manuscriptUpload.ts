/** Client-side gates for manuscript upload (server re-validates). PRD: 10 MB, .docx or text-layer PDF. */

export const MANUSCRIPT_MAX_BYTES = 10 * 1024 * 1024;

export const MANUSCRIPT_ACCEPT = ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const PDF_MIME = "application/pdf";

export type ManuscriptValidationIssue =
  | "too_large"
  | "unsupported_mime"
  | "empty_file";

export function validateManuscriptFile(file: File): { ok: true } | { ok: false; issue: ManuscriptValidationIssue } {
  if (file.size <= 0) {
    return { ok: false, issue: "empty_file" };
  }
  if (file.size > MANUSCRIPT_MAX_BYTES) {
    return { ok: false, issue: "too_large" };
  }
  const mime = (file.type ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
  if (mime !== DOCX_MIME.toLowerCase() && mime !== PDF_MIME.toLowerCase()) {
    return { ok: false, issue: "unsupported_mime" };
  }
  return { ok: true };
}
