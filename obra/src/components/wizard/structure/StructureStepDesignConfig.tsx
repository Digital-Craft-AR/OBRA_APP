import { useEffect, useMemo } from "react";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { bookTemplateIdsForGeometry, normalizeBookTemplateId } from "@obra/layout-catalog";
import { ObraInput } from "@/components/obra/ObraInput";
import {
  colorToRgbStyleValue,
  DESIGN_PRESETS,
  getDesignPresetById,
  type DesignPresetId,
  type WizardDesignConfig,
  WIZARD_CHAPTER_COUNTS,
  WIZARD_RECOMMENDED_CHAPTER_COUNT,
} from "@/lib/wizard/structureTypes";

type StructureStepDesignConfigProps = {
  config: WizardDesignConfig;
  bookTemplateId: string;
  onBookTemplateChange: (templateId: string) => void;
  message: string | null;
  onChange: (next: WizardDesignConfig) => void;
};

/** Display-only swatches for the “Personalizada” palette card (custom mode). */
const PERSONALIZED_PALETTE_SWATCHES = ["#E5E7EB", "#9CA3AF", "#6B7280"] as const;

const CUSTOM_PALETTE_TONES = [
  { tone: "primary" as const, index: 1, labelKey: "wizard.structure.design.palette.customSwatchPrimary" },
  { tone: "secondary" as const, index: 2, labelKey: "wizard.structure.design.palette.customSwatchSecondary" },
  { tone: "accent" as const, index: 3, labelKey: "wizard.structure.design.palette.customSwatchAccent" },
];

function formatHexForDisplay(hex: string): string {
  const t = hex.trim();
  if (!t.startsWith("#")) return t.toUpperCase();
  return `#${t.slice(1).toUpperCase()}`;
}

