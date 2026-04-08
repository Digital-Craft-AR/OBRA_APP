export type ProjectRow = {
  id: string;
  name: string;
  content_locale: string;
  content_source: "ai" | "upload";
  topic: string | null;
  problem: string | null;
  target_avatar: string | null;
  bonus_count: number;
  bump_count: number;
  main_title: string | null;
  author: string | null;
  structure_completed_at: string | null;
};

export type BaseProjectRow = Omit<ProjectRow, "bonus_count" | "bump_count" | "main_title" | "author">;

export const INNER_STEPS = [
  "wizard.structure.inner.topic",
  "wizard.structure.inner.avatarProblem",
  "wizard.structure.inner.package",
  "wizard.structure.inner.design",
] as const;

export const FALLBACK_MAIN_TITLE_SUGGESTIONS = [
  "La guía definitiva de velas aromáticas: de cero a negocio",
  "Velas artesanales que venden: sistema paso a paso",
  "De hobbysta a emprendedora: crea tu marca de velas",
  "El método de las velas: ingresos desde casa",
  "Velas con alma: la guía para emprendedoras creativas",
] as const;
