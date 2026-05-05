import { Check, Sparkles, Upload } from "lucide-react";
import type { TFunction } from "i18next";
import { CONTENT_SOURCE_OPTIONS, type ContentSource } from "@/lib/projects";

type Props = {
  t: TFunction;
  value: ContentSource;
  variant: "select" | "readonly";
  onSelect?: (source: ContentSource) => void;
  /** When true, interactive cards ignore pointer input (e.g. while persisting a new choice). */
  disabled?: boolean;
};

function RadioIndicator({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${
        selected ? "border-obra-blue-700" : "border-obra-neutral-200"
      }`}
      aria-hidden
    >
      {selected ? <span className="size-2.5 rounded-full bg-obra-blue-700" /> : null}
    </span>
  );
}

function SourceCardBody({ option, selected, t }: { option: ContentSource; selected: boolean; t: TFunction }) {
  const Icon = option === "ai" ? Sparkles : Upload;
  const iconCircle = selected ? "bg-obra-blue-900 text-white" : "bg-obra-blue-100 text-obra-blue-700";
  const badgeClass =
    option === "ai"
      ? selected
        ? "rounded-full bg-obra-blue-900 px-2.5 py-0.5 text-xs font-semibold text-white"
        : "rounded-full bg-obra-blue-100 px-2.5 py-0.5 text-xs font-semibold text-obra-blue-900"
      : "rounded-full border border-obra-blue-100 bg-obra-blue-50 px-2.5 py-0.5 text-xs font-semibold text-obra-blue-800";
  const checkClass = selected ? "text-obra-blue-700" : "text-obra-neutral-300";
  const lineClass = selected ? "text-obra-blue-950" : "text-obra-neutral-600";

  return (
    <>
      <span className="absolute right-5 top-5">
        <RadioIndicator selected={selected} />
      </span>
      <div className="flex gap-4 pr-10">
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full ${iconCircle}`}
          aria-hidden
        >
          <Icon className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-body text-base font-semibold text-obra-blue-950">
              {t(`wizard.create.source.${option}.cardTitle`)}
            </h3>
            <span className={badgeClass}>{t(`wizard.create.source.${option}.badge`)}</span>
          </div>
          <p className="mt-2 font-body text-sm leading-relaxed text-obra-neutral-600">
            {t(`wizard.create.source.${option}.cardDescription`)}
          </p>
          <ul className="mt-4 space-y-2.5">
            {([1, 2, 3] as const).map((i) => (
              <li key={i} className={`flex gap-2.5 font-body text-sm leading-snug ${lineClass}`}>
                <Check className={`mt-0.5 size-4 shrink-0 stroke-[2.5] ${checkClass}`} aria-hidden />
                <span>{t(`wizard.create.source.${option}.bullet${i}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}

export function ContentSourceCards({ t, value, variant, onSelect, disabled = false }: Props) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0">
      {CONTENT_SOURCE_OPTIONS.map((option) => {
        const selected = value === option;
        const interactive = variant === "select" && Boolean(onSelect);
        const surface = selected
          ? "border-2 border-obra-blue-700 bg-obra-blue-50"
          : "border border-obra-neutral-200 bg-white hover:border-obra-blue-300";

        if (interactive) {
          return (
            <li key={option}>
              <button
                type="button"
                data-testid={`new-project-source-${option}`}
                disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  onSelect?.(option);
                }}
                data-testid={`new-project-source-${option}`}
                className={`relative w-full cursor-pointer rounded-card p-5 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60 ${surface}`}
              >
                <SourceCardBody option={option} selected={selected} t={t} />
              </button>
            </li>
          );
        }

        return (
          <li key={option}>
            <div
              role="group"
              aria-label={t(`wizard.create.source.${option}.cardTitle`)}
              aria-current={selected ? "true" : undefined}
              className={`relative w-full rounded-card p-5 text-left transition-all ${surface} ${
                selected ? "" : "opacity-95"
              }`}
            >
              <SourceCardBody option={option} selected={selected} t={t} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
