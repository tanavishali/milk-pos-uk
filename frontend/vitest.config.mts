import { defineConfig } from "vitest/config";

/**
 * Aliases resolve straight from `tsconfig.json` via Vite's native
 * `resolve.tsconfigPaths`, so the seventeen path aliases are never duplicated
 * into a second mapping. (This replaces `vite-tsconfig-paths`, which Vite now
 * warns is redundant.)
 *
 * No `@vitejs/plugin-react`: esbuild handles the JSX transform from
 * `"jsx": "react-jsx"`, and Fast Refresh is meaningless in a test run.
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts", "test/**/*.test.tsx"],
  },
});
