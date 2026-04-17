import { Loader2 } from "lucide-react";

type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeMap = {
  sm: "size-4",
  md: "size-6",
  lg: "size-8",
};

/** Centered spinner — fills its container. */
export function ObraSpinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      role="status"
      aria-label="Cargando"
    >
      <Loader2 className={`${sizeMap[size]} animate-spin text-obra-blue-700`} aria-hidden />
    </div>
  );
}

/** Absolute overlay with spinner — parent must be `position: relative`. */
export function ObraLoadingOverlay() {
  return (
    <div
      className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 backdrop-blur-[1px]"
      role="status"
      aria-label="Cargando"
    >
      <Loader2 className="size-7 animate-spin text-obra-blue-700" aria-hidden />
    </div>
  );
}
