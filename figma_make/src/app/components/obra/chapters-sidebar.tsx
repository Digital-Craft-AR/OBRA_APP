import { cn } from "../ui/utils";

export interface Chapter {
  id:    string;
  title: string;
}

interface ChaptersSidebarProps {
  chapters:        Chapter[];
  currentChapter?: string;
  onSelectChapter?: (chapterId: string) => void;
  productLabel:    string;
}

/**
 * ChaptersSidebar — muestra la lista de capítulos del producto seleccionado.
 * Usado en el paso de "Contenido IA".
 */
export function ChaptersSidebar({
  chapters,
  currentChapter,
  onSelectChapter,
  productLabel,
}: ChaptersSidebarProps) {
  return (
    <div className="w-64 shrink-0 border-r border-obra-blue-100 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-obra-blue-100 shrink-0">
        <span className="text-xs font-medium font-body text-obra-neutral-600 uppercase tracking-wide">
          Capítulos
        </span>
        <p className="text-xs text-obra-neutral-400 font-body mt-0.5 truncate">
          {productLabel}
        </p>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto py-2">
        {chapters.map((ch, index) => {
          const isActive = ch.id === currentChapter;
          return (
            <button
              key={ch.id}
              onClick={() => onSelectChapter?.(ch.id)}
              className={cn(
                "w-full px-4 py-2.5 text-left flex items-start gap-2 transition-all font-body",
                isActive
                  ? "bg-obra-blue-50 text-obra-blue-950 border-l-2 border-obra-blue-700"
                  : "text-obra-neutral-600 hover:bg-obra-blue-50/50 hover:text-obra-blue-950 border-l-2 border-transparent"
              )}
            >
              <span className="text-xs font-medium shrink-0 mt-0.5 min-w-[1.5rem]">
                {index + 1}.
              </span>
              <span className="text-xs leading-snug flex-1">
                {ch.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
