import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  ContentIndexMilestone,
  type ContentNavItem,
  type TocChapterRow,
} from "@/components/wizard/content/ContentIndexMilestone";
import { WizardGlobalStepper } from "@/components/wizard/WizardGlobalStepper";
import { useWizardStructureProject } from "@/hooks/wizard/useWizardStructureProject";
import {
  buildContentPackageNavTargets,
  contentNavTargetToKey,
  parseContentNavKey,
} from "@/lib/wizard/contentNav";

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
  const [tocByKey, setTocByKey] = useState<Record<string, TocChapterRow[]>>({});
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!params.projectId) return;
    try {
      setBannerDismissed(localStorage.getItem(`${BANNER_STORAGE_PREFIX}${params.projectId}`) === "1");
    } catch {
      setBannerDismissed(false);
    }
  }, [params.projectId]);

  useEffect(() => {
    if (!project) return;
    const targets = buildContentPackageNavTargets(project.bonus_count, project.bump_count);
    setTocByKey((prev) => {
      const next = { ...prev };
      for (const target of targets) {
        const key = contentNavTargetToKey(target);
        if (!next[key]) {
          next[key] = target.kind === "main" ? defaultMainRows() : defaultSingleRows();
        }
      }
      return next;
    });
  }, [project]);

  useEffect(() => {
    if (!params.projectId || loading) return;
    if (!project) return;
    if (project.structure_completed_at) return;
    navigate(`/app/projects/${params.projectId}/wizard`, { replace: true });
  }, [loading, project, params.projectId, navigate]);

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
    if (selectedTarget.kind === "main") {
      const mainTitle = project.main_title?.trim() || t("wizard.content.index.mainTitleFallback");
      return {
        title: t("wizard.content.index.panelTitleMain", { title: mainTitle }),
        subtitle: t("wizard.content.index.panelSubtitleMain"),
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
  }, [project, selectedTarget, t]);

  const currentToc = tocByKey[selectedKey] ?? (selectedTarget.kind === "main" ? defaultMainRows() : defaultSingleRows());

  const setCurrentToc = useCallback(
    (rows: TocChapterRow[]) => {
      setTocByKey((prev) => ({ ...prev, [selectedKey]: rows }));
    },
    [selectedKey],
  );

  const handleRegenerateOutline = useCallback(() => {
    if (selectedTarget.kind === "main") {
      setCurrentToc(
        [1, 2, 3].map((n) => ({
          id: newRowId(),
          title: t("wizard.content.index.sampleChapterTitle", { n }),
        })),
      );
      return;
    }
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
  }, [project, selectedTarget, setCurrentToc, t]);

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

          {project && !loading ? (
            <ContentIndexMilestone
              t={t}
              navItems={navItems}
              selectedKey={selectedKey}
              onSelectKey={setSelectedKey}
              panelTitle={panelCopy.title}
              panelSubtitle={panelCopy.subtitle}
              tocRows={currentToc}
              onChangeToc={setCurrentToc}
              onRegenerateOutline={handleRegenerateOutline}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
