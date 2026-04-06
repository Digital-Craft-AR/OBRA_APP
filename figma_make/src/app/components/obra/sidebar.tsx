import image_796f1aadc3f406b3bdc7cc3069a7e16e26beb8bf from 'figma:asset/796f1aadc3f406b3bdc7cc3069a7e16e26beb8bf.png'
import * as React from "react";
import { LogOut, ChevronRight, ChevronLeft } from "lucide-react";
import { cn } from "../ui/utils";
import { ObraBadge } from "./badge";
import logoFull from "figma:asset/e19e88c23bdca35264776a01dd4d9c985aa84fa4.png";
import logoIcon from "figma:asset/01dfb69decfccafcc41fa4eb6156cc46dbbd6382.png";

/* ── Types ──────────────────────────────────────────────────────────────── */
export interface ObraNavItem {
  id:       string;
  label:    string;
  icon:     React.ReactNode;
  href?:    string;
  active?:  boolean;
  onClick?: () => void;
}

export interface ObraSidebarProps {
  navItems:            ObraNavItem[];
  userName:            string;
  userAvatarUrl?:      string;
  credits:             number;
  logoSlot?:           React.ReactNode;
  bottomSlot?:         React.ReactNode;
  onLogout?:           () => void;
  locale?:             "es" | "pt-br";
  onLocaleChange?:     (locale: "es" | "pt-br") => void;
  collapsed?:          boolean;
  onToggleCollapsed?:  () => void;
  className?:          string;
}

/* ── Nav Item ───────────────────────────────────────────────────────────── */
function NavItem({ item, collapsed }: { item: ObraNavItem; collapsed: boolean }) {
  const Tag = item.href ? "a" : "button";

  return (
    <Tag
      href={item.href}
      onClick={item.onClick}
      title={collapsed ? item.label : undefined}
      aria-current={item.active ? "page" : undefined}
      className={cn(
        "group flex items-center gap-3 w-full rounded-lg transition-all outline-none",
        "focus-visible:ring-2 focus-visible:ring-obra-green-400",
        collapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5",
        item.active
          ? "text-white border-l-3 border-obra-blue-700 bg-obra-blue-950/40 pl-3"
          : "text-white/40 hover:text-white/80 hover:bg-obra-blue-950/30 border-l-3 border-transparent pl-3",
        collapsed && item.active && "border-l-0 border-b-2 border-obra-blue-700 rounded-lg",
        collapsed && !item.active && "border-l-0"
      )}
    >
      <span className={cn(
        "shrink-0 transition-colors",
        item.active ? "text-white" : "text-white/40 group-hover:text-white/80"
      )}>
        {item.icon}
      </span>
      {!collapsed && (
        <span className="text-sm font-medium font-body truncate">{item.label}</span>
      )}
    </Tag>
  );
}

