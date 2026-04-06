import { cn } from "../ui/utils";

export interface Page {
  id:     string;
  number: number;
}

interface PagesSidebarProps {
  pages:        Page[];
  currentPage?: string;
  onSelectPage?: (pageId: string) => void;
  productLabel: string;
}

/**
 * PagesSidebar — muestra miniaturas de las páginas del producto seleccionado.
 * Usado en el paso de "Vista Previa".
 */
export function PagesSidebar({
  pages,
  currentPage,
  onSelectPage,
  productLabel,
}: PagesSidebarProps) {
  return (
    <div className="w-32 shrink-0 border-r border-obra-blue-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 py-3 border-b border-obra-blue-100 shrink-0">
        <span className="text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide">
          Páginas
        </span>
        <p className="text-2xs text-obra-neutral-400 font-body mt-0.5 truncate">
          {productLabel}
        </p>
      </div>

      {/* Page thumbnails */}
      <div className="flex-1 overflow-y-auto py-3 px-2 flex flex-col gap-3">
        {pages.map((page) => {
          const isActive = page.id === currentPage;
          return (
            <button
              key={page.id}
              onClick={() => onSelectPage?.(page.id)}
              className={cn(
                "relative rounded-card border-2 transition-all group",
                isActive
                  ? "border-obra-blue-700 shadow-sm"
                  : "border-obra-blue-100 hover:border-obra-blue-300 hover:shadow-sm"
              )}
            >
              {/* Thumbnail */}
              <div className="aspect-[3/4] bg-gradient-to-br from-obra-blue-50 to-obra-blue-100 rounded-sm flex items-center justify-center">
                <span
                  className={cn(
                    "text-xs font-body font-medium",
                    isActive ? "text-obra-blue-700" : "text-obra-neutral-400"
                  )}
                >
                  {page.number}
                </span>
              </div>

              {/* Page number badge */}
              <div
                className={cn(
                  "absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-2xs font-body font-medium whitespace-nowrap",
                  isActive
                    ? "bg-obra-blue-700 text-white"
                    : "bg-white border border-obra-blue-100 text-obra-neutral-600"
                )}
              >
                Pág. {page.number}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
