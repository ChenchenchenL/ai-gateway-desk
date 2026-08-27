import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { execFile } from "child_process";

/**
 * Universal backend proxy middleware utilizing curl for 100% reliable network, proxy & SSL handling.
 */
function apiProxyPlugin(): Plugin {
  return {
    name: "api-proxy-plugin",
    configureServer(server) {
      server.middlewares.use("/__api_proxy", (req, res) => {
        const urlObj = new URL(req.url || "", `http://${req.headers.host}`);
        const targetUrl = urlObj.searchParams.get("url");

        if (!targetUrl) {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "Missing url parameter" }));
          return;
        }

        let authHeader = (req.headers["authorization"] as string) || "";
        const headersArgs: string[] = [
          "-H", "User-Agent: AI-Gateway-Desk-Web/0.1.0",
          "-H", "Accept: application/json, text/plain, */*",
        ];
        if (authHeader) {
          let token = authHeader.trim();
          if (token.toLowerCase().startsWith("bearer ")) {
            token = token.slice(7).trim();
          }
          if (
            (token.startsWith('"') && token.endsWith('"')) ||
            (token.startsWith("'") && token.endsWith("'")) ||
            (token.startsWith("`") && token.endsWith("`"))
          ) {
            token = token.slice(1, -1).trim();
          }
          if (token.toLowerCase().startsWith("bearer ")) {
            token = token.slice(7).trim();
          }
          if (token) {
            headersArgs.push("-H", `Authorization: Bearer ${token}`);
          }
        }

        execFile(
          "curl",
          ["-s", "-k", "-L", "-w", "\n__HTTP_CODE__:%{http_code}", ...headersArgs, targetUrl],
          { maxBuffer: 10 * 1024 * 1024 },
          (err, stdout, stderr) => {
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Content-Type", "application/json; charset=utf-8");

            if (err) {
              res.statusCode = 502;
              res.end(JSON.stringify({ error: stderr || err.message }));
              return;
            }

            const separatorIndex = stdout.lastIndexOf("\n__HTTP_CODE__:");
            if (separatorIndex >= 0) {
              const body = stdout.slice(0, separatorIndex);
              const statusCode = parseInt(stdout.slice(separatorIndex + "\n__HTTP_CODE__:".length).trim(), 10) || 200;
              res.statusCode = statusCode;
              res.end(body);
            } else {
              res.statusCode = 200;
              res.end(stdout);
            }
          }
        );
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
