import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

/** Vitest-only config (mirrors `vite.config.ts` alias + plugins for `@/` and React). */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: false,
    // Provide fake Supabase credentials so the client module initializes
    // without throwing. MSW intercepts the actual HTTP calls in integration
    // tests, so these values never reach the real Supabase API.
    env: {
      VITE_SUPABASE_URL: "https://test.supabase.co",
      VITE_SUPABASE_ANON_KEY: "test-anon-key",
    },
    coverage: {
      provider: "v8",
      // To intentionally lower a threshold, update the value here, add a
      // comment referencing the GitHub issue tracking the coverage debt, and
      // get it reviewed. Thresholds should only ever go up over time.
      thresholds: {
        lines: 20,
        functions: 20,
        branches: 20,
        statements: 20,
      },
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: [
        "src/test/**",
        "src/**/*.d.ts",
        "src/main.tsx",
        "src/**/*.types.ts",
      ],
    },
  },
});
