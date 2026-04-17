import { useCallback, useEffect, useState } from "react";
import type { TFunction } from "i18next";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ObraAlert } from "@/components/obra/ObraAlert";
import {
  invokeAiSplitProposal,
  type SplitProposalChapter,
} from "@/lib/wizard/splitProposalApi";

type Stage = "idle" | "generating" | "review" | "error";

type Props = {
  t: TFunction;
  projectId: string;
  /** Called with the user-approved chapter list. Parent handles approve-alignment + state refresh. */
  onApprove: (chapters: SplitProposalChapter[]) => Promise<void>;
  /** True while the parent is calling approve-alignment. Disables the approve button. */
  approvalBusy: boolean;
  /** If true, skip the idle stage and start generating immediately on mount. */
  autoStart?: boolean;
};

function mapErrorCode(code: string | null): string {
  if (!code) return "wizard.content.splitProposal.errorGeneric";
  // getFunctionsInvokeErrorCode may return "main:detail" — check with startsWith
  if (code.startsWith("manuscript_not_found") || code.startsWith("empty_manuscript"))
    return "wizard.content.splitProposal.errorManuscript";
  if (code.startsWith("wrong_phase"))
    return "wizard.content.splitProposal.errorWrongPhase";
  if (
    code.startsWith("anthropic_not_configured") ||
    code.startsWith("anthropic_http_error") ||
    code.startsWith("anthropic_empty_response") ||
    code.startsWith("invoke_failed")
  )
    return "wizard.content.splitProposal.errorGeneric";
  return "wizard.content.splitProposal.errorGeneric";
}

