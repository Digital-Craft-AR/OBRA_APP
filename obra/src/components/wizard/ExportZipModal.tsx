import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Clock, DownloadCloud, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { zip } from "fflate";
import { Modal, ModalContent, ModalFooter, ModalHead, ModalTitle } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { queuePdfExport, checkPdfStatus, getErrorMessage } from "@/utils/pdf-export";

type EbookEntry = {
  id: string;
  label: string;
  type: "main" | "bonus" | "order_bump";
  package_ordinal: number;
};

type EbookJobState = {
  ebookId: string;
  label: string;
  type: "main" | "bonus" | "order_bump";
  package_ordinal: number;
  jobId: string | null;
  status: "queued" | "processing" | "done" | "error";
  pdfUrl: string | null;
  errorMsg: string | null;
};

type Phase = "idle" | "queueing" | "polling" | "bundling" | "done" | "error";

export type ExportZipModalProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  ebooks: EbookEntry[];
  projectId: string;
  projectTitle: string;
  onSuccess: () => void;
};

function ebookFilename(type: string, packageOrdinal: number): string {
  if (type === "main") return "main.pdf";
  if (type === "bonus") return `bonus-${packageOrdinal + 1}.pdf`;
  return `bump-${packageOrdinal + 1}.pdf`;
}

