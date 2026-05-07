import type { ContentLocale } from "@/lib/projects";

export function duplicateProjectNameSuffix(contentLocale: ContentLocale | string): string {
  if (contentLocale === "pt-BR") return " - Cópia";
  if (contentLocale === "en-US" || contentLocale === "en-GB") return " - Copy";
  return " - Copia";
}

export function duplicateProjectName(name: string, contentLocale: ContentLocale | string): string {
  return `${name}${duplicateProjectNameSuffix(contentLocale)}`;
}
