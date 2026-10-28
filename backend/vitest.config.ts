import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    fileParallelism: false,
    setupFiles: ["./src/__tests__/setup.ts"],
    globalSetup: ["./src/__tests__/global-setup.ts"],
    testTimeout: 20000,
    hookTimeout: 20000,
  },
});
