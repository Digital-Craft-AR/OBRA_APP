import { ObraInput } from "@/components/obra/ObraInput";
import type { WizardDesignConfig } from "@/lib/wizard/structureTypes";

type StructureStepDesignConfigProps = {
  config: WizardDesignConfig;
  message: string | null;
  onChange: (next: WizardDesignConfig) => void;
};

export function StructureStepDesignConfig({ config, message, onChange }: StructureStepDesignConfigProps) {
  function updatePreset(preset: WizardDesignConfig["preset"]) {
    onChange({
      ...config,
      preset,
    });
  }

  return (
    <section className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-obra-blue-950">Preset</p>
        <div className="flex gap-2">
          {(["starter", "minimal", "bold"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => updatePreset(preset)}
              className={`rounded-full border px-3 py-1 text-xs ${
                config.preset === preset
                  ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-900"
                  : "border-obra-blue-100 text-obra-neutral-700"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <ObraInput
          id="design-color-primary"
          label="Primary (60%)"
          value={config.palette.primary}
          onChange={(event) =>
            onChange({
              ...config,
              preset: "custom",
              palette: { ...config.palette, primary: event.target.value },
            })
          }
          placeholder="#1D4ED8"
        />
        <ObraInput
          id="design-color-secondary"
          label="Secondary (30%)"
          value={config.palette.secondary}
          onChange={(event) =>
            onChange({
              ...config,
              preset: "custom",
              palette: { ...config.palette, secondary: event.target.value },
            })
          }
          placeholder="#0F172A"
        />
        <ObraInput
          id="design-color-accent"
          label="Accent (10%)"
          value={config.palette.accent}
          onChange={(event) =>
            onChange({
              ...config,
              preset: "custom",
              palette: { ...config.palette, accent: event.target.value },
            })
          }
          placeholder="#E2E8F0"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ObraInput
          id="design-font-heading"
          label="Heading font"
          value={config.fonts.heading}
          onChange={(event) =>
            onChange({
              ...config,
              preset: "custom",
              fonts: { ...config.fonts, heading: event.target.value },
            })
          }
          placeholder="Poppins"
        />
        <ObraInput
          id="design-font-body"
          label="Body font"
          value={config.fonts.body}
          onChange={(event) =>
            onChange({
              ...config,
              preset: "custom",
              fonts: { ...config.fonts, body: event.target.value },
            })
          }
          placeholder="Inter"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-obra-blue-950">
          Page size
          <select
            className="h-11 rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm"
            value={config.page.size}
            onChange={(event) =>
              onChange({
                ...config,
                preset: "custom",
                page: {
                  ...config.page,
                  size: event.target.value as WizardDesignConfig["page"]["size"],
                },
              })
            }
          >
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-obra-blue-950">
          Orientation
          <select
            className="h-11 rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm"
            value={config.page.orientation}
            onChange={(event) =>
              onChange({
                ...config,
                preset: "custom",
                page: {
                  ...config.page,
                  orientation: event.target.value as WizardDesignConfig["page"]["orientation"],
                },
              })
            }
          >
            <option value="portrait">Portrait</option>
            <option value="landscape">Landscape</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1 text-sm text-obra-blue-950">
          Image mode
          <select
            className="h-11 rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm"
            value={config.image.mode}
            onChange={(event) =>
              onChange({
                ...config,
                preset: "custom",
                image: {
                  ...config.image,
                  mode: event.target.value as WizardDesignConfig["image"]["mode"],
                },
              })
            }
          >
            <option value="ai">AI</option>
            <option value="stock">Stock</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-obra-blue-950">
          Image style
          <select
            className="h-11 rounded-input border border-obra-neutral-200 bg-obra-neutral-100 px-3 text-sm"
            value={config.image.style}
            onChange={(event) =>
              onChange({
                ...config,
                preset: "custom",
                image: {
                  ...config.image,
                  style: event.target.value as WizardDesignConfig["image"]["style"],
                },
              })
            }
          >
            <option value="editorial">Editorial</option>
            <option value="realistic">Realistic</option>
            <option value="flat">Flat</option>
          </select>
        </label>
      </div>

      <div aria-live="polite" className="text-xs text-obra-neutral-600">
        {message}
      </div>
    </section>
  );
}
