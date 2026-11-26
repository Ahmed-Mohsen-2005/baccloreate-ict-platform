import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stubs/server-only.ts", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "lib/**/*.test.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    // PGlite boots a full Postgres in WASM; give RLS suites room.
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
