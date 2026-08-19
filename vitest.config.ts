import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: { environment: "node" },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      // Next resolves this internally at build time; it is not a real package on disk, so
      // tests that touch a server-only module need a stand-in.
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts"),
    },
  },
});
