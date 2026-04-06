import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { FolderOpen, HelpCircle, Settings, Layers } from "lucide-react";
import { ObraSidebar } from "./sidebar";

export function AppLayout() {
  const location  = useLocation();
  const navigate  = useNavigate();
  const [locale,    setLocale]    = useState<"es" | "pt-br">("es");
  const [collapsed, setCollapsed] = useState(true);  // collapsed by default

  const isActive = (prefix: string) =>
    location.pathname === prefix || location.pathname.startsWith(prefix + "/");

  const navItems = [
    {
      id:      "projects",
      label:   "Proyectos",
      icon:    <FolderOpen className="size-4" />,
      active:  isActive("/proyectos"),
      onClick: () => navigate("/proyectos"),
    },
    {
      id:      "help",
      label:   "Ayuda",
      icon:    <HelpCircle className="size-4" />,
      active:  isActive("/ayuda"),
      onClick: () => navigate("/ayuda"),
    },
    {
      id:      "settings",
      label:   "Configuración",
      icon:    <Settings className="size-4" />,
      active:  isActive("/configuracion"),
      onClick: () => navigate("/configuracion"),
    },
    {
      id:      "design-system",
      label:   "Design System",
      icon:    <Layers className="size-4" />,
      active:  isActive("/design-system"),
      onClick: () => navigate("/design-system"),
    },
  ];

  return (
    <div className="flex h-screen font-body">
      <ObraSidebar
        navItems={navItems}
        userName="Valentina García"
        credits={1240}
        locale={locale}
        onLocaleChange={setLocale}
        onLogout={() => navigate("/login")}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((c) => !c)}
      />
      <main className="flex-1 overflow-y-auto overflow-x-hidden bg-white">
        <Outlet />
      </main>
    </div>
  );
}