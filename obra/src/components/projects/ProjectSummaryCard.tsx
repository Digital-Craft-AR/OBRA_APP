import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { ObraBadge } from "@/components/obra/ObraBadge";
import { formatProjectUpdatedRelative } from "@/lib/projectRelativeTime";
import {
  resolveProjectEditorPath,
  resolveProjectStatusLabelKey,
  type ProjectContentProgressPhase,
} from "@/lib/projectDashboard";
import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";
import { contentCardClass } from "@/lib/uiClasses";

export type ProjectSummaryCardModel = {
  id: string;
  name: string;
  main_title: string | null;
  updated_at: string;
  design_config: WizardDesignConfig;
  bonus_count: number;
  bump_count: number;
  structure_completed_at: string | null;
  content_phase: ProjectContentProgressPhase | null;
};

const statusVariant = {
  "projects.status.structure": "draft",
  "projects.status.content": "warning",
  "projects.status.done": "published",
} as const;

export function ProjectSummaryCard({ project, t }: { project: ProjectSummaryCardModel; t: TFunction }) {
  const statusKey = resolveProjectStatusLabelKey(project.structure_completed_at, project.content_phase);
  const variant = statusVariant[statusKey];
  const href = resolveProjectEditorPath(project.id, project.structure_completed_at, project.content_phase);
  const title = project.main_title?.trim() || project.name;
  const { primary, secondary, accent } = project.design_config.palette;

  return (
    <Link
      to={href}
      className={`${contentCardClass} flex h-full flex-col gap-3 p-4 no-underline transition-shadow hover:shadow-md`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-body text-xs text-obra-neutral-600">{formatProjectUpdatedRelative(project.updated_at, t)}</p>
        <ObraBadge variant={variant}>{t(statusKey)}</ObraBadge>
      </div>
      <h2 className="font-display text-lg font-semibold leading-snug text-obra-blue-950">{title}</h2>
      <div className="flex items-center gap-1.5" aria-label={t("projects.card.paletteAria")}>
        <span className="size-6 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: primary }} />
        <span className="size-6 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: secondary }} />
        <span className="size-6 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: accent }} />
      </div>
      <p className="mt-auto font-body text-xs text-obra-neutral-600">
        {t("projects.card.packageMeta", { bonus: project.bonus_count, bump: project.bump_count })}
      </p>
    </Link>
  );
}
