import { supabase } from "@/lib/supabaseClient";
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
