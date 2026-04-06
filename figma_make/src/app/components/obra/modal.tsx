import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "../ui/utils";

export interface ObraModalProps {
  open:          boolean;
  onClose:       () => void;
  title:         string;
  description?:  string;
  children?:     React.ReactNode;
  footer?:       React.ReactNode;
  destructive?:  boolean;
  size?:         "sm" | "md" | "lg";
}

const sizeClass = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function ObraModal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  destructive = false,
  size = "md",
}: ObraModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-obra-blue-950/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />

        {/* Content */}
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2",
            "w-modal-full bg-white rounded-modal shadow-card-hover",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "outline-none",
            sizeClass[size]
          )}
        >
          {/* Header */}
          <div
            className={cn(
              "flex items-start justify-between gap-4 px-6 pt-6 pb-4",
              destructive && "bg-red-50 rounded-t-modal"
            )}
          >
            <div className="flex items-start gap-3">
              {destructive && (
                <AlertTriangle className="size-5 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div>
                <Dialog.Title
                  className={cn(
                    "text-lg font-semibold font-body",
                    destructive ? "text-red-700" : "text-obra-blue-950"
                  )}
                >
                  {title}
                </Dialog.Title>
                {description && (
                  <Dialog.Description className="mt-1 text-sm font-body text-obra-neutral-600">
                    {description}
                  </Dialog.Description>
                )}
              </div>
            </div>

            <Dialog.Close
              onClick={onClose}
              className="shrink-0 p-1.5 rounded-full text-obra-neutral-600 hover:bg-obra-blue-50 hover:text-obra-blue-700 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-obra-blue-700"
              aria-label="Cerrar"
            >
              <X className="size-4" />
            </Dialog.Close>
          </div>

          {/* Body */}
          {children && (
            <div className="px-6 py-4 text-sm font-body text-obra-neutral-900">{children}</div>
          )}

          {/* Footer */}
          {footer && (
            <div className="flex items-center justify-end gap-3 px-6 pb-6 pt-2">{footer}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}