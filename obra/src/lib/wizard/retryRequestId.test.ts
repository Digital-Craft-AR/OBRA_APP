import { describe, expect, it } from "vitest";
import { makeRetryRequestIdStore } from "./retryRequestId";

describe("makeRetryRequestIdStore", () => {
  it("getOrCreate returns the same ID on repeated calls for the same key", () => {
    const store = makeRetryRequestIdStore();
    const first = store.getOrCreate("chapter:abc");
    const second = store.getOrCreate("chapter:abc");
    expect(first).toBe(second);
  });

  it("clear causes getOrCreate to return a new ID", () => {
    const store = makeRetryRequestIdStore();
    const before = store.getOrCreate("chapter:abc");
    store.clear("chapter:abc");
    const after = store.getOrCreate("chapter:abc");
    expect(after).not.toBe(before);
  });

  it("different keys are independent", () => {
    const store = makeRetryRequestIdStore();
    const a = store.getOrCreate("chapter:1");
    const b = store.getOrCreate("chapter:2");
    expect(a).not.toBe(b);
  });

  it("clearing one key does not affect another", () => {
    const store = makeRetryRequestIdStore();
    const a = store.getOrCreate("chapter:1");
    store.getOrCreate("chapter:2");
    store.clear("chapter:1");
    const a2 = store.getOrCreate("chapter:1");
    const b2 = store.getOrCreate("chapter:2");
    expect(a2).not.toBe(a);
    // chapter:2 was not cleared — same ID still stored
    expect(b2).toBe(store.getOrCreate("chapter:2"));
  });

  it("returns a non-empty string", () => {
    const store = makeRetryRequestIdStore();
    const id = store.getOrCreate("foo");
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