export function ContentUploadAlignmentPanel({ t, projectId, onApprove, approvalBusy, autoStart }: Props) {
  const [stage, setStage] = useState<Stage>("idle");
  const [chapters, setChapters] = useState<SplitProposalChapter[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [showTitleError, setShowTitleError] = useState(false);

  const handleGenerate = useCallback(async () => {
    setStage("generating");
    setErrorCode(null);
    setShowTitleError(false);

    const res = await invokeAiSplitProposal(projectId);

    if (!res.ok) {
      setErrorCode(res.code);
      setStage("error");
      return;
    }

    setChapters(res.chapters);
    setWarnings(res.warnings);
    setStage("review");
  }, [projectId]);

  const handleTitleChange = useCallback((order: number, value: string) => {
    setChapters((prev) =>
      prev.map((c) => (c.order === order ? { ...c, title: value } : c)),
    );
  }, []);

  const handleApprove = useCallback(async () => {
    const hasEmpty = chapters.some((c) => !c.title.trim());
    if (hasEmpty) {
      setShowTitleError(true);
      return;
    }
    setShowTitleError(false);
    await onApprove(chapters);
  }, [chapters, onApprove]);

  const handleRegenerate = useCallback(() => {
    setChapters([]);
    setWarnings([]);
    setErrorCode(null);
    setShowTitleError(false);
    setStage("idle");
  }, []);

  useEffect(() => {
    if (autoStart) {
      void handleGenerate();
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-card border border-obra-neutral-200 bg-white px-4 py-6">
      {/* ── Idle — oculto; autoStart dispara la generación automáticamente al montar ── */}
      {/* {stage === "idle" && (
        <div className="flex flex-col gap-4">
          <header className="space-y-1">
            <h2 className="font-display text-xl text-obra-blue-950">
              {t("wizard.content.splitProposal.title")}
            </h2>
            <p className="font-body text-sm text-obra-neutral-600">
              {t("wizard.content.splitProposal.subtitle")}
            </p>
          </header>
          <div>
            <Button type="button" variant="primary" onClick={() => void handleGenerate()}>
              <Sparkles className="size-4" aria-hidden />
              {t("wizard.content.splitProposal.generateCta")}
            </Button>
          </div>
        </div>
      )} */}

      {/* ── Generating ── */}
      {stage === "generating" && (
        <div className="flex flex-col items-center gap-4 py-8" aria-live="polite">
          <Loader2 className="size-10 animate-spin text-obra-blue-700" aria-hidden />
          <p className="font-body text-sm text-obra-neutral-600">
            {t("wizard.content.splitProposal.generating")}
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {stage === "error" && (
        <div className="flex flex-col gap-4">
          <header className="space-y-1">
            <h2 className="font-display text-xl text-obra-blue-950">
              {t("wizard.content.splitProposal.title")}
            </h2>
          </header>
          <ObraAlert
            variant="error"
            title={t("wizard.content.splitProposal.errorTitle")}
            description={
              <>
                {t(mapErrorCode(errorCode))}
                {import.meta.env.DEV && errorCode ? (
                  <span className="mt-1 block font-mono text-xs text-red-400">[dev] code: {errorCode}</span>
                ) : null}
              </>
            }
          />
          <div>
            <Button type="button" variant="secondary" onClick={() => void handleGenerate()}>
              {t("wizard.content.splitProposal.retryCta")}
            </Button>
          </div>
        </div>
      )}

      {/* ── Review ── */}
      {stage === "review" && (
        <div className="flex flex-col gap-5">
          <header className="space-y-1">
            <h2 className="font-display text-xl text-obra-blue-950">
              {t("wizard.content.splitProposal.reviewTitle")}
            </h2>
            <p className="font-body text-sm text-obra-neutral-600">
              {t("wizard.content.splitProposal.reviewSubtitle", { count: chapters.length })}
            </p>
          </header>

          {warnings.length > 0 && (
            <ObraAlert
              variant="warning"
              title={t("wizard.content.splitProposal.warningsTitle")}
              description={
                <ul className="mt-1 list-inside list-disc space-y-0.5">
                  {warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              }
            />
          )}

          {showTitleError && (
            <ObraAlert variant="error" title={t("wizard.content.splitProposal.errorEmptyTitle")} />
          )}

          <ol
            className="space-y-3"
            aria-label={t("wizard.content.splitProposal.chaptersAria")}
          >
            {chapters.map((ch) => {
              const isEmpty = showTitleError && !ch.title.trim();
              const truncatedHeading =
                ch.start_heading.length > 60
                  ? ch.start_heading.slice(0, 60) + "…"
                  : ch.start_heading;

              return (
                <li key={ch.order} className="flex items-start gap-3">
                  <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-obra-blue-100 font-body text-xs font-semibold text-obra-blue-700">
                    {ch.order}
                  </span>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input
                      type="text"
                      value={ch.title}
                      onChange={(e) => handleTitleChange(ch.order, e.target.value)}
                      disabled={approvalBusy}
                      aria-label={t("wizard.content.splitProposal.chapterTitleLabel", {
                        n: ch.order,
                      })}
                      className={[
                        "w-full rounded-md border px-3 py-1.5 font-body text-sm text-obra-blue-950 outline-none transition-colors",
                        "focus:ring-2 focus:ring-obra-blue-700 focus:ring-offset-1",
                        "disabled:opacity-50",
                        isEmpty
                          ? "border-red-400 bg-red-50"
                          : "border-obra-blue-100 bg-white hover:border-obra-blue-300",
                      ].join(" ")}
                    />
                    <p className="truncate font-body text-xs text-obra-neutral-600">
                      <span className="font-medium">
                        {t("wizard.content.splitProposal.markerLabel")}
                      </span>{" "}
                      {truncatedHeading}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              type="button"
              variant="primary"
              disabled={approvalBusy}
              onClick={() => void handleApprove()}
            >
              {approvalBusy
                ? t("wizard.content.splitProposal.approveLoading")
                : t("wizard.content.splitProposal.approveCta")}
            </Button>
            <Button
              type="button"
              variant="tertiary"
              disabled={approvalBusy}
              onClick={handleRegenerate}
            >
              {t("wizard.content.splitProposal.regenerateCta")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
