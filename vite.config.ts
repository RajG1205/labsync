import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    // Redirect the bundled server entry to src/server.ts (our SSR error wrapper)
    // instead of TanStack Start's default entry.
    // NOTE: "cloudflare" preset requires a wrangler.toml/jsonc that this project
    // does not ship, and fails the build ("Nitro entry is missing"). "node-server"
    // is a portable target that runs anywhere Node.js does; switch back to
    // "cloudflare" once a wrangler config is added for that deployment target.
    nitro({ preset: "node-server" }),
  ],
  // Resolves the "@/*" -> "./src/*" path alias declared in tsconfig.json.
  resolve: { tsconfigPaths: true },
  environments: {
    ssr: { build: { rollupOptions: { input: "./src/server.ts" } } },
  },
});
