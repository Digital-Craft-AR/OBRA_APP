import { useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, type LinkProps } from "react-router-dom";
import { OBRA_LOGO_SRC } from "@/lib/brand";
import { ObraBadge } from "@/components/obra/ObraBadge";

/**
 * Obra app shell sidebar — composition API mirrors `figma_make` shadcn `components/ui/sidebar`
 * (Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, …) without Radix/Sheet.
 * Visual language matches `figma_make/src/app/components/obra/sidebar.tsx`.
 */

const menuItemBase =
  "group/menu-item flex w-full items-center gap-3 rounded-lg border-transparent text-left font-body text-sm font-medium no-underline transition-all outline-none focus-visible:ring-2 focus-visible:ring-obra-green-400";

const OBRA_LOGO_COLLAPSED_SRC = "/assets/796f1aadc3f406b3bdc7cc3069a7e16e26beb8bf.png";

function getMenuStateClass(active: boolean, mobile: boolean) {
  if (mobile) {
    return active
      ? "border-b-2 border-obra-blue-700 text-white bg-obra-blue-950/40"
      : "border-b-2 border-transparent text-white/40 hover:text-white/80 hover:bg-obra-blue-950/30";
  }

  return active
    ? "border-l-4 border-obra-blue-700 bg-obra-blue-950/40 text-white"
    : "border-l-4 border-transparent text-white/40 hover:text-white/80 hover:bg-obra-blue-950/30";
}

export type ObraSidebarNavItem = {
  id: string;
  label: string;
  icon?: ReactNode;
  to?: LinkProps["to"];
  onClick?: () => void;
  active?: boolean;
};

export type ObraSidebarProps = Omit<HTMLAttributes<HTMLElement>, "children"> & {
  navItems: ObraSidebarNavItem[];
  userName: string;
  credits: number;
  userAvatarUrl?: string;
  onLogout?: () => void;
  logoutLabel?: string;
  collapsed?: boolean;
  mobile?: boolean;
  onToggleCollapsed?: () => void;
  expandedLogoSrc?: string;
  collapsedLogoSrc?: string;
  bottomSlot?: ReactNode;
};