export function ExportZipModal({
  isOpen,
  onOpenChange,
  ebooks,
  projectId,
  projectTitle,
  onSuccess,
}: ExportZipModalProps) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>("idle");
  const [jobs, setJobs] = useState<EbookJobState[]>([]);
  const [downloadHref, setDownloadHref] = useState<string | null>(null);
  const [downloadFilename, setDownloadFilename] = useState("");
  const [overallError, setOverallError] = useState<string | null>(null);

  // Keep a stable ref to onSuccess so effects don't re-run on every parent render
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);

  // Track jobs in a ref for use inside intervals (avoids stale closure)
  const jobsRef = useRef<EbookJobState[]>([]);

  // Sync jobsRef whenever jobs state changes
  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  // Revoke object URL on unmount
  const hrefRef = useRef<string | null>(null);
  useEffect(() => {
    return () => {
      if (hrefRef.current) URL.revokeObjectURL(hrefRef.current);
    };
  }, []);

  const bundleAndFinish = useCallback(
    async (completedJobs: EbookJobState[]) => {
      setPhase("bundling");
      try {
        const pdfBuffers = await Promise.all(
          completedJobs.map((j) => fetch(j.pdfUrl!).then((r) => r.arrayBuffer())),
        );
        const zipEntries: Record<string, Uint8Array> = {};
        completedJobs.forEach((j, i) => {
          zipEntries[ebookFilename(j.type, j.package_ordinal)] = new Uint8Array(pdfBuffers[i]!);
        });
        const zipBytes = await new Promise<Uint8Array>((resolve, reject) => {
          zip(zipEntries, (err, data) => (err ? reject(err) : resolve(data)));
        });
        const blob = new Blob([zipBytes], { type: "application/zip" });
        const href = URL.createObjectURL(blob);
        if (hrefRef.current) URL.revokeObjectURL(hrefRef.current);
        hrefRef.current = href;
        const slug =
          projectTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "project";
        setDownloadHref(href);
        setDownloadFilename(`${slug}.zip`);
        setPhase("done");
        onSuccessRef.current();
      } catch (err) {
        console.error("zip_bundle_error", err);
        setPhase("error");
        setOverallError(t("wizard.preview.exportZip.someError"));
      }
    },
    [projectTitle, t],
  );

  const startExport = useCallback(async () => {
    if (ebooks.length === 0) return;

    setOverallError(null);
    setDownloadHref(null);
    setPhase("queueing");

    const initial: EbookJobState[] = ebooks.map((e) => ({
      ebookId: e.id,
      label: e.label,
      type: e.type,
      package_ordinal: e.package_ordinal,
      jobId: null,
      status: "queued" as const,
      pdfUrl: null,
      errorMsg: null,
    }));
    setJobs(initial);
    jobsRef.current = initial;

    // Queue all PDF jobs in parallel
    const queueResults = await Promise.allSettled(
      ebooks.map((e) => queuePdfExport(projectId, e.id)),
    );

    const afterQueue: EbookJobState[] = initial.map((job, i) => {
      const result = queueResults[i]!;
      if (result.status === "fulfilled") {
        const { jobId, estimatedSeconds } = result.value;
        return {
          ...job,
          jobId,
          // estimatedSeconds === 0 means an existing up-to-date PDF was reused
          status: estimatedSeconds === 0 ? ("done" as const) : ("processing" as const),
        };
      }
      return {
        ...job,
        status: "error" as const,
        errorMsg: getErrorMessage(result.reason),
      };
    });

    // For cache-hit jobs (already done), fetch their pdfUrl
    const cacheHits = afterQueue.filter((j) => j.status === "done" && j.jobId);
    if (cacheHits.length > 0) {
      const statusResults = await Promise.allSettled(
        cacheHits.map((j) => checkPdfStatus(j.jobId!)),
      );
      cacheHits.forEach((hit, i) => {
        const r = statusResults[i]!;
        const idx = afterQueue.findIndex((j) => j.jobId === hit.jobId);
        if (idx !== -1 && r.status === "fulfilled") {
          afterQueue[idx] = { ...afterQueue[idx]!, pdfUrl: r.value.pdfUrl };
        }
      });
    }

    setJobs(afterQueue);
    jobsRef.current = afterQueue;

    if (afterQueue.some((j) => j.status === "error")) {
      setPhase("error");
      setOverallError(t("wizard.preview.exportZip.someError"));
      return;
    }

    // Check if all already done (all were cache hits)
    if (afterQueue.every((j) => j.status === "done")) {
      void bundleAndFinish(afterQueue);
      return;
    }

    setPhase("polling");
  }, [ebooks, projectId, t, bundleAndFinish]);

  // Polling: runs every 3s while phase === 'polling', reads from jobsRef to avoid stale closures
  useEffect(() => {
    if (phase !== "polling") return;

    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;

      const current = jobsRef.current;
      const pending = current.filter(
        (j) => j.jobId && (j.status === "processing" || j.status === "queued"),
      );
      if (pending.length === 0) return;

      const results = await Promise.allSettled(
        pending.map((j) => checkPdfStatus(j.jobId!)),
      );

      if (cancelled) return;

      const updated = current.map((job) => {
        const pi = pending.findIndex((p) => p.jobId === job.jobId);
        if (pi === -1) return job;
        const r = results[pi]!;
        if (r.status === "rejected") {
          return { ...job, status: "error" as const, errorMsg: getErrorMessage(r.reason) };
        }
        const pollJob = r.value;
        if (pollJob.status === "completed") {
          return { ...job, status: "done" as const, pdfUrl: pollJob.pdfUrl };
        }
        if (pollJob.status === "failed") {
          return {
            ...job,
            status: "error" as const,
            errorMsg: pollJob.errorMessage ?? t("wizard.preview.exportZip.someError"),
          };
        }
        return { ...job, status: "processing" as const };
      });

      jobsRef.current = updated;
      setJobs(updated);

      if (cancelled) return;

      // Check for terminal state
      const allTerminal = updated.every((j) => j.status === "done" || j.status === "error");
      if (!allTerminal) return;

      clearInterval(intervalId);

      if (updated.some((j) => j.status === "error")) {
        setPhase("error");
        setOverallError(t("wizard.preview.exportZip.someError"));
      } else {
        void bundleAndFinish(updated);
      }
    };

    // Run immediately then on interval
    void poll();
    const intervalId = setInterval(() => void poll(), 3000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [phase, t, bundleAndFinish]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when modal closes; start export when it opens
  useEffect(() => {
    if (isOpen) {
      void startExport();
    } else {
      setPhase("idle");
      setJobs([]);
      jobsRef.current = [];
      setDownloadHref(null);
      setOverallError(null);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = useCallback(() => {
    if (!downloadHref) return;
    const a = document.createElement("a");
    a.href = downloadHref;
    a.download = downloadFilename;
    a.click();
    onOpenChange(false);
  }, [downloadHref, downloadFilename, onOpenChange]);

  const handleRetry = useCallback(() => {
    void startExport();
  }, [startExport]);

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const isRunning = phase === "queueing" || phase === "polling" || phase === "bundling";

  const statusMessage = (() => {
    if (phase === "bundling") return t("wizard.preview.exportZip.bundlingMsg");
    if (phase === "polling" || phase === "queueing") return t("wizard.preview.exportZip.processingMsg");
    if (phase === "done") return t("wizard.preview.exportZip.allDone");
    if (phase === "error") return overallError ?? t("wizard.preview.exportZip.someError");
    return null;
  })();

  return (
    <Modal open={isOpen} onClose={isRunning ? undefined : handleClose} closeLabel={t("common.close")}>
      <ModalHead>
        <ModalTitle>{t("wizard.preview.exportZip.title")}</ModalTitle>
      </ModalHead>

      <ModalContent className="space-y-4">
        {jobs.length > 0 ? (
          <ul className="space-y-2">
            {jobs.map((job) => (
              <li
                key={job.ebookId}
                className="flex items-center gap-3 rounded-md border border-obra-blue-100 px-3 py-2"
              >
                <span className="shrink-0">
                  {job.status === "queued" ? (
                    <Clock className="size-4 text-obra-neutral-400" aria-hidden />
                  ) : job.status === "processing" ? (
                    <Loader2 className="size-4 animate-spin text-obra-blue-700" aria-hidden />
                  ) : job.status === "done" ? (
                    <CheckCircle2 className="size-4 text-obra-green-400" aria-hidden />
                  ) : (
                    <AlertCircle className="size-4 text-red-500" aria-hidden />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-body text-sm text-obra-blue-950">
                    {job.label}
                  </span>
                  {job.status === "error" && job.errorMsg ? (
                    <span className="block truncate text-xs text-red-500">{job.errorMsg}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {statusMessage ? (
          <p
            className={`text-center font-body text-sm ${
              phase === "error"
                ? "text-red-500"
                : phase === "done"
                ? "font-medium text-obra-blue-950"
                : "text-obra-neutral-600"
            }`}
          >
            {statusMessage}
          </p>
        ) : null}

        {phase === "bundling" ? (
          <div className="flex justify-center">
            <Loader2 className="size-6 animate-spin text-obra-green-400" aria-hidden />
          </div>
        ) : null}
      </ModalContent>

      <ModalFooter>
        {phase === "done" ? (
          <>
            <Button type="button" variant="primary" onClick={handleDownload} className="flex-1 gap-2">
              <DownloadCloud className="size-4" aria-hidden />
              {t("wizard.preview.exportZip.downloadCta")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              {t("common.close")}
            </Button>
          </>
        ) : phase === "error" ? (
          <>
            <Button type="button" variant="primary" onClick={handleRetry} className="flex-1">
              {t("wizard.preview.exportZip.retryCta")}
            </Button>
            <Button type="button" variant="secondary" onClick={handleClose} className="flex-1">
              {t("common.close")}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={isRunning}
            className="w-full"
          >
            {t("common.close")}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
