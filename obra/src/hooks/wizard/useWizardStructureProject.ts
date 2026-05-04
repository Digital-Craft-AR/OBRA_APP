import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  DEFAULT_DESIGN_CONFIG,
  normalizeDesignConfig,
  type BaseProjectRow,
  type ProjectRow,
  type WizardTitleItem,
} from "@/lib/wizard/structureTypes";

export function useWizardStructureProject(projectId: string | undefined, loadErrorMessage: string) {
  const [project, setProject] = useState<ProjectRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadProject() {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      // Avoid showing the previous project's row while the new id is loading (SPA navigations).
      setProject(null);

      const { data, error: queryError } = await supabase
        .from("projects")
        .select(
          "id, name, content_locale, content_source, topic, problem, target_avatar, bonus_count, bump_count, main_title, author, bonus_items, bump_items, design_config, structure_completed_at, lifecycle_status",
        )
        .eq("id", projectId)
        .single();

      let row: ProjectRow | null = null;
      let loadError = queryError;

      if (!loadError && data) {
        row = data as ProjectRow;
      } else {
        // Fallback for environments where the latest columns are not migrated yet.
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("projects")
          .select("id, name, content_locale, content_source, topic, problem, target_avatar, structure_completed_at")
          .eq("id", projectId)
          .single();

        if (!fallbackError && fallbackData) {
          const base = fallbackData as BaseProjectRow;
          row = {
            ...base,
            bonus_count: 0,
            bump_count: 0,
            main_title: null,
            author: null,
            bonus_items: [],
            bump_items: [],
            design_config: DEFAULT_DESIGN_CONFIG,
            lifecycle_status: "active",
          };
          loadError = null;
        } else {
          loadError = fallbackError;
        }
      }

      if (cancelled) return;

      if (loadError || !row) {
        setError(loadErrorMessage);
        setProject(null);
      } else {
        const normalizedRow: ProjectRow = {
          ...row,
          bonus_items: Array.isArray(row.bonus_items)
            ? (row.bonus_items as WizardTitleItem[])
            : [],
          bump_items: Array.isArray(row.bump_items)
            ? (row.bump_items as WizardTitleItem[])
            : [],
          design_config: normalizeDesignConfig(row.design_config ?? DEFAULT_DESIGN_CONFIG),
        };
        setProject(normalizedRow);
      }

      setLoading(false);
    }

    void loadProject();
    return () => {
      cancelled = true;
    };
  }, [projectId, loadErrorMessage]);

  return {
    project,
    setProject,
    loading,
    error,
  };
}
