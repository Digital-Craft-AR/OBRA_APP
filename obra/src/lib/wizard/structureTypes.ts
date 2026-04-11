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
  /** Book layout template from `@obra/layout-catalog` (nullable until first design save). */
  book_template_id: string | null;
  /** Stable logical page key → resolved layout id for Preview/PDF. */
  layout_page_assignments: Record<string, string>;
  structure_completed_at: string | null;
};

export type BaseProjectRow = Omit<
  ProjectRow,
  | "bonus_count"
  | "bump_count"
  | "main_title"
  | "author"
  | "bonus_items"
  | "bump_items"
  | "design_config"
  | "book_template_id"
  | "layout_page_assignments"
>;

export type WizardTitleItem = {
  title: string;
  locked: boolean;
};

/** Chapter counts available in Structure → Design (issue #112). */
export const WIZARD_CHAPTER_COUNTS = [6, 8, 10, 12] as const;
export type WizardChapterCount = (typeof WIZARD_CHAPTER_COUNTS)[number];

/** Highlighted as the recommended option in the design wizard UI. */
export const WIZARD_RECOMMENDED_CHAPTER_COUNT: WizardChapterCount = 8;

/** Stored on `design_config.contentTone`; English keys for prompts and APIs. */
export const CONTENT_TONE_KEYS = ["professional", "friendly", "inspirational", "direct", "educational"] as const;
export type ContentTone = (typeof CONTENT_TONE_KEYS)[number];

export type WizardDesignConfig = {
  /** Number of main-ebook chapters; drives index generation (issue #112). */
  chapterCount: WizardChapterCount;
  /** Voice preset for AI-written package text (issue #112). */
  contentTone: ContentTone;
  /** Palette only — independent from typography. */
  paletteMode: "preset" | "custom";
  palettePresetId: DesignPresetId | null;
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
    mode: "ai" | "upload";
    style: "illustration" | "photography" | "isometric" | "minimalist" | "watercolor";
  };
};

export type DesignPresetId = "oceanic" | "terracotta" | "minimal" | "vibrant" | "elegant";

export type DesignPreset = {
  id: DesignPresetId;
  palette: WizardDesignConfig["palette"];
  fonts: WizardDesignConfig["fonts"];
};

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "oceanic",
    palette: { primary: "#F4F8FC", secondary: "#2D6499", accent: "#5A7A94" },
    fonts: { heading: "Playfair Display", body: "Inter" },
  },
  {
    id: "terracotta",
    palette: { primary: "#FFF7F2", secondary: "#B66A3C", accent: "#7A3F1E" },
    fonts: { heading: "Lora", body: "Inter" },
  },
  {
    id: "minimal",
    palette: { primary: "#F9FAFB", secondary: "#111827", accent: "#DC2626" },
    fonts: { heading: "Fraunces", body: "Inter" },
  },
  {
    id: "vibrant",
    palette: { primary: "#F5F3FF", secondary: "#7C3AED", accent: "#F59E0B" },
    fonts: { heading: "Poppins", body: "Inter" },
  },
  {
    id: "elegant",
    palette: { primary: "#FAF7F2", secondary: "#2B2B2B", accent: "#B7791F" },
    fonts: { heading: "Cormorant Garamond", body: "Inter" },
  },
];

export function getDesignPresetById(id: DesignPresetId | null) {
  if (!id) return null;
  return DESIGN_PRESETS.find((preset) => preset.id === id) ?? null;
}

