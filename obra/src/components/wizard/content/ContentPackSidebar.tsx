import { BookOpen, Check, Gift, TrendingUp } from "lucide-react";
import type { TFunction } from "i18next";
import type { ContentNavItem, ContentPackageNavTarget } from "@/lib/wizard/contentNav";

type ContentPackSidebarProps = {
  t: TFunction;
  navItems: ContentNavItem[];
  selectedKey: string;
  onSelectKey: (key: string) => void;
  navItemDisabled?: (key: string) => boolean;
};

function PackTypeIcon({ target }: { target: ContentPackageNavTarget }) {
  if (target.kind === "bonus") {
    return <Gift className="size-5 shrink-0" aria-hidden />;
  }
  if (target.kind === "bump") {
    return <TrendingUp className="size-5 shrink-0" aria-hidden />;
  }
  return <BookOpen className="size-5 shrink-0" aria-hidden />;
}

export function ContentPackSidebar({
  t,
  navItems,
  selectedKey,
  onSelectKey,
  navItemDisabled,
}: ContentPackSidebarProps) {
  const navLabel = t("wizard.content.index.packageNavAria");

  function renderItem(item: ContentNavItem) {
    const isCurrent = item.key === selectedKey;
    const disabled = navItemDisabled?.(item.key) ?? false;
    const accessLabel = item.tocConfirmed
      ? `${item.navTitle}. ${t("wizard.content.index.packageTocConfirmedAria")}`
      : item.navTitle;
    const titleAttr = item.tocConfirmed
      ? `${item.navTitle} — ${t("wizard.content.index.packageTocConfirmedAria")}`
      : item.navTitle;

    return (
      <li key={item.key}>
        <button
          type="button"
          disabled={disabled}
          title={titleAttr}
          aria-label={accessLabel}
          aria-current={isCurrent ? "page" : undefined}
          onClick={() => {
            if (!disabled) onSelectKey(item.key);
          }}
          className={[
            "relative flex size-11 shrink-0 items-center justify-center rounded-md border font-body transition-colors",
            disabled ? "cursor-not-allowed opacity-30" : "",
            isCurrent
              ? "border-obra-blue-500/60 bg-obra-blue-700 text-white"
              : "border-transparent bg-transparent text-white/60 hover:bg-obra-blue-800/60 hover:text-white",
          ].join(" ")}
        >
          <PackTypeIcon target={item.target} />
          {item.tocConfirmed ? (
            <Check
              className="absolute -right-1 -top-1 size-3.5 shrink-0 rounded-full bg-obra-green-400 p-0.5 text-white"
              strokeWidth={3}
              aria-hidden
            />
          ) : null}
        </button>
      </li>
    );
  }

  return (
    <nav
      aria-label={navLabel}
      className="flex w-full shrink-0 flex-col items-center gap-1 border-b border-obra-blue-800/50 bg-obra-blue-900 px-4 py-4 lg:w-auto lg:items-start lg:border-b-0 lg:border-r lg:px-4 lg:py-4"
    >
      <ul className="flex flex-row justify-between gap-2 overflow-x-auto lg:flex-col lg:justify-start lg:overflow-visible">
        {navItems.map((item) => renderItem(item))}
      </ul>
    </nav>
  );
}
