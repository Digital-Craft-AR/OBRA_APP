import { cleanup, configure } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

configure({ reactStrictMode: false });

afterEach(() => {
  cleanup();
});
