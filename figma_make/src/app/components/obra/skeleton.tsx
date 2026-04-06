import * as React from "react";
import { cn } from "../ui/utils";

/* ── Base shimmer block ─────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-obra-neutral-200 rounded",
        "after:absolute after:inset-0 after:-translate-x-full",
        "after:bg-gradient-to-r after:from-transparent after:via-white/50 after:to-transparent",
        "after:animate-[shimmer_1.5s_infinite]",
        className
      )}
    />
  );
}

/* ── Named skeleton shapes ──────────────────────────────────────────────── */
export function ObraSkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "bg-white border border-obra-blue-100 rounded-card shadow-card p-5 flex flex-col gap-4",
        className
      )}
    >
      <Shimmer className="h-4 w-3/4 rounded" />
      <Shimmer className="h-5 w-20 rounded-full" />
      <div className="flex justify-between">
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <Shimmer key={i} className="size-3.5 rounded-full" />
          ))}
        </div>
        <Shimmer className="h-3 w-28 rounded" />
      </div>
    </div>
  );
}

export function ObraSkeletonTextFull({ className }: { className?: string }) {
  return <Shimmer className={cn("h-4 w-full rounded", className)} />;
}

export function ObraSkeletonTextShort({ className }: { className?: string }) {
  return <Shimmer className={cn("h-4 w-3/5 rounded", className)} />;
}

export function ObraSkeletonTitle({ className }: { className?: string }) {
  return <Shimmer className={cn("h-6 w-1/2 rounded", className)} />;
}

export function ObraSkeletonImage({ className }: { className?: string }) {
  return <Shimmer className={cn("w-full aspect-video rounded-card", className)} />;
}

export function ObraSkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <ObraSkeletonTitle />
      <ObraSkeletonTextFull />
      <ObraSkeletonTextFull />
      <ObraSkeletonTextShort />
    </div>
  );
}
