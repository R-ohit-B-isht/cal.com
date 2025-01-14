/// <reference types="vitest" />
import { resolve } from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      "@calcom/lib": resolve(__dirname, "../../../packages/lib"),
      "@calcom/prisma": resolve(__dirname, "../../../packages/prisma"),
      "@calcom/types": resolve(__dirname, "../../../packages/types"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    include: ["**/*.test.ts", "**/*.integration.test.ts"],
    coverage: {
      ...configDefaults.coverage,
      enabled: true,
      provider: "c8",
      reporter: ["text", "json", "html"],
      include: ["**/VideoApiAdapter.ts"],
      exclude: ["**/__mocks__/**", "**/__fixtures__/**", "**/*.test.ts", "**/*.d.ts", "**/index.ts"],
    },
  },
});
