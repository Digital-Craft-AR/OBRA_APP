import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
import type { WizardDesignConfig, WizardTitleItem } from "@/lib/wizard/structureTypes";

export type WizardDesignPersistPayload = {
  designConfig: WizardDesignConfig;
  bookTemplateId: string;
  layoutPageAssignments: Record<string, string>;
};

export async function saveWizardTopic(projectId: string, topic: string) {
  const { error } = await supabase.from("projects").update({ topic }).eq("id", projectId);
  return { ok: !error };
}

export async function saveWizardAvatarProblem(
  projectId: string,
  avatar: string,
  problem: string,
  designConfig: WizardDesignConfig,
) {
  const { error } = await supabase
    .from("projects")
    .update({
      target_avatar: avatar || null,
      problem: problem || null,
      design_config: designConfig,
    })
    .eq("id", projectId);
  return { ok: !error };
}

type ResetAvatarProblemResponse = {
  ok?: boolean;
  reset?: boolean;
  current_phase?: string;
  error?: string;
};

export async function resetWizardAvatarProblemAndContent(projectId: string, avatar: string, problem: string) {
  const { data, error } = await supabase.functions.invoke<ResetAvatarProblemResponse>(
    "reset-avatar-problem-content",
    {
      body: {
        project_id: projectId,
        target_avatar: avatar,
        problem,
      },
    },
  );

  if (error) {
    const code = await getFunctionsInvokeErrorCode(error);
    return { ok: false, code: code ?? "invoke_failed" };
  }
  if (!data?.ok) return { ok: false, code: data?.error ?? "reset_failed" };
  return {
    ok: true,
    currentPhase: data.current_phase ?? null,
    reset: Boolean(data.reset),
  };
}

export async function saveWizardPackageCounts(projectId: string, bonusCount: number, bumpCount: number) {
  const { error } = await supabase
    .from("projects")
    .update({
      bonus_count: bonusCount,
      bump_count: bumpCount,
    })
    .eq("id", projectId);
  return { ok: !error };
}

export async function saveWizardMainTitle(projectId: string, mainTitle: string, author: string) {
  const { error } = await supabase
    .from("projects")
    .update({
      main_title: mainTitle,
      author: author || null,
    })
    .eq("id", projectId);
  return { ok: !error };
}

export async function saveWizardBonusBumpItems(
  projectId: string,
  bonusItems: WizardTitleItem[],
  bumpItems: WizardTitleItem[],
) {
  const { error } = await supabase
    .from("projects")
    .update({
      bonus_items: bonusItems,
      bump_items: bumpItems,
    })
    .eq("id", projectId);
  return { ok: !error };
}

export type SaveWizardDesignConfigResult =
  | { ok: true; persisted: "full" | "design_and_template" | "design_only" }
  | { ok: false };

/**
 * PostgREST / Postgres errors when the remote schema is behind (columns not migrated yet).
 */
export function isLikelyMissingProjectsColumnError(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const m = (error.message ?? "").toLowerCase();
  const code = error.code ?? "";
  if (code === "PGRST204") return true;
  if (m.includes("schema cache")) return true;
  if (m.includes("column") && m.includes("does not exist")) return true;
  if (m.includes("could not find") && m.includes("column")) return true;
  return false;
}

/**
 * Persists design step fields. Retries with a smaller payload when the DB is missing
 * `layout_page_assignments` and/or `book_template_id` (migrations not applied on the project yet).
 */
export async function saveWizardDesignConfig(
  projectId: string,
  payload: WizardDesignPersistPayload,
): Promise<SaveWizardDesignConfigResult> {
  const full = await supabase
    .from("projects")
    .update({
      design_config: payload.designConfig,
      book_template_id: payload.bookTemplateId,
      layout_page_assignments: payload.layoutPageAssignments,
    })
    .eq("id", projectId);

  if (!full.error) return { ok: true, persisted: "full" };

  if (!isLikelyMissingProjectsColumnError(full.error)) return { ok: false };

  const withoutLayouts = await supabase
    .from("projects")
    .update({
      design_config: payload.designConfig,
      book_template_id: payload.bookTemplateId,
    })
    .eq("id", projectId);

  if (!withoutLayouts.error) return { ok: true, persisted: "design_and_template" };

  if (!isLikelyMissingProjectsColumnError(withoutLayouts.error)) return { ok: false };

  const designOnly = await supabase
    .from("projects")
    .update({
      design_config: payload.designConfig,
    })
    .eq("id", projectId);

  if (!designOnly.error) return { ok: true, persisted: "design_only" };
  return { ok: false };
}

export async function markStructureCompleted(projectId: string) {
  const { error } = await supabase
    .from("projects")
    .update({ structure_completed_at: new Date().toISOString() })
    .eq("id", projectId);
  return { ok: !error };
}
