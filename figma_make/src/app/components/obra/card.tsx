import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { cn } from "../ui/utils";
import { ObraBadge } from "./badge";

/* ── Base Card ─────────────────────────────────────────────────────────── */
export interface ObraCardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export function ObraCard({ className, hoverable = false, ...props }: ObraCardProps) {
  return (
    <div
      className={cn(
        "bg-white border border-obra-blue-100 rounded-card shadow-card",
        hoverable && [
          "cursor-pointer transition-all duration-200",
          "hover:border-obra-blue-700 hover:shadow-card-hover hover:-translate-y-0.5",
        ],
        className
      )}
      {...props}
    />
  );
}

export function ObraCardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pt-6 pb-0", className)} {...props} />;
}

export function ObraCardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 py-4", className)} {...props} />;
}

export function ObraCardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-6 pb-6 pt-0 flex items-center gap-3", className)}
      {...props}
    />
  );
}

/* ── Project Card ──────────────────────────────────────────────────────── */
export type ProjectStatus = "draft" | "published" | "modified";

export interface ObraProjectCardProps {
  name:          string;
  status:        ProjectStatus;
  lastModified:  string;
  palette:       [string, string, string];
  artifactCount: string;
  onClick?:      () => void;
  onMenuClick?:  (e: React.MouseEvent) => void;
}

const STATUS_LABEL: Record<ProjectStatus, string> = {
  draft:     "Borrador",
  published: "Publicado",
  modified:  "Modificado",
};

const STATUS_VARIANT: Record<ProjectStatus, "draft" | "published" | "modified"> = {
  draft:     "draft",
  published: "published",
  modified:  "modified",
};

export function ObraProjectCard({
  name,
  status,
  lastModified,
  palette,
  artifactCount,
  onClick,
  onMenuClick,
}: ObraProjectCardProps) {
  return (
    <ObraCard
      hoverable
      className="p-5 flex flex-col gap-4"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <span className="text-xs text-obra-neutral-600 font-body">{lastModified}</span>
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold font-body text-obra-neutral-900 line-clamp-2 leading-snug">
          {name}
        </span>
        <button
          aria-label="Opciones del proyecto"
          onClick={(e) => {
            e.stopPropagation();
            onMenuClick?.(e);
          }}
          className="shrink-0 p-1 rounded-full text-obra-neutral-600 hover:bg-obra-blue-50 hover:text-obra-blue-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
        >
        </button>
      </div>

      {/* Status badge */}
      <ObraBadge variant={STATUS_VARIANT[status]} showDot className="flex-none w-auto self-start">
        {STATUS_LABEL[status]}
      </ObraBadge>

      {/* Footer row */}
      <div className="flex items-center justify-between">
        {/* Palette swatches */}
        <div className="flex items-center gap-1">
          {palette.map((color, i) => (
            <span
              key={i}
              className="size-3.5 rounded-full border border-obra-blue-100"
              style={{ backgroundColor: color }}
              aria-hidden="true"
            />
          ))}
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className="text-xs text-obra-neutral-600 font-body">{artifactCount}</span>
        </div>
      </div>
    </ObraCard>
  );
}