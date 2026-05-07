import type { ObraToastVariant } from "@/components/obra/ObraToast";

export type QueuedToast = {
  id: string;
  variant: ObraToastVariant;
  title: string;
  description: string;
  /** Auto-dismiss duration; `0` = manual dismiss only. */
  durationMs: number;
};

export type AddToastInput = {
  variant?: ObraToastVariant;
  title: string;
  description?: string;
  /** Omit or `undefined` for default (15s). `0` = no auto-dismiss. */
  durationMs?: number;
};