export function StructureStepDesignConfig({
  config,
  bookTemplateId,
  onBookTemplateChange,
  message,
  onChange,
}: StructureStepDesignConfigProps) {
  const { t } = useTranslation();

  const eligibleTemplates = useMemo(
    () => bookTemplateIdsForGeometry({ size: config.page.size, orientation: config.page.orientation }),
    [config.page.orientation, config.page.size],
  );

  useEffect(() => {
    if (eligibleTemplates.length === 0) return;
    if (!eligibleTemplates.includes(bookTemplateId)) {
      onBookTemplateChange(eligibleTemplates[0] ?? normalizeBookTemplateId(null));
    }
  }, [bookTemplateId, eligibleTemplates, onBookTemplateChange]);

  function updatePalettePreset(presetId: DesignPresetId) {
    const preset = getDesignPresetById(presetId);
    if (!preset) return;
    onChange({
      ...config,
      paletteMode: "preset",
      palettePresetId: preset.id,
      palette: preset.palette,
    });
  }

  function enableCustomPalette() {
    onChange({
      ...config,
      paletteMode: "custom",
      palettePresetId: null,
    });
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.structure.design.bookTemplate.title")}
        </h3>
        <p className="text-xs text-obra-neutral-600">{t("wizard.structure.design.bookTemplate.subtitle")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {eligibleTemplates.map((id) => {
            const selected = bookTemplateId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onBookTemplateChange(id)}
                className={`flex w-full flex-col gap-1 rounded-xl border px-4 py-3 text-left transition-colors ${
                  selected ? "border-obra-blue-700 bg-obra-blue-50" : "border-obra-neutral-200 bg-white"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-obra-blue-950">
                    {t(`wizard.structure.design.bookTemplate.${id}.name`)}
                  </span>
                  {selected ? (
                    <Check className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
                  ) : (
                    <span className="size-4 shrink-0" aria-hidden />
                  )}
                </div>
                <p className="text-xs text-obra-neutral-600">
                  {t(`wizard.structure.design.bookTemplate.${id}.description`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("wizard.structure.design.page.title")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                page: {
                  ...config.page,
                  size: "a4",
                },
              })
            }
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              config.page.size === "a4"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : "border-obra-neutral-200 bg-white"
            }`}
          >
            <div
              className={`h-8 w-6 shrink-0 rounded-sm border-2 ${
                config.page.size === "a4" ? "border-obra-blue-700" : "border-obra-neutral-400"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  config.page.size === "a4" ? "text-obra-blue-700" : "text-obra-blue-950"
                }`}
              >
                {t("wizard.structure.design.page.a4Label")}
              </p>
              <p
                className={`text-xs ${
                  config.page.size === "a4" ? "text-obra-neutral-600" : "text-obra-neutral-400"
                }`}
              >
                {t("wizard.structure.design.page.a4Hint")}
              </p>
            </div>
            {config.page.size === "a4" ? (
              <Check className="size-5 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                page: {
                  ...config.page,
                  size: "letter",
                },
              })
            }
            className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              config.page.size === "letter"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : "border-obra-neutral-200 bg-white"
            }`}
          >
            <div
              className={`h-9 w-7 shrink-0 rounded-sm border-2 ${
                config.page.size === "letter" ? "border-obra-blue-700" : "border-obra-neutral-400"
              }`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  config.page.size === "letter" ? "text-obra-blue-700" : "text-obra-blue-950"
                }`}
              >
                {t("wizard.structure.design.page.letterLabel")}
              </p>
              <p
                className={`text-xs ${
                  config.page.size === "letter" ? "text-obra-neutral-600" : "text-obra-neutral-400"
                }`}
              >
                {t("wizard.structure.design.page.letterHint")}
              </p>
            </div>
            {config.page.size === "letter" ? (
              <Check className="size-5 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                page: { ...config.page, orientation: "portrait" },
              })
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              config.page.orientation === "portrait"
                ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700"
                : "border-obra-neutral-200 bg-white text-obra-neutral-600"
            }`}
          >
            {t("wizard.structure.design.page.portrait")}
            {config.page.orientation === "portrait" ? (
              <Check className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-4 shrink-0" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                page: { ...config.page, orientation: "landscape" },
              })
            }
            className={`flex items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors ${
              config.page.orientation === "landscape"
                ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700"
                : "border-obra-neutral-200 bg-white text-obra-neutral-600"
            }`}
          >
            {t("wizard.structure.design.page.landscape")}
            {config.page.orientation === "landscape" ? (
              <Check className="size-4 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-4 shrink-0" aria-hidden />
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.structure.design.chapters.title")}
        </h3>
        <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-y-6">
          {WIZARD_CHAPTER_COUNTS.map((count) => {
            const selected = config.chapterCount === count;
            const isRecommended = count === WIZARD_RECOMMENDED_CHAPTER_COUNT;
            return (
              <button
                key={count}
                type="button"
                onClick={() => onChange({ ...config, chapterCount: count })}
                className={`relative flex min-h-[3.25rem] w-full items-center justify-center rounded-xl border px-3 py-3 text-center transition-colors ${
                  selected
                    ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-700"
                    : "border-obra-neutral-200 bg-white text-obra-neutral-600"
                }`}
              >
                {selected ? (
                  <Check className="absolute right-2 top-2 size-3 text-obra-blue-700" aria-hidden />
                ) : null}
                <span className="text-sm font-semibold tabular-nums">{count}</span>
                {isRecommended ? (
                  <span
                    className={`pointer-events-none absolute bottom-0 left-1/2 z-10 -translate-x-1/2 translate-y-1/2 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide shadow-sm ${
                      selected
                        ? "border-obra-blue-200 bg-obra-blue-100 text-obra-blue-800"
                        : "border-obra-blue-100 bg-white text-obra-blue-700"
                    }`}
                    aria-hidden
                  >
                    {t("wizard.structure.design.chapters.recommended")}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        <p className="text-sm text-obra-neutral-700">
          {t(`wizard.structure.design.chapters.estimate.${config.chapterCount}`)}
        </p>
        <p className="text-xs text-obra-neutral-500">{t("wizard.structure.design.chapters.disclaimer")}</p>
      </div>

      <div className="border-t border-obra-blue-100" aria-hidden />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">
          {t("wizard.structure.design.palette.title")}
        </h3>
        <p className="text-xs text-obra-neutral-600">{t("wizard.structure.design.palette.subtitle")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {DESIGN_PRESETS.map((preset) => {
            const isSelected = config.paletteMode === "preset" && config.palettePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => updatePalettePreset(preset.id)}
                className={`relative rounded-card border px-2.5 py-2 text-center ${
                  isSelected
                    ? "border-obra-blue-700 bg-obra-blue-50"
                    : "border-obra-neutral-200 bg-white"
                }`}
              >
                {isSelected ? (
                  <Check className="absolute right-1 top-1 size-4 text-obra-blue-700" aria-hidden />
                ) : null}
                <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
                  <span
                    className="size-5 rounded-full border border-obra-blue-100"
                    style={{ backgroundColor: colorToRgbStyleValue(preset.palette.primary) }}
                  />
                  <span
                    className="size-5 rounded-full border border-obra-blue-100"
                    style={{ backgroundColor: colorToRgbStyleValue(preset.palette.secondary) }}
                  />
                  <span
                    className="size-5 rounded-full border border-obra-blue-100"
                    style={{ backgroundColor: colorToRgbStyleValue(preset.palette.accent) }}
                  />
                </div>
                <p className="text-xs font-semibold text-obra-blue-950">
                  {t(`wizard.structure.design.preset.${preset.id}.name`)}
                </p>
              </button>
            );
          })}
          <button
            type="button"
            onClick={enableCustomPalette}
            className={`relative rounded-card border px-2.5 py-2 text-center ${
              config.paletteMode === "custom"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : "border-obra-neutral-200 bg-white"
            }`}
          >
            {config.paletteMode === "custom" ? (
              <Check className="absolute right-1 top-1 size-4 text-obra-blue-700" aria-hidden />
            ) : null}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-1">
              {PERSONALIZED_PALETTE_SWATCHES.map((hex) => (
                <span
                  key={hex}
                  className="size-5 rounded-full border border-obra-blue-100"
                  style={{ backgroundColor: colorToRgbStyleValue(hex) }}
                />
              ))}
            </div>
            <p className="text-xs font-semibold text-obra-blue-950">
              {t("wizard.structure.design.palette.personalized")}
            </p>
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
          config.paletteMode === "custom" ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div
            className={`border-t border-obra-blue-100 pt-6 transition duration-300 ease-out motion-reduce:transition-none ${
              config.paletteMode === "custom"
                ? "translate-y-0 opacity-100"
                : "pointer-events-none -translate-y-2 opacity-0"
            }`}
          >
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-obra-blue-950">
                  {t("wizard.structure.design.palette.customPanelTitle")}
                </h4>
                <p className="text-xs text-obra-neutral-600">
                  {t("wizard.structure.design.palette.customPanelSubtitle")}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-6">
                {CUSTOM_PALETTE_TONES.map(({ tone, index, labelKey }) => (
                  <div key={tone} className="flex flex-col items-center gap-2">
                    <label className="relative flex cursor-pointer flex-col items-center gap-2">
                      <span className="relative inline-flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-obra-blue-100">
                        <span
                          className="pointer-events-none absolute inset-[3px] rounded-full"
                          style={{
                            backgroundColor: colorToRgbStyleValue(config.palette[tone]),
                          }}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={config.palette[tone]}
                          onChange={(event) =>
                            onChange({
                              ...config,
                              paletteMode: "custom",
                              palettePresetId: null,
                              palette: { ...config.palette, [tone]: event.target.value },
                            })
                          }
                          className="absolute inset-0 size-full cursor-pointer rounded-full opacity-0"
                          aria-label={t(labelKey)}
                        />
                        <span
                          className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-5 items-center justify-center rounded-full border border-obra-blue-100 bg-obra-blue-50 text-2xs font-semibold text-obra-blue-900"
                          aria-hidden
                        >
                          {index}
                        </span>
                      </span>
                      <span className="text-center text-xs font-semibold text-obra-blue-950">{t(labelKey)}</span>
                    </label>
                    <span className="text-center text-xs text-obra-neutral-400">
                      {formatHexForDisplay(config.palette[tone])}
                    </span>
                  </div>
                ))}
              </div>
              <div className="rounded-card border border-obra-blue-100 bg-obra-blue-50 px-4 py-3">
                <ul className="flex flex-col gap-2 text-xs text-obra-neutral-600">
                  <li className="flex gap-2">
                    <span className="shrink-0 font-semibold text-obra-blue-900">1</span>
                    <span>{t("wizard.structure.design.palette.customInfo1")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-semibold text-obra-blue-900">2</span>
                    <span>{t("wizard.structure.design.palette.customInfo2")}</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="shrink-0 font-semibold text-obra-blue-900">3</span>
                    <span>{t("wizard.structure.design.palette.customInfo3")}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-obra-blue-100" aria-hidden />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("wizard.structure.design.typography.title")}</h3>
        <p className="text-xs text-obra-neutral-600">{t("wizard.structure.design.typography.presetsHint")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <ObraInput
            id="design-font-heading"
            label={t("wizard.structure.design.typography.headingFontLabel")}
            value={config.fonts.heading}
            onChange={(event) =>
              onChange({ ...config, fonts: { ...config.fonts, heading: event.target.value } })
            }
            placeholder={t("wizard.structure.design.typography.headingPlaceholder")}
          />
          <ObraInput
            id="design-font-body"
            label={t("wizard.structure.design.typography.bodyFontLabel")}
            value={config.fonts.body}
            onChange={(event) => onChange({ ...config, fonts: { ...config.fonts, body: event.target.value } })}
            placeholder={t("wizard.structure.design.typography.bodyPlaceholder")}
          />
        </div>
        <div className="rounded-card border border-obra-neutral-200 bg-obra-neutral-100 px-4 py-3">
          <p className="text-sm text-obra-blue-950" style={{ fontFamily: config.fonts.heading }}>
            {t("wizard.structure.design.typography.headingSample")}
          </p>
          <p className="mt-2 text-xs text-obra-neutral-600" style={{ fontFamily: config.fonts.body }}>
            {t("wizard.structure.design.typography.bodySample")}
          </p>
        </div>
      </div>

      <div className="border-t border-obra-blue-100" aria-hidden />

      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-obra-blue-950">{t("wizard.structure.design.images.title")}</h3>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                image: { ...config.image, mode: "ai" },
              })
            }
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              config.image.mode === "ai"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : "border-obra-neutral-200 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  config.image.mode === "ai" ? "text-obra-blue-700" : "text-obra-blue-950"
                }`}
              >
                {t("wizard.structure.design.images.aiMode")}
              </p>
              <p
                className={`text-xs ${
                  config.image.mode === "ai" ? "text-obra-neutral-600" : "text-obra-neutral-500"
                }`}
              >
                {t("wizard.structure.design.images.aiModeHint")}
              </p>
            </div>
            {config.image.mode === "ai" ? (
              <Check className="size-5 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
          </button>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...config,
                image: { ...config.image, mode: "upload" },
              })
            }
            className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
              config.image.mode === "upload"
                ? "border-obra-blue-700 bg-obra-blue-50"
                : "border-obra-neutral-200 bg-white"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold ${
                  config.image.mode === "upload" ? "text-obra-blue-700" : "text-obra-blue-950"
                }`}
              >
                {t("wizard.structure.design.images.uploadMode")}
              </p>
              <p
                className={`text-xs ${
                  config.image.mode === "upload" ? "text-obra-neutral-600" : "text-obra-neutral-500"
                }`}
              >
                {t("wizard.structure.design.images.uploadModeHint")}
              </p>
            </div>
            {config.image.mode === "upload" ? (
              <Check className="size-5 shrink-0 text-obra-blue-700" aria-hidden />
            ) : (
              <span className="size-5 shrink-0" aria-hidden />
            )}
          </button>
        </div>
        {config.image.mode === "ai" ? (
          <>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-obra-blue-950">
                {t("wizard.structure.design.images.styleTitle")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    "illustration",
                    "photography",
                    "isometric",
                    "minimalist",
                    "watercolor",
                  ] as WizardDesignConfig["image"]["style"][]
                ).map((style) => {
                  const selected = config.image.style === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        onChange({
                          ...config,
                          image: { ...config.image, style },
                        })
                      }
                      className={`rounded-full border-2 px-4 py-2.5 font-body text-sm font-medium transition-colors ${
                        selected
                          ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950 shadow-sm"
                          : "border-obra-neutral-200 bg-white text-obra-neutral-600 hover:border-obra-blue-200 hover:bg-obra-blue-50/60"
                      }`}
                    >
                      {t(`wizard.structure.design.images.style.${style}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="rounded-input border border-obra-blue-100 bg-obra-blue-50 px-3 py-2 text-xs text-obra-neutral-600">
              {t("wizard.structure.design.images.note")}
            </div>
          </>
        ) : null}
        {message ? (
          <p aria-live="polite" className="text-xs text-obra-neutral-600">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}
