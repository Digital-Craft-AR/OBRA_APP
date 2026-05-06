import { useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { Link } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { ObraBadge } from "@/components/obra/ObraBadge";
import { Button } from "@/components/ui/Button";
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
  lifecycle_status: "active" | "archived" | "trash";
};

export type ProjectCardActions = {
  onRename: (id: string, currentName: string) => void;
  onArchive: (id: string) => void;
  onMoveToTrash: (id: string) => void;
  onRecover?: (id: string) => void;
  onDuplicate?: (id: string) => void;
};

const statusVariant = {
  "projects.status.structure": "draft",
  "projects.status.content": "warning",
  "projects.status.done": "published",
} as const;

function CardMenu({ id, name, t, actions }: { id: string; name: string; t: TFunction; actions: ProjectCardActions }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <Button
        type="button"
        variant="tertiary"
        size="icon"
        aria-label={t("projects.card.menuAria")}
        aria-expanded={open}
        data-testid={`project-card-menu-${id}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        <MoreHorizontal className="size-4" aria-hidden />
      </Button>

      {open ? (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[160px] rounded-card border border-obra-neutral-200 bg-white py-1 shadow-md">
          <button
            type="button"
            data-testid={`project-card-rename-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              actions.onRename(id, name);
            }}
            className="flex w-full items-center px-4 py-2 text-left text-sm text-obra-blue-950 hover:bg-obra-blue-50"
          >
            {t("projects.card.rename")}
          </button>
          {actions.onDuplicate ? (
            <button
              type="button"
              data-testid={`project-card-duplicate-${id}`}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                actions.onDuplicate!(id);
              }}
              className="flex w-full items-center px-4 py-2 text-left text-sm text-obra-blue-950 hover:bg-obra-blue-50"
            >
              {t("projects.duplicate.menuLabel")}
            </button>
          ) : null}
          <button
            type="button"
            data-testid={`project-card-archive-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              actions.onArchive(id);
            }}
            className="flex w-full items-center px-4 py-2 text-left text-sm text-obra-blue-950 hover:bg-obra-blue-50"
          >
            {t("projects.card.archive")}
          </button>
          <div className="my-1 border-t border-obra-blue-50" />
          <button
            type="button"
            data-testid={`project-card-trash-${id}`}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              actions.onMoveToTrash(id);
            }}
            className="flex w-full items-center px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            {t("projects.card.moveToTrash")}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function ProjectSummaryCard({
  project,
  t,
  actions,
}: {
  project: ProjectSummaryCardModel;
  t: TFunction;
  actions?: ProjectCardActions;
}) {
  const isReadOnly = project.lifecycle_status === "archived" || project.lifecycle_status === "trash";
  const statusKey = resolveProjectStatusLabelKey(project.structure_completed_at, project.content_phase);
  const variant = statusVariant[statusKey];
  const href = resolveProjectEditorPath(project.id, project.structure_completed_at, project.content_phase);
  const ebookTitle = project.main_title?.trim() || null;
  const { primary, secondary, accent } = project.design_config.palette;

  const lifecycleBannerKey =
    project.lifecycle_status === "archived"
      ? "projects.card.banner.archived"
      : project.lifecycle_status === "trash"
        ? "projects.card.banner.trash"
        : null;

  const cardBody = (
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-lg font-semibold leading-snug text-obra-blue-950">{project.name}</h2>
      {ebookTitle ? (
        <p className="font-body text-xs text-obra-neutral-500">
          <span className="font-semibold">{t("projects.card.ebookTitleLabel")}</span>{" "}
          {ebookTitle}
        </p>
      ) : null}
    </div>
  );

  const cardFooter = (
    <div className="mt-auto flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5" aria-label={t("projects.card.paletteAria")}>
        <span className="size-3.5 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: primary }} />
        <span className="size-3.5 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: secondary }} />
        <span className="size-3.5 rounded-full border border-obra-blue-100 shadow-sm" style={{ backgroundColor: accent }} />
      </div>
      <p className="font-body text-xs text-obra-neutral-600">
        {t("projects.card.packageMeta", { bonus: project.bonus_count, bump: project.bump_count })}
      </p>
    </div>
  );

  return (
    <div className={`${contentCardClass} flex h-full flex-col`} data-testid={`project-card-${project.id}`}>
      <div className="flex items-center gap-2">
        <p className="flex-1 font-body text-xs text-obra-neutral-600">{formatProjectUpdatedRelative(project.updated_at, t)}</p>
        {isReadOnly ? null : <ObraBadge variant={variant}>{t(statusKey)}</ObraBadge>}
        {isReadOnly && actions?.onRecover ? (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              actions.onRecover!(project.id);
            }}
          >
            {t("projects.card.recover")}
          </Button>
        ) : null}
        {!isReadOnly && actions ? (
          <CardMenu id={project.id} name={project.name} t={t} actions={actions} />
        ) : null}
      </div>

      {lifecycleBannerKey ? (
        <p className="mt-1.5 rounded-md bg-obra-blue-50 px-2.5 py-1 font-body text-xs font-medium text-obra-blue-700">
          {t(lifecycleBannerKey)}
        </p>
      ) : null}

      {isReadOnly ? (
        <div className="flex flex-1 flex-col gap-3 pt-2 opacity-70">
          {cardBody}
          {cardFooter}
        </div>
      ) : (
        <Link
          to={href}
          className="flex flex-1 flex-col gap-3 pt-2 no-underline"
        >
          {cardBody}
          {cardFooter}
        </Link>
      )}
    </div>
  );
}
