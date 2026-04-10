import { Check } from "lucide-react";
import type { TFunction } from "i18next";
import { CONTENT_SOURCE_OPTIONS, type ContentSource } from "@/lib/projects";

type Props = {
  t: TFunction;
  value: ContentSource;
  variant: "select" | "readonly";
  onSelect?: (source: ContentSource) => void;
};

export function ContentSourceCards({ t, value, variant, onSelect }: Props) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0">
      {CONTENT_SOURCE_OPTIONS.map((option) => {
        const selected = value === option;
        const interactive = variant === "select" && Boolean(onSelect);
        const baseClass =
          "rounded-card border px-4 py-4 text-left transition-all w-full " +
          (selected
            ? "border-obra-blue-700 bg-obra-blue-50"
            : "border-obra-blue-100 bg-white hover:border-obra-blue-700/50");

        if (interactive) {
          return (
            <li key={option}>
              <button type="button" onClick={() => onSelect?.(option)} className={baseClass}>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-obra-blue-950">
                    {t(`wizard.create.source.${option}.label`)}
                  </span>
                  {selected ? <Check className="size-4 shrink-0 text-obra-blue-700" aria-hidden /> : null}
                </div>
                <p className="mt-1 text-sm text-obra-neutral-600">
                  {t(`wizard.create.source.${option}.description`)}
                </p>
              </button>
            </li>
          );
        }

        return (
          <li key={option}>
            <div
              aria-label={t(`wizard.create.source.${option}.label`)}
              aria-current={selected ? "true" : undefined}
              className={`${baseClass} ${selected ? "" : "opacity-60"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-obra-blue-950">
                  {t(`wizard.create.source.${option}.label`)}
                </span>
                {selected ? <Check className="size-4 shrink-0 text-obra-blue-700" aria-hidden /> : null}
              </div>
              <p className="mt-1 text-sm text-obra-neutral-600">
                {t(`wizard.create.source.${option}.description`)}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
