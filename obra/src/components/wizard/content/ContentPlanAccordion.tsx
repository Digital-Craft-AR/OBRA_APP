import { BookOpen, CheckCircle2, ChevronDown, Gift, TrendingUp } from "lucide-react";
import type { TFunction } from "i18next";
import type { ContentNavItem, ContentPackageNavTarget } from "@/lib/wizard/contentNav";

type ContentPlanAccordionProps = {
  t: TFunction;
  navItems: ContentNavItem[];
  openKey: string | null;
  expandedKeys: Set<string>;
  onToggle: (key: string) => void;
  chapterCountByKey: Record<string, number>;
  renderOpenContent: () => React.ReactNode;
};

function ArtifactIcon({ target }: { target: ContentPackageNavTarget }) {
  if (target.kind === "bonus") return <Gift className="size-4 shrink-0 text-obra-blue-400" aria-hidden />;
  if (target.kind === "bump") return <TrendingUp className="size-4 shrink-0 text-obra-blue-400" aria-hidden />;
  return <BookOpen className="size-4 shrink-0 text-obra-blue-400" aria-hidden />;
}

export function ContentPlanAccordion({
  t,
  navItems,
  openKey,
  expandedKeys,
  onToggle,
  chapterCountByKey,
  renderOpenContent,
}: ContentPlanAccordionProps) {
  return (
    <div className="space-y-2">
      {navItems.map((item) => {
        const isOpen = openKey === item.key;
        const wasExpanded = expandedKeys.has(item.key);
        const count = chapterCountByKey[item.key] ?? 0;

        return (
          <div
            key={item.key}
            className={`rounded-lg border transition-colors ${
              isOpen ? "border-obra-blue-300 bg-white" : "border-obra-blue-100 bg-white hover:border-obra-blue-200"
            }`}
          >
            <button
              type="button"
              className="flex w-full items-center gap-3 px-5 py-4 text-left"
              onClick={() => onToggle(item.key)}
              aria-expanded={isOpen}
            >
              <ArtifactIcon target={item.target} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-obra-blue-950 truncate">{item.navTitle}</p>
                {count > 0 && (
                  <p className="mt-0.5 text-xs text-obra-neutral-500">
                    {t("wizard.content.planReview.chapterCount", { count })}
                  </p>
                )}
              </div>
              {wasExpanded && !isOpen && (
                <CheckCircle2 className="size-4 shrink-0 text-obra-green-400" aria-hidden />
              )}
              <ChevronDown
                className={`size-4 shrink-0 text-obra-blue-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>

            {isOpen && (
              <div className="border-t border-obra-blue-100 px-5 py-5">
                {renderOpenContent()}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
