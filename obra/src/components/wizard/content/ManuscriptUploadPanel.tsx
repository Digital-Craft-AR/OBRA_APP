import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { Button } from "@/components/ui/Button";
import {
  fetchActiveManuscript,
  invokeManuscriptUploadParse,
  type ProjectManuscriptRow,
} from "@/lib/wizard/manuscriptUploadApi";
import { MANUSCRIPT_ACCEPT, validateManuscriptFile } from "@/lib/wizard/manuscriptUpload";

type Props = {
  t: TFunction;
  projectId: string;
  initialManuscript: ProjectManuscriptRow | null;
  onManuscriptCommitted: (row: ProjectManuscriptRow) => void;
};

function mapServerErrorCodeToKey(code: string): string {
  switch (code) {
    case "too_large":
      return "wizard.content.manuscript.errorTooLarge";
    case "unsupported_mime":
      return "wizard.content.manuscript.errorUnsupportedMime";
    case "password_pdf":
      return "wizard.content.manuscript.errorPasswordPdf";
    case "empty_extract":
      return "wizard.content.manuscript.errorEmptyExtract";
    case "parse_failed":
      return "wizard.content.manuscript.errorParseFailed";
    case "wrong_phase":
    case "wrong_content_source":
      return "wizard.content.manuscript.errorWrongPhase";
    case "structure_not_complete":
      return "wizard.content.manuscript.errorStructure";
    case "unauthorized":
    case "forbidden":
      return "wizard.content.manuscript.errorUnauthorized";
    case "network_error":
      return "wizard.content.manuscript.errorNetwork";
    default:
      return "wizard.content.manuscript.errorGeneric";
  }
}

export function ManuscriptUploadPanel({ t, projectId, initialManuscript, onManuscriptCommitted }: Props) {
  const inputId = useId();
  const statusId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [localRow, setLocalRow] = useState<ProjectManuscriptRow | null>(initialManuscript);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);

  const displayRow = localRow ?? initialManuscript;

  useEffect(() => {
    setLocalRow(initialManuscript);
  }, [initialManuscript]);

  const runUpload = useCallback(
    async (file: File) => {
      setClientError(null);
      setServerError(null);
      const v = validateManuscriptFile(file);
      if (!v.ok) {
        const key =
          v.issue === "too_large"
            ? "wizard.content.manuscript.errorTooLarge"
            : v.issue === "unsupported_mime"
              ? "wizard.content.manuscript.errorUnsupportedMime"
              : "wizard.content.manuscript.errorEmptyFile";
        setClientError(t(key));
        return;
      }
      setBusy(true);
      const result = await invokeManuscriptUploadParse(projectId, file);
      setBusy(false);
      if (result.ok) {
        setLastFailedFile(null);
        const refreshed = await fetchActiveManuscript(projectId);
        if (refreshed.ok && refreshed.row) {
          setLocalRow(refreshed.row);
          onManuscriptCommitted(refreshed.row);
        } else {
          const row: ProjectManuscriptRow = {
            id: result.manuscript_id,
            project_id: projectId,
            storage_path: "",
            extracted_text_storage_path: null,
            mime: result.mime,
            byte_size: result.byte_size,
            checksum_sha256: null,
            extracted_char_count: result.extracted_char_count,
            uploaded_at: new Date().toISOString(),
            superseded_at: null,
          };
          setLocalRow(row);
          onManuscriptCommitted(row);
        }
        return;
      }
      setLastFailedFile(file);
      setServerError(t(mapServerErrorCodeToKey(result.code)));
    },
    [projectId, t, onManuscriptCommitted],
  );

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    void runUpload(file);
  };

  const handleRetry = () => {
    if (!lastFailedFile) return;
    void runUpload(lastFailedFile);
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-sm text-obra-neutral-600">{t("wizard.content.manuscript.intro")}</p>

      <div
        className="rounded-card border border-obra-blue-100 bg-obra-blue-50/60 px-4 py-4"
        aria-busy={busy}
      >
        <label htmlFor={inputId} className="block text-sm font-medium text-obra-blue-950">
          {t("wizard.content.manuscript.fileLabel")}
        </label>
        <p className="mt-1 text-xs text-obra-neutral-600">{t("wizard.content.manuscript.hintFormats")}</p>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept={MANUSCRIPT_ACCEPT}
          className="sr-only"
          disabled={busy}
          onChange={onFileChange}
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            size="medium"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            {busy ? t("wizard.content.manuscript.uploading") : t("wizard.content.manuscript.uploadCta")}
          </Button>
          {lastFailedFile && !busy ? (
            <Button type="button" variant="tertiary" size="medium" onClick={handleRetry}>
              {t("wizard.content.manuscript.retry")}
            </Button>
          ) : null}
        </div>
      </div>

      <div id={statusId} role="status" aria-live="polite" className="min-h-[1.25rem] text-sm">
        {clientError ? (
          <p className="text-red-700">{clientError}</p>
        ) : serverError ? (
          <p className="text-red-700">{serverError}</p>
        ) : busy ? (
          <p className="text-obra-neutral-600">{t("wizard.content.manuscript.uploadingDetail")}</p>
        ) : displayRow?.extracted_char_count != null ? (
          <div className="space-y-2 text-obra-blue-950">
            <p>
              {t("wizard.content.manuscript.successStats", {
                count: displayRow.extracted_char_count,
              })}
            </p>
            <p className="text-obra-neutral-600">{t("wizard.content.manuscript.nextSplitStub")}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
