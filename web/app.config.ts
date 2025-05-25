import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import { cloudflare } from "unenv";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    preset: "cloudflare-module",
    unenv: cloudflare,
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
