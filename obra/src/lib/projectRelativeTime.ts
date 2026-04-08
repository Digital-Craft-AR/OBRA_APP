import type { TFunction } from "i18next";

/** Relative "updated" label from an ISO timestamp to `now` (hours / yesterday / days). */
export function formatProjectUpdatedRelative(iso: string, t: TFunction, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return t("projects.relative.unknown");
  }

  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startThat = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayDiff = Math.round((startToday.getTime() - startThat.getTime()) / 86_400_000);

  if (dayDiff < 0) {
    return t("projects.relative.justNow");
  }

  if (dayDiff === 0) {
    const diffMs = now.getTime() - d.getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    if (hours < 1) {
      return t("projects.relative.lessThanHour");
    }
    if (hours === 1) {
      return t("projects.relative.oneHour");
    }
    return t("projects.relative.hours", { count: hours });
  }

  if (dayDiff === 1) {
    return t("projects.relative.yesterday");
  }

  return t("projects.relative.days", { count: dayDiff });
}
