import { useEffect, useState } from "react";

const SIDEBAR_COLLAPSED_STORAGE_KEY = "obra.sidebar.collapsed";

function readInitialSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function usePersistentSidebarCollapsed() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => readInitialSidebarCollapsed());

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // Ignore persistence failures (private mode, blocked storage, etc.)
    }
  }, [sidebarCollapsed]);

  return { sidebarCollapsed, setSidebarCollapsed };
}
