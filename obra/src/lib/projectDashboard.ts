import type { TFunction } from "i18next";

export type ProjectLifecycleTab = "active" | "archived" | "trash";

export type ProjectContentProgressPhase =
  | "upload_alignment"
  | "main_index"
  | "main_chapter"
  | "bonus"
  | "order_bump"
  | "complete";

export function resolveProjectEditorPath(
  projectId: string,
  structureCompletedAt: string | null,
  contentPhase: ProjectContentProgressPhase | null,
): string {
  if (!structureCompletedAt) {
    return `/app/projects/${projectId}/wizard`;
  }
  if (contentPhase === "complete") {
    return `/app/projects/${projectId}/content`;
  }
  return `/app/projects/${projectId}/content`;
}

export function resolveProjectStatusLabelKey(
  structureCompletedAt: string | null,
  contentPhase: ProjectContentProgressPhase | null,
): "projects.status.structure" | "projects.status.content" | "projects.status.done" {
  if (!structureCompletedAt) {
    return "projects.status.structure";
  }
  if (contentPhase === "complete") {
    return "projects.status.done";
  }
  return "projects.status.content";
}

export function projectLifecycleTabLabel(tab: ProjectLifecycleTab, t: TFunction): string {
  switch (tab) {
    case "active":
      return t("projects.tabs.active");
    case "archived":
      return t("projects.tabs.archived");
    case "trash":
      return t("projects.tabs.trash");
    default:
      return tab;
  }
}
