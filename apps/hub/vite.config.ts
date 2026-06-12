import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { normiesApiProxy } from "./vite.normiesProxy";

export default defineConfig({
  plugins: [react(), tailwindcss(), normiesApiProxy()],
  resolve: {
    alias: {
      "@normie/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts"),
      "@normie/shared/styles.css": path.resolve(
        __dirname,
        "../../packages/shared/src/styles.css",
      ),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    outDir: path.resolve(__dirname, "../../dist"),
    emptyOutDir: true,
  },
});
