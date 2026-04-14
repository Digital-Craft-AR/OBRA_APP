import { BadgePercent, BookOpen, Check, Gift } from "lucide-react";
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
    return <BadgePercent className="size-5 shrink-0" aria-hidden />;
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
  const heading = t("wizard.content.packSidebar.heading");

  function renderItem(item: ContentNavItem, layout: "mobile" | "desktop") {
    const isCurrent = item.key === selectedKey;
    const disabled = navItemDisabled?.(item.key) ?? false;
    const accessLabel = item.tocConfirmed
      ? `${item.navTitle}. ${t("wizard.content.index.packageTocConfirmedAria")}`
      : item.navTitle;
    const titleAttr = item.tocConfirmed
      ? `${item.navTitle} — ${t("wizard.content.index.packageTocConfirmedAria")}`
      : item.navTitle;

    const base =
      layout === "desktop"
        ? [
            "flex w-full min-w-0 items-center gap-3 rounded-lg px-3 py-2.5 text-left font-body text-sm font-medium transition-colors",
            disabled ? "cursor-not-allowed opacity-40" : "",
            isCurrent
              ? "bg-white/15 text-white ring-1 ring-inset ring-white/25"
              : "text-white/90 hover:bg-white/10",
          ].join(" ")
        : [
            "flex max-w-[11rem] shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-left font-body text-sm font-medium transition-colors",
            disabled ? "cursor-not-allowed opacity-40" : "",
            isCurrent
              ? "border-obra-blue-700 bg-obra-blue-50 text-obra-blue-950"
              : "border-obra-blue-100 bg-white text-obra-neutral-700 hover:border-obra-blue-200 hover:bg-obra-blue-50/60",
          ].join(" ");

    return (
      <li key={`${layout}-${item.key}`} className={layout === "desktop" ? "min-w-0" : ""}>
        <button
          type="button"
          disabled={disabled}
          title={titleAttr}
          aria-label={accessLabel}
          aria-current={isCurrent ? "page" : undefined}
          onClick={() => {
            if (!disabled) onSelectKey(item.key);
          }}
          className={base}
        >
          <span className={layout === "desktop" ? "text-obra-green-400" : "text-obra-blue-700"}>
            <PackTypeIcon target={item.target} />
          </span>
          <span className="min-w-0 flex-1 truncate">{item.navTitle}</span>
          {item.tocConfirmed ? (
            <Check
              className={
                layout === "desktop"
                  ? "size-4 shrink-0 text-obra-green-400"
                  : "size-4 shrink-0 text-obra-green-600"
              }
              strokeWidth={2.5}
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
      className="flex w-full shrink-0 flex-col border-b border-obra-blue-100 bg-white lg:h-full lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r lg:border-obra-blue-100 lg:bg-obra-blue-900"
    >
      <div className="border-b border-obra-blue-100 bg-obra-blue-50 px-3 py-2 lg:hidden">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-obra-neutral-600">{heading}</p>
      </div>
      <ul className="flex gap-2 overflow-x-auto px-3 py-3 lg:hidden">
        {navItems.map((item) => renderItem(item, "mobile"))}
      </ul>

      <div className="hidden border-b border-white/10 px-4 py-4 lg:block">
        <p className="font-body text-xs font-semibold uppercase tracking-wide text-white/50">{heading}</p>
      </div>
      <ul className="hidden min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-4 lg:flex">
        {navItems.map((item) => renderItem(item, "desktop"))}
      </ul>
    </nav>
  );
}
