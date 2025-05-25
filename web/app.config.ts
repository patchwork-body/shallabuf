import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    preset: "bun",
  },
  tsr: {
    appDirectory: "src",
  },
  vite: {
    plugins: [
      tsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
    ],
    resolve: {
      conditions: ["browser"],
    },
    build: {
      rollupOptions: {
        external: [
          "node:stream",
          "node:fs",
          "node:path",
          "node:async_hooks",
          "node:stream/web",
        ],
      },
    },
  },
});
