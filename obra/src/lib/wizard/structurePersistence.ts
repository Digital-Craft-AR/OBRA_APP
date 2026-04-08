import { supabase } from "@/lib/supabaseClient";

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
