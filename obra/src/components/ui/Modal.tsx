import type { HTMLAttributes, ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  closeLabel?: string;
  /** Max width / surface sizing for the dialog panel (defaults to max-w-lg). */
  surfaceClassName?: string;
  children: ReactNode;
};

export function Modal({ open, onClose, closeLabel = "Close modal", surfaceClassName, children }: ModalProps) {
  if (!open) return null;

  const surfaceMaxWidth = surfaceClassName?.trim() ? surfaceClassName.trim() : "max-w-lg";

  return (
    <div className="fixed inset-0 z-50 bg-obra-blue-950/35" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        data-state="open"
        className={`fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-modal-full bg-white rounded-modal shadow-card-hover data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 outline-none ${surfaceMaxWidth}`}
        onClick={(event) => event.stopPropagation()}
      >
        {onClose ? (
          <button
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="absolute right-6 top-6 text-2xl leading-none text-obra-neutral-400 hover:text-obra-neutral-600"
          >
            ×
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}

export function ModalHead({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-start justify-between gap-4 px-6 pt-6 pb-4 ${className}`.trim()} {...props} />
  );
}

export function ModalTitle({ className = "", ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h2 className={`text-lg font-semibold font-body text-obra-blue-950 ${className}`.trim()} {...props} />;
}

export function ModalSubtitle({ className = "", ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`mt-1 text-sm font-body text-obra-neutral-600 ${className}`.trim()} {...props} />
  );
}

export function ModalContent({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-6 py-4 text-sm font-body text-obra-neutral-900 ${className}`.trim()} {...props} />;
}

export function ModalFooter({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between gap-3 px-6 pb-6 pt-2 ${className}`.trim()} {...props} />
  );
}