/* ── Sidebar ─────────────────────────────────────────────────────────────── */
export function ObraSidebar({
  navItems,
  userName,
  userAvatarUrl,
  credits,
  logoSlot,
  bottomSlot,
  onLogout,
  locale = "es",
  onLocaleChange,
  collapsed = false,
  onToggleCollapsed,
  className,
}: ObraSidebarProps) {
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside
      className={cn(
        "relative shrink-0 h-full flex flex-col bg-obra-blue-900 transition-all duration-200",
        collapsed ? "w-16" : "w-sidebar",
        className
      )}
    >
      {/* Floating toggle button — overflows the right edge */}
      <button
        onClick={onToggleCollapsed}
        title={collapsed ? "Expandir menú" : "Contraer menú"}
        className={cn(
          "absolute right-0 translate-x-1/2 top-7 -translate-y-1/2 z-20",
          "size-6 rounded-full flex items-center justify-center",
          "bg-obra-blue-700 border border-white/20 shadow-lg",
          "text-white hover:bg-obra-blue-700",
          "transition-all duration-150"
        )}
      >
        {collapsed
          ? <ChevronRight className="size-3" />
          : <ChevronLeft  className="size-3" />
        }
      </button>

      {/* Logo zone — fixed h-14 so nav never shifts */}
      <div className="flex items-center border-b border-white/10 h-18 px-4">
        {collapsed ? (
          <img
            src={image_796f1aadc3f406b3bdc7cc3069a7e16e26beb8bf}
            alt="O."
            className="h-12 w-auto mx-auto object-contain"
          />
        ) : (
          logoSlot ?? (
            <img
              src={logoFull}
              alt="Obra."
              className="h-12 w-auto object-contain"
            />
          )
        )}
      </div>

      {/* Nav */}
      <nav
        className={cn("flex-1 py-4 flex flex-col gap-1", collapsed ? "px-2" : "px-3")}
        aria-label="Navegación principal"
      >
        {navItems.map((item) => (
          <NavItem key={item.id} item={item} collapsed={collapsed} />
        ))}
      </nav>

      {/* Language selector — above the dividing line */}
      {!collapsed && (
        <div className="px-4 pb-3">
          <div className="flex gap-0.5 rounded-full bg-obra-blue-950/40 p-1">
            {([["es", "Español"], ["pt-br", "Português"]] as const).map(([l, label]) => (
              <button
                key={l}
                onClick={() => onLocaleChange?.(l)}
                className={cn(
                  "flex-1 py-1 rounded-full text-2xs font-body font-semibold transition-all",
                  locale === l ? "bg-white/15 text-white" : "text-white/40 hover:text-white/60"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom zone */}
      <div className={cn(
        "py-4 border-t border-white/10 flex flex-col gap-3",
        collapsed ? "px-2 items-center" : "px-3"
      )}>
        {bottomSlot}

        {/* Credits */}
        {collapsed ? (
          <div
            title={`${credits.toLocaleString()} créditos`}
            className="size-7 rounded-full bg-obra-green-400 flex items-center justify-center"
          >
            <span className="text-2xs font-bold text-obra-blue-950 font-body">
              {credits >= 1000 ? `${Math.floor(credits / 1000)}k` : credits}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-white/40 font-body">Créditos</span>
            <ObraBadge variant="credits">{credits.toLocaleString()}</ObraBadge>
          </div>
        )}

        {/* User chip */}
        {collapsed ? (
          <div
            title={userName}
            className={cn(
              "size-8 rounded-full flex items-center justify-center shrink-0",
              userAvatarUrl ? "overflow-hidden" : "bg-obra-blue-700"
            )}
          >
            {userAvatarUrl
              ? <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
              : <span className="text-xs font-semibold text-white font-body">{initials}</span>
            }
          </div>
        ) : (
          <div className="flex items-center gap-3 px-2">
            <div className={cn(
              "size-8 rounded-full flex items-center justify-center shrink-0",
              userAvatarUrl ? "overflow-hidden" : "bg-obra-blue-700"
            )}>
              {userAvatarUrl
                ? <img src={userAvatarUrl} alt={userName} className="w-full h-full object-cover" />
                : <span className="text-xs font-semibold text-white font-body">{initials}</span>
              }
            </div>
            <span className="text-sm text-white/80 font-body truncate">{userName}</span>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={onLogout}
          title={collapsed ? "Cerrar sesión" : undefined}
          className={cn(
            "group flex items-center gap-3 w-full rounded-lg transition-all outline-none",
            "text-white/40 hover:text-white/80 hover:bg-obra-blue-950/30",
            "focus-visible:ring-2 focus-visible:ring-obra-green-400",
            collapsed ? "justify-center px-2 py-2" : "px-3 py-2"
          )}
        >
          <LogOut className="size-4 shrink-0 text-white/40 group-hover:text-white/80 transition-colors" />
          {!collapsed && (
            <span className="text-sm font-medium font-body">Cerrar sesión</span>
          )}
        </button>
      </div>
    </aside>
  );
}