/** Hex (#rgb / #rrggbb) or existing `rgb()` string → `rgb(r, g, b)` for inline styles. */
export function colorToRgbStyleValue(color: string): string {
  const trimmed = color.trim();
  if (trimmed.startsWith("rgb")) return trimmed;
  const hex = trimmed.replace("#", "");
  if (hex.length !== 3 && hex.length !== 6) return "rgb(0, 0, 0)";
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((ch) => ch + ch)
          .join("")
      : hex;
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return "rgb(0, 0, 0)";
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgb(${r}, ${g}, ${b})`;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeChapterCount(raw: unknown): WizardChapterCount {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 6 || n === 8 || n === 10 || n === 12) return n;
  return DEFAULT_DESIGN_CONFIG.chapterCount;
}

function normalizeContentTone(raw: unknown): ContentTone {
  if (typeof raw === "string" && (CONTENT_TONE_KEYS as readonly string[]).includes(raw)) {
    return raw as ContentTone;
  }
  return DEFAULT_DESIGN_CONFIG.contentTone;
}

export function normalizeDesignConfig(value: unknown): WizardDesignConfig {
  if (!isObject(value)) return DEFAULT_DESIGN_CONFIG;

  const chapterCountRaw =
    value.chapterCount !== undefined
      ? value.chapterCount
      : typeof value.chapter_count === "number" || typeof value.chapter_count === "string"
        ? value.chapter_count
        : undefined;
  const contentToneRaw =
    typeof value.contentTone === "string"
      ? value.contentTone
      : typeof value.content_tone === "string"
        ? value.content_tone
        : undefined;

  const paletteModeRaw =
    typeof value.paletteMode === "string"
      ? value.paletteMode
      : typeof value.mode === "string"
        ? value.mode
        : "preset";
  const paletteMode = paletteModeRaw === "custom" ? "custom" : "preset";

  const legacyPreset = typeof value.preset === "string" ? value.preset : null;
  const palettePresetIdRaw =
    typeof value.palettePresetId === "string"
      ? (value.palettePresetId as DesignPresetId)
      : typeof value.presetId === "string"
        ? (value.presetId as DesignPresetId)
        : legacyPreset === "minimal"
          ? "minimal"
          : legacyPreset === "bold"
            ? "vibrant"
            : "oceanic";

  const palettePresetId: DesignPresetId | null =
    paletteMode === "custom"
      ? null
      : getDesignPresetById(palettePresetIdRaw)
        ? palettePresetIdRaw
        : "oceanic";
  const palettePreset = getDesignPresetById(palettePresetId) ?? getDesignPresetById("oceanic");
  const paletteInput = isObject(value.palette) ? value.palette : {};
  const fontsInput = isObject(value.fonts) ? value.fonts : {};
  const pageInput = isObject(value.page) ? value.page : {};
  const imageInput = isObject(value.image) ? value.image : {};

  return {
    chapterCount: normalizeChapterCount(chapterCountRaw),
    contentTone: normalizeContentTone(contentToneRaw),
    paletteMode,
    palettePresetId,
    palette: {
      primary:
        typeof paletteInput.primary === "string"
          ? paletteInput.primary
          : (palettePreset?.palette.primary ?? DEFAULT_DESIGN_CONFIG.palette.primary),
      secondary:
        typeof paletteInput.secondary === "string"
          ? paletteInput.secondary
          : (palettePreset?.palette.secondary ?? DEFAULT_DESIGN_CONFIG.palette.secondary),
      accent:
        typeof paletteInput.accent === "string"
          ? paletteInput.accent
          : (palettePreset?.palette.accent ?? DEFAULT_DESIGN_CONFIG.palette.accent),
    },
    fonts: {
      heading:
        typeof fontsInput.heading === "string"
          ? fontsInput.heading
          : DEFAULT_DESIGN_CONFIG.fonts.heading,
      body: typeof fontsInput.body === "string" ? fontsInput.body : DEFAULT_DESIGN_CONFIG.fonts.body,
    },
    page: {
      size: pageInput.size === "letter" ? "letter" : "a4",
      orientation: pageInput.orientation === "landscape" ? "landscape" : "portrait",
    },
    image: {
      mode: imageInput.mode === "upload" || imageInput.mode === "stock" ? "upload" : "ai",
      style:
        imageInput.style === "photography" ||
        imageInput.style === "isometric" ||
        imageInput.style === "minimalist" ||
        imageInput.style === "watercolor"
          ? imageInput.style
          : imageInput.style === "realistic"
            ? "photography"
            : imageInput.style === "flat"
              ? "minimalist"
              : "illustration",
    },
  };
}

export const DEFAULT_DESIGN_CONFIG: WizardDesignConfig = {
  chapterCount: 8,
  contentTone: "friendly",
  paletteMode: "preset",
  palettePresetId: "oceanic",
  palette: {
    primary: "#F4F8FC",
    secondary: "#2D6499",
    accent: "#5A7A94",
  },
  fonts: {
    heading: "Playfair Display",
    body: "Inter",
  },
  page: {
    size: "a4",
    orientation: "portrait",
  },
  image: {
    mode: "ai",
    style: "illustration",
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
