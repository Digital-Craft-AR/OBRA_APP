import { useCallback, useEffect, useRef, useState } from "react";
import { Modal, ModalContent, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { AlertCircle, CheckCircle2, Loader2, DownloadCloud } from "lucide-react";
import { checkPdfStatus, downloadPdf, getErrorMessage, PdfExportJob } from "@/utils/pdf-export";

export type ExportPdfModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string | null;
  projectTitle: string;
  onSuccess?: (pdfUrl: string) => void;
};

/**
 * Modal component for PDF export progress and status
 *
 * Shows:
 * - Processing state with estimated time remaining
 * - Success with download button
 * - Error state with retry option
 *
 * Polls job status every 3 seconds until reaching a terminal state
 * (completed or failed), then stops polling.
 */
export function ExportPdfModal({
  isOpen,
  onOpenChange,
  jobId,
  projectTitle,
  onSuccess,
}: ExportPdfModalProps) {
  const [job, setJob] = useState<PdfExportJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Keep a stable ref to onSuccess so the polling effect doesn't re-run on every
  // parent render (onSuccess is often an inline arrow function).
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  // Estimate time remaining based on job creation time
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const createdAt = new Date(job.createdAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    const estimatedTotal = 60;
    const remaining = Math.max(0, estimatedTotal - elapsedSeconds);

    setTimeRemaining(remaining);
  }, [job]);

  // Poll job status — stops automatically when job reaches a terminal state.
  useEffect(() => {
    if (!isOpen || !jobId) return;

    // isDone tracks whether we've reached a terminal state inside this effect
    // closure so we can skip further polling without waiting for a state update.
    let isDone = false;

    const fetchJob = async () => {
      if (isDone) return;

      try {
        const currentJob = await checkPdfStatus(jobId);

        if (isDone) return; // guard against stale calls after cleanup

        setJob(currentJob);
        setError(null);

        if (currentJob.status === "completed") {
          isDone = true;
          if (currentJob.pdfUrl) {
            onSuccessRef.current?.(currentJob.pdfUrl);
          } else {
            // Worker marked job completed but didn't store a PDF URL.
            // Log for diagnostics — remove once root cause is fixed.
            console.warn("[ExportPdfModal] job completed but pdf_url is null", currentJob);
            setError("El PDF se generó pero el link de descarga no está disponible. Exportá de nuevo.");
          }
        } else if (currentJob.status === "failed") {
          isDone = true;
          setError(currentJob.errorMessage || "PDF generation failed");
        }
      } catch (err) {
        if (!isDone) {
          setError(getErrorMessage(err));
          isDone = true; // stop polling on unexpected errors too
        }
      }
    };

    void fetchJob();

    const pollInterval = setInterval(() => {
      void fetchJob();
    }, 3000);

    return () => {
      isDone = true;
      clearInterval(pollInterval);
    };
  }, [isOpen, jobId]); // intentionally omit onSuccess — use onSuccessRef instead

  const handleClose = useCallback(() => {
    setJob(null);
    setError(null);
    setTimeRemaining(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleDownload = () => {
    if (!job?.pdfUrl) return;

    try {
      const filename = `${projectTitle}.pdf`;
      downloadPdf(job.pdfUrl, filename);
      handleClose();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleRetry = () => {
    setError(null);
    setJob(null);
    handleClose();
  };

  // Derived booleans to keep the JSX readable.
  // While job is null (first fetch not yet returned) we also show the spinner.
  const isProcessing =
    (!job && !error) ||
    ((job?.status === "pending" || job?.status === "processing") && !error);
  const isCompleted = job?.status === "completed" && !!job.pdfUrl && !error;
  const hasError = !!error;

  return (
    <Modal open={isOpen} onClose={handleClose} closeLabel="Close PDF export">
      <ModalHead>
        <ModalTitle>Exporting PDF</ModalTitle>
      </ModalHead>

      <ModalContent className="space-y-4">
        {/* Processing State */}
        {isProcessing ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <Loader2 className="size-8 animate-spin text-obra-green-400" />
            <div className="space-y-1 text-center">
              <p className="font-body text-sm text-obra-blue-950">Generating your PDF...</p>
              {timeRemaining !== null && (
                <p className="text-xs text-obra-neutral-600">
                  {timeRemaining > 0 ? `About ${timeRemaining}s remaining` : "Almost done..."}
                </p>
              )}
            </div>
          </div>
        ) : null}

        {/* Success State */}
        {isCompleted ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <CheckCircle2 className="size-8 text-obra-green-400" />
            <div className="space-y-1 text-center">
              <p className="font-body text-sm font-semibold text-obra-blue-950">PDF Ready!</p>
              <p className="text-xs text-obra-neutral-600">Your PDF is ready to download</p>
            </div>
          </div>
        ) : null}

        {/* Error State — covers both worker failures and completed-but-no-url */}
        {hasError ? (
          <div className="flex flex-col items-center gap-4 py-6">
            <AlertCircle className="size-8 text-red-500" />
            <div className="space-y-1 text-center">
              <p className="font-body text-sm font-semibold text-obra-blue-950">Generation Failed</p>
              <p className="text-xs text-obra-neutral-600">{error}</p>
            </div>
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          {isCompleted ? (
            <>
              <Button onClick={handleDownload} className="flex-1 gap-2" variant="primary">
                <DownloadCloud className="size-4" />
                Download
              </Button>
              <Button onClick={handleClose} variant="secondary" className="flex-1">
                Close
              </Button>
            </>
          ) : hasError ? (
            <>
              <Button onClick={handleRetry} className="flex-1" variant="primary">
                Try Again
              </Button>
              <Button onClick={handleClose} variant="secondary" className="flex-1">
                Close
              </Button>
            </>
          ) : (
            <Button onClick={handleClose} variant="secondary" className="w-full">
              Close
            </Button>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
