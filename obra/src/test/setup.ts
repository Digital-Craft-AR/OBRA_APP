import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { server } from "./server";

// JSDOM doesn't implement ResizeObserver — provide a no-op stub so components
// that use it don't throw during unit tests.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

configure({ reactStrictMode: false });

// Start the MSW server before all tests, reset handlers after each test to
// prevent handler bleed-through, and close the server when all tests are done.
beforeAll(() => server.listen({ onUnhandledRequest: "warn" }));
afterEach(() => {
  server.resetHandlers();
  cleanup();
});
afterAll(() => server.close());
