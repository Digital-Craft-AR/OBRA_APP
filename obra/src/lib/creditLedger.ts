/** Matches `credit_ledger_entries.reason` check constraint (migration `20260411000000_credit_ledger.sql`). */
export type CreditLedgerReason =
  | "top_up"
  | "consumption"
  | "adjustment"
  | "grant"
  | "refund"
  | "other";

export type CreditLedgerRow = {
  id: string;
  created_at: string;
  delta: number;
  balance_after: number;
  reason: string;
  project_id: string | null;
  /** Edge Function that wrote the entry — no user content. Added in migration 20260503000000. */
  source_function: string | null;
};

export const CREDIT_LEDGER_PAGE_SIZE = 50;

export function formatCreditDelta(delta: number): string {
  if (delta > 0) return `+${delta.toLocaleString()}`;
  return delta.toLocaleString();
}

export function isCreditLedgerReason(value: string): value is CreditLedgerReason {
  return (
    value === "top_up" ||
    value === "consumption" ||
    value === "adjustment" ||
    value === "grant" ||
    value === "refund" ||
    value === "other"
  );
}
