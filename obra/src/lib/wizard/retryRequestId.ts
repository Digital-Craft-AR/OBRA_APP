/**
 * Retry-safe request ID store for AI generation actions.
 *
 * Generates a single clientRequestId per operation key and reuses it
 * across retries, so the backend idempotency layer (obra_credit_ledger_apply)
 * never charges twice for the same failed call. Callers must call `clear`
 * after a successful call so the next invocation is treated as a new request.
 */
export function makeRetryRequestIdStore() {
  const store: Record<string, string> = {};
  return {
    /**
     * Returns the stored ID for `key`, or generates and stores a new one.
     * Use this on every generation attempt — retries will receive the same ID.
     */
    getOrCreate(key: string): string {
      if (!store[key]) {
        store[key] =
          globalThis.crypto?.randomUUID?.() ??
          `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }
      return store[key];
    },
    /**
     * Removes the stored ID for `key`. Call this after a successful generation
     * so the next user-initiated action gets a fresh idempotency key.
     */
    clear(key: string): void {
      delete store[key];
    },
  };
}
