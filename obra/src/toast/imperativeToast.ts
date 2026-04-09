import type { AddToastInput } from "./toastTypes";

/**
 * Imperative toast API registered by `ToastProvider` on mount.
 *
 * Tradeoff: calls only work after the provider has mounted (typically under `I18nextProvider`
 * in `main.tsx`). Do not rely on this module during module init before React renders; in tests,
 * wrap the tree with `ToastProvider`. If the provider is absent, `add` returns an empty string
 * and `remove` is a no-op — no user-visible toast is shown.
 */
export type ToastImperativeApi = {
  addToast: (input: AddToastInput) => string;
  removeToast: (id: string) => void;
};

let impl: ToastImperativeApi | null = null;

export function registerToastImperativeApi(next: ToastImperativeApi | null) {
  impl = next;
}

function add(input: AddToastInput): string {
  return impl?.addToast(input) ?? "";
}

function remove(id: string) {
  impl?.removeToast(id);
}

export const toast = {
  add,
  remove,
  success: (input: Omit<AddToastInput, "variant">) => add({ ...input, variant: "success" }),
  error: (input: Omit<AddToastInput, "variant">) => add({ ...input, variant: "error" }),
  info: (input: Omit<AddToastInput, "variant">) => add({ ...input, variant: "info" }),
};
