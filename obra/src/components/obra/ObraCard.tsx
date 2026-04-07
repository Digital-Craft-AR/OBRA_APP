import type { HTMLAttributes } from "react";

export type ObraCardProps = HTMLAttributes<HTMLDivElement>;

export function ObraCard({ className = "", children, ...props }: ObraCardProps) {
  return (
    <div
      className={`rounded-card border border-obra-blue-100 bg-white shadow-card ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  );
}
