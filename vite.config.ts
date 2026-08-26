import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

/**
 * Universal backend proxy middleware to bypass browser CORS during local web development.
 */
function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy-plugin",
    configureServer(server) {
      server.middlewares.use("/__api_proxy", async (req, res) => {
        const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
        const targetUrl = urlObj.searchParams.get("url");

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing url parameter" }));
          return;
        }

        try {
          const authHeader = req.headers["authorization"] || "";
          const fetchRes = await fetch(targetUrl, {
            headers: {
              ...(authHeader ? { Authorization: authHeader } : {}),
              "User-Agent": "AI-Gateway-Desk-Web/0.1.0",
              Accept: "application/json",
            },
          });

          const data = await fetchRes.text();
          res.statusCode = fetchRes.status;
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.end(data);
        } catch (err: unknown) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          const msg = err instanceof Error ? err.message : String(err);
          res.end(JSON.stringify({ error: msg }));
        }
      });
    },
  };
}

// @see https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiProxyPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
});
