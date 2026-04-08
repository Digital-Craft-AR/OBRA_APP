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
  bonus_items: WizardTitleItem[];
  bump_items: WizardTitleItem[];
  design_config: WizardDesignConfig;
  structure_completed_at: string | null;
};

export type BaseProjectRow = Omit<
  ProjectRow,
  "bonus_count" | "bump_count" | "main_title" | "author" | "bonus_items" | "bump_items" | "design_config"
>;

export type WizardTitleItem = {
  title: string;
  locked: boolean;
};

export type WizardDesignConfig = {
  preset: "starter" | "minimal" | "bold" | "custom";
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  page: {
    size: "a4" | "letter";
    orientation: "portrait" | "landscape";
  };
  image: {
    mode: "ai" | "stock";
    style: "editorial" | "realistic" | "flat";
  };
};

export const DEFAULT_DESIGN_CONFIG: WizardDesignConfig = {
  preset: "starter",
  palette: {
    primary: "#1D4ED8",
    secondary: "#0F172A",
    accent: "#E2E8F0",
  },
  fonts: {
    heading: "Poppins",
    body: "Inter",
  },
  page: {
    size: "a4",
    orientation: "portrait",
  },
  image: {
    mode: "ai",
    style: "editorial",
  },
};

export const INNER_STEPS = [
  "wizard.structure.inner.topic",
  "wizard.structure.inner.avatarProblem",
  "wizard.structure.inner.package",
  "wizard.structure.inner.mainTitle",
  "wizard.structure.inner.bonusTitles",
  "wizard.structure.inner.bumpTitles",
  "wizard.structure.inner.designConfig",
] as const;

export const FALLBACK_MAIN_TITLE_SUGGESTIONS = [
  "La guía definitiva de velas aromáticas: de cero a negocio",
  "Velas artesanales que venden: sistema paso a paso",
  "De hobbysta a emprendedora: crea tu marca de velas",
  "El método de las velas: ingresos desde casa",
  "Velas con alma: la guía para emprendedoras creativas",
] as const;
