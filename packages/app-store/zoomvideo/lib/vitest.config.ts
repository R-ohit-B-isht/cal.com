import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "@calcom/lib": path.resolve(__dirname, "../../../packages/lib"),
      "@calcom/prisma": path.resolve(__dirname, "../../../packages/prisma"),
      "@calcom/types": path.resolve(__dirname, "../../../packages/types"),
      "@calcom/dayjs": path.resolve(__dirname, "../../../packages/dayjs"),
    },
  },
});
