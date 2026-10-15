import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/int/**/*.test.ts"],
    // integration files share ONE live graph and each resets it: never run files in parallel
    fileParallelism: false,
  },
});
