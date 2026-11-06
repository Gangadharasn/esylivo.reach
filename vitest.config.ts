import path from "node:path";

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  // "server-only" throws outside Next's server bundle; tests run server modules directly.
  resolve: { alias: { "server-only": path.resolve(__dirname, "__tests__/server-only-stub.ts") } },
  test: { include: ["__tests__/**/*.test.ts"] },
});
