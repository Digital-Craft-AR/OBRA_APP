import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { AlertCircle, Loader2, Upload } from "lucide-react";
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
  const panelTitleId = useId();
  const dropZoneId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [localRow, setLocalRow] = useState<ProjectManuscriptRow | null>(initialManuscript);
  const [clientError, setClientError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [lastFailedFile, setLastFailedFile] = useState<File | null>(null);

  const displayRow = localRow ?? initialManuscript;
  const errorMessage = clientError ?? serverError;
  const extractedCount = displayRow?.extracted_char_count;
  const hasParseSuccess = extractedCount != null;

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
        setLastFailedFile(null);
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

  const openFilePicker = () => {
    if (busy) return;
    fileInputRef.current?.click();
  };

  const handlePickAnotherFile = () => {
    setClientError(null);
    setServerError(null);
    setLastFailedFile(null);
    openFilePicker();
  };

  const handleRetryLastFailed = () => {
    if (!lastFailedFile) return;
    void runUpload(lastFailedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy && !hasParseSuccess) setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (busy || hasParseSuccess) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void runUpload(file);
  };

  const handleDropZoneKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (busy || hasParseSuccess || errorMessage) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openFilePicker();
    }
  };

  const baseDropClasses =
    "flex min-h-[280px] flex-col items-center justify-center gap-4 rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors";
  const idleDropClasses = dragActive
    ? "border-obra-blue-700 bg-obra-blue-50"
    : "border-obra-neutral-200 bg-white";
  const busyDropClasses = "border-obra-blue-200 bg-obra-blue-50/80";
  const errorDropClasses = "border-red-200 bg-red-50";

  return (
    <div className="flex flex-col gap-6">
      <header className="space-y-2">
        <h2 id={panelTitleId} className="font-display text-2xl text-obra-blue-950">
          {t("wizard.content.manuscript.panelTitle")}
        </h2>
        <p className="font-body text-sm text-obra-neutral-600">{t("wizard.content.manuscript.panelSubtitle")}</p>
      </header>

      <label htmlFor={inputId} className="sr-only">
        {t("wizard.content.manuscript.dropPrimary")}
      </label>
      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={MANUSCRIPT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        disabled={busy || hasParseSuccess}
        onChange={onFileChange}
      />

      {hasParseSuccess ? (
        <div role="status" aria-live="polite" className="rounded-card border border-obra-blue-100 bg-obra-blue-50/60 px-5 py-6">
          <p className="font-body text-sm font-medium text-obra-blue-950">
            {t("wizard.content.manuscript.successStats", {
              count: extractedCount ?? 0,
            })}
          </p>
          <p className="mt-2 font-body text-sm text-obra-neutral-600">{t("wizard.content.manuscript.nextSplitStub")}</p>
        </div>
      ) : (
        <>
          <div
            id={dropZoneId}
            role="region"
            aria-labelledby={panelTitleId}
            aria-busy={busy}
            tabIndex={busy || errorMessage ? -1 : 0}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onKeyDown={handleDropZoneKeyDown}
            className={`${baseDropClasses} ${
              errorMessage ? errorDropClasses : busy ? busyDropClasses : idleDropClasses
            } ${!busy && !errorMessage ? "cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700 focus-visible:ring-offset-2" : ""}`}
            onClick={!busy && !errorMessage ? openFilePicker : undefined}
          >
            {errorMessage ? (
              <>
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600"
                  aria-hidden
                >
                  <AlertCircle className="size-7 stroke-[2]" />
                </div>
                <p role="alert" aria-live="assertive" className="max-w-md font-body text-sm font-semibold text-red-600">
                  {errorMessage}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {lastFailedFile ? (
                    <>
                      <Button
                        type="button"
                        variant="tertiary"
                        size="medium"
                        disabled={busy}
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryLastFailed();
                        }}
                      >
                        {t("wizard.content.manuscript.retry")}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="medium"
                        disabled={busy}
                        className="shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePickAnotherFile();
                        }}
                      >
                        {t("wizard.content.manuscript.pickAnotherFile")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      variant="tertiary"
                      size="medium"
                      disabled={busy}
                      className="shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePickAnotherFile();
                      }}
                    >
                      {t("wizard.content.manuscript.pickAnotherFile")}
                    </Button>
                  )}
                </div>
              </>
            ) : busy ? (
              <div className="space-y-4" aria-live="polite">
                <Loader2 className="mx-auto size-10 shrink-0 animate-spin text-obra-blue-700" aria-hidden />
                <div className="space-y-1">
                  <p className="font-body text-sm font-semibold text-obra-blue-950">{t("wizard.content.manuscript.uploading")}</p>
                  <p className="font-body text-sm text-obra-neutral-600">{t("wizard.content.manuscript.uploadingDetail")}</p>
                </div>
              </div>
            ) : (
              <>
                <div
                  className="flex size-14 shrink-0 items-center justify-center rounded-full bg-obra-blue-100 text-obra-blue-700"
                  aria-hidden
                >
                  <Upload className="size-7 stroke-[2]" />
                </div>
                <div className="space-y-2">
                  <p className="font-body text-base font-semibold text-obra-blue-950">{t("wizard.content.manuscript.dropPrimary")}</p>
                  <button
                    type="button"
                    className="font-body text-sm font-semibold text-obra-blue-700 underline underline-offset-4 hover:text-obra-blue-900"
                    onClick={(e) => {
                      e.stopPropagation();
                      openFilePicker();
                    }}
                  >
                    {t("wizard.content.manuscript.dropClickHint")}
                  </button>
                </div>
                <p className="max-w-sm font-body text-xs leading-relaxed text-obra-neutral-600">
                  {t("wizard.content.manuscript.dropFooter")}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
