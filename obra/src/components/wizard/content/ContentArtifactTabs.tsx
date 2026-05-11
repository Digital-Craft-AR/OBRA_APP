import { BookOpen, CheckCircle2, Gift, TrendingUp } from "lucide-react";
import { parseContentNavKey } from "@/lib/wizard/contentNav";

export type ArtifactTabItem = { key: string; navTitle: string };

type ContentArtifactTabsProps = {
  tabs: ArtifactTabItem[];
  selectedKey: string;
  onSelect: (key: string) => void;
  approvedByKey?: Record<string, boolean>;
};

function ArtifactTabIcon({ tabKey }: { tabKey: string }) {
  const target = parseContentNavKey(tabKey);
  const kind = target?.kind ?? "main";
  if (kind === "bonus") return <Gift className="size-3.5 shrink-0" aria-hidden />;
  if (kind === "bump") return <TrendingUp className="size-3.5 shrink-0" aria-hidden />;
  return <BookOpen className="size-3.5 shrink-0" aria-hidden />;
}

export function ContentArtifactTabs({
  tabs,
  selectedKey,
  onSelect,
  approvedByKey,
}: ContentArtifactTabsProps) {
  return (
    <nav
      role="tablist"
      aria-label="Artefactos del paquete"
      className="flex shrink-0 overflow-x-auto border-b border-obra-blue-100 bg-white"
    >
      {tabs.map((item) => {
        const isActive = item.key === selectedKey;
        const isApproved = Boolean(approvedByKey?.[item.key]);
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            data-testid={`content-tab-${item.key}`}
            aria-selected={isActive}
            onClick={() => onSelect(item.key)}
            className={[
              "flex shrink-0 items-center gap-1.5 border-b-2 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-obra-blue-400",
              isActive
                ? "border-obra-blue-700 text-obra-blue-950"
                : "border-transparent text-obra-neutral-500 hover:border-obra-blue-200 hover:text-obra-blue-800",
            ].join(" ")}
          >
            <ArtifactTabIcon tabKey={item.key} />
            {isApproved && (
              <CheckCircle2 className="size-3.5 shrink-0 text-obra-green-600" aria-hidden />
            )}
            <span className="max-w-[180px] truncate">{item.navTitle}</span>
          </button>
        );
      })}
    </nav>
  );
}
