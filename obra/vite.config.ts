import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@obra/layout-catalog": fileURLToPath(new URL("../packages/layout-catalog/src/index.ts", import.meta.url)),
    },
  },
  server: {
    allowedHosts: ["erick-subfossorial-unneedfully.ngrok-free.dev"],
  },
});