export function ObraSidebar({
  className = "",
  navItems,
  userName,
  credits,
  userAvatarUrl,
  onLogout,
  logoutLabel = "Log out",
  collapsed = false,
  mobile = false,
  onToggleCollapsed,
  expandedLogoSrc = OBRA_LOGO_SRC,
  collapsedLogoSrc = OBRA_LOGO_COLLAPSED_SRC,
  bottomSlot,
  ...props
}: ObraSidebarProps) {
  const { t } = useTranslation();
  const navigationId = useId();
  const logoutText = logoutLabel ?? t("nav.logout");
  const expandLabel = t("sidebar.expand");
  const collapseLabel = t("sidebar.collapse");
  const creditsLabel = t("sidebar.credits");
  const creditsCountLabel = t("sidebar.creditsCount", { count: credits });

  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      data-obra-sidebar
      aria-label={t("sidebar.mainAria")}
      className={`relative flex h-screen shrink-0 flex-col bg-obra-blue-900 transition-all duration-200 ${collapsed ? "w-16" : "w-sidebar"} ${className}`.trim()}
      {...props}
    >
      {onToggleCollapsed ? (
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? expandLabel : collapseLabel}
          aria-expanded={!collapsed}
          aria-controls={navigationId}
          title={collapsed ? expandLabel : collapseLabel}
          className="absolute right-0 top-7 z-20 flex size-6 translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-obra-blue-700 text-white shadow-lg transition-all"
        >
          {collapsed ? <ChevronRight className="size-3" aria-hidden /> : <ChevronLeft className="size-3" aria-hidden />}
        </button>
      ) : null}

      <div className="flex min-h-18 items-center border-b border-white/10 px-4">
        <img
          src={collapsed ? collapsedLogoSrc : expandedLogoSrc}
          alt={t("sidebar.logoAlt")}
          className={`${collapsed ? "mx-auto h-10 w-full object-contain" : "h-10 w-auto object-contain"}`.trim()}
        />
      </div>

      <nav
        id={navigationId}
        aria-label={t("sidebar.primaryNavAria")}
        className={`flex min-h-0 flex-1 flex-col gap-1 overflow-auto ${collapsed ? "px-2 py-4" : "p-3"}`.trim()}
      >
        <ul className="list-none p-0 m-0 flex flex-col gap-1">
          {navItems.map((item) => {
            const itemClass = `${menuItemBase} ${collapsed ? "justify-center px-2 py-2.5" : "py-2.5 pl-3 pr-3"} ${getMenuStateClass(!!item.active, mobile)}`.trim();

            const content = (
              <>
                {item.icon ? (
                  <span
                    aria-hidden
                    className={`shrink-0 ${item.active ? "text-white" : "text-white/40 group-hover/menu-item:text-white/80"}`}
                  >
                    {item.icon}
                  </span>
                ) : null}
                {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
              </>
            );

            return (
              <li key={item.id} className="relative">
                {item.to ? (
                  <Link
                    to={item.to}
                    aria-current={item.active ? "page" : undefined}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    className={itemClass}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={item.onClick}
                    aria-label={item.label}
                    title={collapsed ? item.label : undefined}
                    className={itemClass}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={`flex flex-col gap-2 border-t border-white/10 ${collapsed ? "px-2 py-4" : "p-3"}`.trim()}>
        {bottomSlot}
        {!collapsed ? (
          <div className="flex items-center justify-between px-2">
            <span className="font-body text-xs text-white/40">{creditsLabel}</span>
            <ObraBadge variant="credits">{credits.toLocaleString()}</ObraBadge>
          </div>
        ) : (
          <div
            role="status"
            aria-label={creditsCountLabel}
            title={creditsCountLabel}
            className="mx-auto flex size-7 items-center justify-center rounded-full bg-obra-green-400"
          >
            <span className="font-body text-2xs font-bold text-obra-blue-950">
              {credits >= 1000 ? `${Math.floor(credits / 1000)}k` : credits}
            </span>
          </div>
        )}

        <div className={`flex items-center ${collapsed ? "justify-center px-2" : "gap-3 px-2"}`.trim()}>
          <div
            title={collapsed ? userName : undefined}
            className={`flex size-8 shrink-0 items-center justify-center rounded-full ${userAvatarUrl ? "overflow-hidden" : "bg-obra-blue-700"}`.trim()}
          >
            {userAvatarUrl ? (
              <img src={userAvatarUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              <span className="font-body text-xs font-semibold text-white">{initials}</span>
            )}
          </div>
          {!collapsed ? <span className="truncate font-body text-sm text-white/80">{userName}</span> : null}
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label={logoutText}
          title={collapsed ? logoutText : undefined}
          disabled={!onLogout}
          className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-white/40 transition-all outline-none hover:bg-obra-blue-950/30 hover:text-white/80 focus-visible:ring-2 focus-visible:ring-obra-green-400 ${collapsed ? "justify-center px-2" : ""}`.trim()}
        >
          <LogOut className="size-4 shrink-0 text-white/40 transition-colors group-hover:text-white/80" aria-hidden />
          {!collapsed ? <span className="text-sm font-medium font-body">{logoutText}</span> : null}
        </button>
      </div>
    </aside>
  );
}

export type ObraSidebarInsetProps = HTMLAttributes<HTMLElement>;

/** Main content column paired with `ObraSidebar` (same role as shadcn `SidebarInset`). */
export function ObraSidebarInset({ className = "", ...props }: ObraSidebarInsetProps) {
  return (
    <div
      data-obra-sidebar-inset
      className={`relative flex min-h-0 min-w-0 flex-1 flex-col bg-white ${className}`.trim()}
      {...props}
    />
  );
}
