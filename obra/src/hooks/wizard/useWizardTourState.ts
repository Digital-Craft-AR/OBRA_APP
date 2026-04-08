import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export function useWizardTourState(userId: string | undefined) {
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTourState() {
      if (!userId) return;
      const { data, error } = await supabase
        .from("creator_profiles")
        .select("tour_dismissed_at")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled || error) return;
      const dismissedAt = (data as { tour_dismissed_at?: string | null } | null)?.tour_dismissed_at;
      setTourOpen(!dismissedAt);
    }

    void loadTourState();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function dismissTour() {
    setTourOpen(false);
    if (!userId) return;
    await supabase
      .from("creator_profiles")
      .update({ tour_dismissed_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return {
    tourOpen,
    tourStep,
    setTourStep,
    dismissTour,
  };
}
