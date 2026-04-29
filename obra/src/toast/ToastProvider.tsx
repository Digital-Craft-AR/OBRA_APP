import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { ObraToast } from "@/components/obra/ObraToast";
import { registerToastImperativeApi } from "./imperativeToast";
import { ToastContext, type ToastContextValue } from "./toastContext";
import type { AddToastInput, QueuedToast } from "./toastTypes";

const DEFAULT_DURATION_MS = 15_000;

function newToastId() {
  return globalThis.crypto?.randomUUID?.() ?? `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [toasts, setToasts] = useState<QueuedToast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback((input: AddToastInput) => {
    const id = newToastId();
    const durationMs = input.durationMs ?? DEFAULT_DURATION_MS;
    const variant = input.variant ?? "info";
    setToasts((prev) => [
      ...prev,
      {
        id,
        variant,
        title: input.title,
        description: input.description ?? "",
        durationMs,
      },
    ]);
    return id;
  }, []);

  const success = useCallback(
    (input: Omit<AddToastInput, "variant">) => addToast({ ...input, variant: "success" }),
    [addToast],
  );
  const error = useCallback(
    (input: Omit<AddToastInput, "variant">) => addToast({ ...input, variant: "error" }),
    [addToast],
  );
  const info = useCallback(
    (input: Omit<AddToastInput, "variant">) => addToast({ ...input, variant: "info" }),
    [addToast],
  );

  const contextValue = useMemo<ToastContextValue>(
    () => ({
      addToast,
      removeToast,
      success,
      error,
      info,
    }),
    [addToast, removeToast, success, error, info],
  );

  useEffect(() => {
    registerToastImperativeApi({ addToast, removeToast });
    return () => registerToastImperativeApi(null);
  }, [addToast, removeToast]);

  const portal = createPortal(
    <div
      role="region"
      aria-label={t("toast.regionLabel")}
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[200] flex flex-col items-center gap-3 px-4 sm:bottom-8"
    >
      {toasts.map((item) => (
        <div key={item.id} className="pointer-events-auto w-full max-w-toast">
          <ObraToast
            variant={item.variant}
            title={item.title}
            description={item.description}
            timeoutMs={item.durationMs}
            onTimeout={() => removeToast(item.id)}
            closeLabel={t("toast.close")}
          />
        </div>
      ))}
    </div>,
    document.body,
  );

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {portal}
    </ToastContext.Provider>
  );
}
