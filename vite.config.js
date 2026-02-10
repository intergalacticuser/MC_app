import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from "node:url";
import fs from "node:fs";
import path from "node:path";

const SHARED_DB_ROUTE = "/__mindcircle/local-db";
const SHARED_DB_FILE = fileURLToPath(new URL("./.mindcircle-shared-db.json", import.meta.url));

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sharedLocalDbPlugin() {
  return {
    name: "mindcircle-shared-local-db",
    configureServer(server) {
      server.middlewares.use(SHARED_DB_ROUTE, async (req, res) => {
        try {
          if (req.method === "GET") {
            const raw = fs.existsSync(SHARED_DB_FILE)
              ? fs.readFileSync(SHARED_DB_FILE, "utf8")
              : null;

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, raw }));
            return;
          }

          if (req.method === "PUT") {
            const body = await readRequestBody(req);
            const parsed = JSON.parse(body || "{}");
            const raw = typeof parsed.raw === "string" ? parsed.raw : "";
            if (!raw) {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ ok: false, error: "Missing raw payload" }));
              return;
            }

            // Validate before writing.
            JSON.parse(raw);
            fs.mkdirSync(path.dirname(SHARED_DB_FILE), { recursive: true });
            fs.writeFileSync(SHARED_DB_FILE, raw, "utf8");

            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (req.method === "DELETE") {
            if (fs.existsSync(SHARED_DB_FILE)) {
              fs.unlinkSync(SHARED_DB_FILE);
            }
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: error?.message || "Server error" }));
        }
      });
    }
  };
}

// https://vite.dev/config/
const appBase = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  base: appBase,
  plugins: [react(), sharedLocalDbPlugin()],
  server: {
    allowedHosts: [".ngrok-free.app", ".ngrok.app"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
