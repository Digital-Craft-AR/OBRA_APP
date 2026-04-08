import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  ContentIndexMilestone,
  type ContentNavItem,
} from "@/components/wizard/content/ContentIndexMilestone";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import {
  buildContentPackageNavTargets,
  contentNavTargetToKey,
  parseContentNavKey,
} from "@/lib/wizard/contentNav";
import {
  confirmMainIndex,
  ensureContentWorkspace,
  invokeGenerateIndex,
  loadMainEbookChapters,
  replaceMainEbookDraftChapters,
  upsertMainEbookDraftChaptersFromRows,
  validateMainTocForConfirm,
} from "@/lib/wizard/contentIndexApi";
import type { TocChapterRow } from "@/lib/wizard/tocTypes";

const BANNER_STORAGE_PREFIX = "obra.content.banner.dismissed.";

function newRowId() {
  return globalThis.crypto?.randomUUID?.() ?? `row-${Math.random().toString(36).slice(2, 11)}`;
}

function defaultMainRows(): TocChapterRow[] {
  return [
    { id: newRowId(), title: "" },
    { id: newRowId(), title: "" },
  ];
}

function defaultSingleRows(): TocChapterRow[] {
  return [{ id: newRowId(), title: "" }];
}

export function WizardContentPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const params = useParams<{ projectId: string }>();

  const { project, loading, error } = useWizardStructureProject(
    params.projectId,
    t("wizard.structure.loadError"),
  );

  const [selectedKey, setSelectedKey] = useState("main");
  const [bonusBumpToc, setBonusBumpToc] = useState<Record<string, TocChapterRow[]>>({});
  const [mainTocRows, setMainTocRows] = useState<TocChapterRow[]>([]);
  const [mainEbookId, setMainEbookId] = useState<string | null>(null);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const [mainIndexFrozenAt, setMainIndexFrozenAt] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [actionAnnouncement, setActionAnnouncement] = useState<string | null>(null);
  const [workspaceReady, setWorkspaceReady] = useState(false);

  useEffect(() => {
    if (!params.projectId) return;
    try {
      setBannerDismissed(localStorage.getItem(`${BANNER_STORAGE_PREFIX}${params.projectId}`) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    if (!params.projectId || loading) return;
    if (!project) return;
    if (project.structure_completed_at) return;
    navigate(`/app/projects/${params.projectId}/wizard`, { replace: true });
  }, [loading, project, params.projectId, navigate]);

  useEffect(() => {
    if (!project?.id || loading) return;
    let cancelled = false;
    setWorkspaceError(null);
    setWorkspaceReady(false);

    void (async () => {
      const ensured = await ensureContentWorkspace(project.id);
      if (cancelled) return;
      if (!ensured.ok) {
        setWorkspaceError(t("wizard.content.workspace.ensureError"));
        return;
      }
      setMainEbookId(ensured.data.main_ebook_id);
      setCurrentPhase(ensured.data.current_phase);
      setMainIndexFrozenAt(ensured.data.main_index_frozen_at);

      const chapters = await loadMainEbookChapters(ensured.data.main_ebook_id);
      if (cancelled) return;
      if (chapters.ok && chapters.rows.length > 0) {
        setMainTocRows(chapters.rows);
      } else {
        setMainTocRows(defaultMainRows());
      }
      setWorkspaceReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [project?.id, loading, project?.structure_completed_at, t]);

  useEffect(() => {
    if (!project) return;
    const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
    setBonusBumpToc((prev) => {
      const next = { ...prev };
      for (const target of targets) {
        if (target.kind === "main") continue;
        const key = contentNavTargetToKey(target);
        if (!next[key]) next[key] = defaultSingleRows();
      }
      return next;
    });
  }, [project]);

  const needsUploadAlignment =
    project?.content_source === "upload" && currentPhase === "upload_alignment";

  const indexFrozen = Boolean(mainIndexFrozenAt);

  useEffect(() => {
    if (!indexFrozen && currentPhase === "main_index" && project?.content_source === "ai") {
      setSelectedKey("main");
    }
  }, [indexFrozen, currentPhase, project?.content_source]);

  const navItems: ContentNavItem[] = useMemo(() => {
    if (!project) return [];
    const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
    return targets.map((target) => {
      const key = contentNavTargetToKey(target);
      let label: string;
      if (target.kind === "main") {
        label = t("wizard.content.nav.mainEbook");
      } else if (target.kind === "bonus") {
        const title =
          project.bonus_items[target.index]?.title?.trim() ||
          t("wizard.content.nav.bonusFallback", { n: target.index + 1 });
        label = t("wizard.content.nav.bonus", { n: target.index + 1, title });
      } else {
        const title =
          project.bump_items[target.index]?.title?.trim() ||
          t("wizard.content.nav.bumpFallback", { n: target.index + 1 });
        label = t("wizard.content.nav.orderBump", { n: target.index + 1, title });
      }
      return { key, label, target };
    });
  }, [project, t]);

  const selectedTarget = parseContentNavKey(selectedKey) ?? { kind: "main" as const };

  const panelCopy = useMemo(() => {
    if (!project) {
      return { title: "", subtitle: "" };
    }
    if (needsUploadAlignment) {
      return {
        title: t("wizard.content.uploadGate.title"),
        subtitle: t("wizard.content.uploadGate.subtitle"),
      };
    }
    if (selectedTarget.kind === "main") {
      const mainTitle = project.main_title?.trim() || t("wizard.content.index.mainTitleFallback");
      return {
        title: t("wizard.content.index.panelTitleMain", { title: mainTitle }),
        subtitle: indexFrozen
          ? t("wizard.content.index.panelSubtitleMainFrozen")
          : t("wizard.content.index.panelSubtitleMain"),
      };
    }
    if (selectedTarget.kind === "bonus") {
      const title =
        project.bonus_items[selectedTarget.index]?.title?.trim() ||
        t("wizard.content.nav.bonusFallback", { n: selectedTarget.index + 1 });
      return {
        title: t("wizard.content.index.panelTitleBonus", { title }),
        subtitle: t("wizard.content.index.panelSubtitleBonus"),
      };
    }
    const title =
      project.bump_items[selectedTarget.index]?.title?.trim() ||
      t("wizard.content.nav.bumpFallback", { n: selectedTarget.index + 1 });
    return {
      title: t("wizard.content.index.panelTitleBump", { title }),
      subtitle: t("wizard.content.index.panelSubtitleBump"),
    };
  }, [project, selectedTarget, t, needsUploadAlignment, indexFrozen]);

  const currentTocRows: TocChapterRow[] =
    selectedTarget.kind === "main"
      ? mainTocRows
      : bonusBumpToc[selectedKey] ?? defaultSingleRows();

  const setCurrentToc = useCallback(
    (rows: TocChapterRow[]) => {
      if (selectedTarget.kind === "main") {
        setMainTocRows(rows);
        return;
      }
      setBonusBumpToc((prev) => ({ ...prev, [selectedKey]: rows }));
    },
    [selectedKey, selectedTarget.kind],
  );

  const navItemDisabled = useCallback(
    (key: string) => {
      if (needsUploadAlignment) return key !== "main";
      if (!indexFrozen && project?.content_source === "ai" && currentPhase === "main_index") {
        return key !== "main";
      }
      return false;
    },
    [needsUploadAlignment, indexFrozen, project?.content_source, currentPhase],
  );

  const handleRegenerateOutline = useCallback(async () => {
    if (selectedTarget.kind !== "main" || !project?.id || !mainEbookId) return;
    if (needsUploadAlignment || indexFrozen) return;
    setActionAnnouncement(null);
    const clientRequestId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}`;
    setGenerateLoading(true);
    const result = await invokeGenerateIndex(project.id, clientRequestId);
    setGenerateLoading(false);
    if (!result.ok) {
      const code = result.code;
      if (code === "insufficient_credits") {
        setActionAnnouncement(t("wizard.content.index.errorInsufficientCredits"));
      } else if (code === "wrong_content_source") {
        setActionAnnouncement(t("wizard.content.index.errorWrongSource"));
      } else {
        setActionAnnouncement(t("wizard.content.index.errorGenerateGeneric"));
      }
      return;
    }
    const saved = await replaceMainEbookDraftChapters(mainEbookId, result.titles);
    if (!saved.ok) {
      setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
      return;
    }
    const loaded = await loadMainEbookChapters(mainEbookId);
    if (loaded.ok) setMainTocRows(loaded.rows);
    setActionAnnouncement(t("wizard.content.index.regenerateSuccess"));
  }, [selectedTarget.kind, project?.id, mainEbookId, needsUploadAlignment, indexFrozen, t]);

  const handleRegenerateBonusBumpPlaceholder = useCallback(() => {
    if (selectedTarget.kind === "main") return;
    if (selectedTarget.kind === "bonus") {
      const title =
        project?.bonus_items[selectedTarget.index]?.title?.trim() ||
        t("wizard.content.nav.bonusFallback", { n: selectedTarget.index + 1 });
      setCurrentToc([{ id: newRowId(), title: t("wizard.content.index.singleSectionTitle", { title }) }]);
      return;
    }
    const title =
      project?.bump_items[selectedTarget.index]?.title?.trim() ||
      t("wizard.content.nav.bumpFallback", { n: selectedTarget.index + 1 });
    setCurrentToc([{ id: newRowId(), title: t("wizard.content.index.singleSectionTitle", { title }) }]);
  }, [selectedTarget, project, setCurrentToc, t]);

  const onRegenerateOutline =
    selectedTarget.kind === "main" ? handleRegenerateOutline : handleRegenerateBonusBumpPlaceholder;

  const handleConfirmIndex = useCallback(async () => {
    if (!project?.id || !mainEbookId) return;
    const validation = validateMainTocForConfirm(mainTocRows);
    if (validation !== "ok") {
      if (validation === "empty_title") setActionAnnouncement(t("wizard.content.index.errorEmptyTitle"));
      else if (validation === "too_many") setActionAnnouncement(t("wizard.content.index.errorTooManyChapters"));
      else setActionAnnouncement(t("wizard.content.index.errorTooFewChapters"));
      return;
    }
    setConfirmLoading(true);
    const persist = await upsertMainEbookDraftChaptersFromRows(mainEbookId, mainTocRows);
    if (!persist.ok) {
      setConfirmLoading(false);
      setActionAnnouncement(t("wizard.content.index.errorSaveToc"));
      return;
    }
    setMainTocRows(persist.rows);
    const confirmed = await confirmMainIndex(project.id);
    setConfirmLoading(false);
    if (!confirmed.ok) {
      setActionAnnouncement(t("wizard.content.index.errorConfirmPhase"));
      return;
    }
    setMainIndexFrozenAt(new Date().toISOString());
    setCurrentPhase("main_chapter");
    setActionAnnouncement(t("wizard.content.index.confirmSuccess"));
  }, [project?.id, mainEbookId, mainTocRows, t]);

  function dismissBanner() {
    if (!params.projectId) return;
    try {
      localStorage.setItem(`${BANNER_STORAGE_PREFIX}${params.projectId}`, "1");
    } catch {
      /* ignore */
    }
    setBannerDismissed(true);
  }

  const globalSteps = useMemo(
    () => [
      { id: 1, label: t("wizard.stepper.structure"), status: "completed" as const },
      { id: 2, label: t("wizard.stepper.content"), status: "active" as const },
      { id: 3, label: t("wizard.stepper.preview"), status: "upcoming" as const },
    ],
    [t],
  );

  const confirmVisible =
    selectedTarget.kind === "main" &&
    !needsUploadAlignment &&
    !indexFrozen &&
    currentPhase === "main_index" &&
    project?.content_source === "ai";

  const validation = validateMainTocForConfirm(mainTocRows);
  const confirmDisabled = validation !== "ok";

  const tocReadOnly =
    selectedTarget.kind === "main" && (needsUploadAlignment || indexFrozen || !workspaceReady);

  const regenerateDisabledMain =
    needsUploadAlignment ||
    indexFrozen ||
    !workspaceReady ||
    generateLoading ||
    project?.content_source !== "ai";

  if (!params.projectId) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <div className="bg-obra-blue-950 px-6 py-3">
        <button
          type="button"
          onClick={() => navigate("/app/dashboard")}
          className="flex items-center gap-1.5 text-xs text-white/80 hover:text-white"
        >
          <ChevronLeft className="size-3.5" aria-hidden />
          {t("wizard.structure.back")}
        </button>
      </div>

      <div className="border-b border-obra-blue-100 px-8 py-5">
        <WizardGlobalStepper steps={globalSteps} />
      </div>

      <div className="border-b border-obra-blue-100 px-8 py-3">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">
          {t("wizard.content.milestone.index")}
        </p>
      </div>

      <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-obra-blue-50">
        <div className="mx-auto w-full max-w-5xl px-8 py-8">
          {!bannerDismissed ? (
            <div
              role="region"
              aria-label={t("wizard.content.banner.regionAria")}
              className="mb-6 rounded-card border border-obra-blue-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="font-body text-sm text-obra-blue-950">{t("wizard.content.banner.body")}</p>
                <Button type="button" variant="tertiary" size="small" onClick={dismissBanner}>
                  {t("wizard.content.banner.dismiss")}
                </Button>
              </div>
            </div>
          ) : null}

          {loading ? <p className="text-sm text-obra-neutral-600">{t("common.loading")}</p> : null}
          {error ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {workspaceError ? (
            <p role="alert" className="rounded-card border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {workspaceError}
            </p>
          ) : null}

          {needsUploadAlignment && project ? (
            <div className="rounded-card border border-obra-blue-100 bg-white px-4 py-6 shadow-sm">
              <p className="font-body text-sm text-obra-blue-950">{t("wizard.content.uploadGate.body")}</p>
            </div>
          ) : null}

          {project && !loading && workspaceReady && !needsUploadAlignment ? (
            <ContentIndexMilestone
              t={t}
              navItems={navItems}
              selectedKey={selectedKey}
              onSelectKey={setSelectedKey}
              navItemDisabled={navItemDisabled}
              panelTitle={panelCopy.title}
              panelSubtitle={panelCopy.subtitle}
              tocRows={currentTocRows}
              onChangeToc={setCurrentToc}
              onRegenerateOutline={() => void onRegenerateOutline()}
              regenerateDisabled={selectedTarget.kind === "main" ? regenerateDisabledMain : false}
              regenerateLoading={selectedTarget.kind === "main" ? generateLoading : false}
              tocReadOnly={selectedTarget.kind === "main" ? tocReadOnly : false}
              confirmVisible={confirmVisible}
              onConfirmIndex={() => void handleConfirmIndex()}
              confirmDisabled={confirmDisabled}
              confirmLoading={confirmLoading}
              actionAnnouncement={actionAnnouncement}
            />
          ) : null}

        </div>
      </main>
    </div>
  );
}
