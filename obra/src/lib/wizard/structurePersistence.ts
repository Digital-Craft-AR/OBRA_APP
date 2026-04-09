import { supabase } from "@/lib/supabaseClient";
import { getFunctionsInvokeErrorCode } from "@/lib/functionsInvokeErrors";
import type { WizardDesignConfig, WizardTitleItem } from "@/lib/wizard/structureTypes";

export async function saveWizardTopic(projectId: string, topic: string) {
  const { error } = await supabase.from("projects").update({ topic }).eq("id", projectId);
  return { ok: !error };
}

export async function saveWizardAvatarProblem(projectId: string, avatar: string, problem: string) {
  const { error } = await supabase
    .from("projects")
    .update({
      target_avatar: avatar || null,
      problem: problem || null,
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

export async function saveWizardDesignConfig(projectId: string, designConfig: WizardDesignConfig) {
  const { error } = await supabase
    .from("projects")
    .update({
      design_config: designConfig,
    })
    .eq("id", projectId);
  return { ok: !error };
}

export async function markStructureCompleted(projectId: string) {
  const { error } = await supabase
    .from("projects")
    .update({ structure_completed_at: new Date().toISOString() })
    .eq("id", projectId);
  return { ok: !error };
}
