import * as React from "react";
import { cn } from "../ui/utils";

export interface ObraUserChipProps {
  name:         string;
  avatarUrl?:   string;
  size?:        "sm" | "md";
  showName?:    boolean;
  className?:   string;
}

export function ObraUserChip({
  name,
  avatarUrl,
  size = "md",
  showName = true,
  className,
}: ObraUserChipProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const avatarSize = size === "sm" ? "size-7" : "size-8";
  const textSize   = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={cn(avatarSize, "rounded-full object-cover shrink-0")}
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn(
            avatarSize,
            "rounded-full bg-obra-blue-700 flex items-center justify-center shrink-0"
          )}
        >
          <span className="text-xs font-semibold text-white font-body">{initials}</span>
        </div>
      )}
      {showName && (
        <span className={cn(textSize, "font-body text-obra-blue-950 font-medium truncate")}>
          {name}
        </span>
      )}
    </div>
  );
}
