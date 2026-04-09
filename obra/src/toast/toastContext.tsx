import { createContext, useContext } from "react";
import type { AddToastInput } from "./toastTypes";

export type ToastContextValue = {
  addToast: (input: AddToastInput) => string;
  removeToast: (id: string) => void;
  success: (input: Omit<AddToastInput, "variant">) => string;
  error: (input: Omit<AddToastInput, "variant">) => string;
  info: (input: Omit<AddToastInput, "variant">) => string;
};

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
