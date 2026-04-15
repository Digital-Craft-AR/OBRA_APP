import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
 * Polls job status every 3 seconds until completion or error
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
  const [isPolling, setIsPolling] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Estimate time remaining based on job creation time
  useEffect(() => {
    if (!job || job.status === "completed" || job.status === "failed") return;

    const createdAt = new Date(job.createdAt).getTime();
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - createdAt) / 1000);
    const estimatedTotal = 60; // From queue response
    const remaining = Math.max(0, estimatedTotal - elapsedSeconds);

    setTimeRemaining(remaining);
  }, [job]);

  // Poll job status
  useEffect(() => {
    if (!isOpen || !jobId) {
      setIsPolling(false);
      return;
    }

    // Fetch initial job state
    const fetchJob = async () => {
      try {
        const currentJob = await checkPdfStatus(jobId);
        setJob(currentJob);
        setError(null);

        // Stop polling if job is complete
        if (currentJob.status === "completed") {
          setIsPolling(false);
          if (onSuccess && currentJob.pdfUrl) {
            onSuccess(currentJob.pdfUrl);
          }
        } else if (currentJob.status === "failed") {
          setIsPolling(false);
          setError(currentJob.errorMessage || "PDF generation failed");
        }
      } catch (err) {
        setError(getErrorMessage(err));
        setIsPolling(false);
      }
    };

    fetchJob();

    // Set up polling interval (3 seconds)
    const pollInterval = setInterval(fetchJob, 3000);

    return () => clearInterval(pollInterval);
  }, [isOpen, jobId, onSuccess]);

  const handleClose = () => {
    setIsPolling(false);
    setJob(null);
    setError(null);
    setTimeRemaining(null);
    onOpenChange(false);
  };

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
    // Let the parent component handle retry by creating a new job
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Exporting PDF</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Processing State */}
          {job?.status === "processing" || (job?.status === "pending" && !error) ? (
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
          {job?.status === "completed" && job?.pdfUrl ? (
            <div className="flex flex-col items-center gap-4 py-6">
              <CheckCircle2 className="size-8 text-obra-green-400" />
              <div className="space-y-1 text-center">
                <p className="font-body text-sm font-semibold text-obra-blue-950">PDF Ready!</p>
                <p className="text-xs text-obra-neutral-600">Your PDF is ready to download</p>
              </div>
            </div>
          ) : null}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center gap-4 py-6">
              <AlertCircle className="size-8 text-red-500" />
              <div className="space-y-1 text-center">
                <p className="font-body text-sm font-semibold text-obra-blue-950">
                  Generation Failed
                </p>
                <p className="text-xs text-obra-neutral-600">{error}</p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            {job?.status === "completed" && job?.pdfUrl ? (
              <>
                <Button
                  onClick={handleDownload}
                  className="flex-1 gap-2"
                  variant="primary"
                >
                  <DownloadCloud className="size-4" />
                  Download
                </Button>
                <Button onClick={handleClose} variant="secondary" className="flex-1">
                  Close
                </Button>
              </>
            ) : error ? (
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
