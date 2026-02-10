import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");
const distDir = process.env.DIST_DIR
  ? path.resolve(process.env.DIST_DIR)
  : path.join(appRoot, "dist");
const dataDir = process.env.DATA_DIR
  ? path.resolve(process.env.DATA_DIR)
  : path.join(appRoot, "data");
const dbFile = process.env.SHARED_DB_FILE
  ? path.resolve(process.env.SHARED_DB_FILE)
  : path.join(dataDir, "mindcircle-shared-db.json");
const port = Number(process.env.PORT || 80);
const host = process.env.HOST || "0.0.0.0";
const sharedDbRoute = "/__mindcircle/local-db";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2"
};

function sendJson(res, code, payload) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 15 * 1024 * 1024) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function safeResolveStaticPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const finalPath = path.join(distDir, normalized);
  if (!finalPath.startsWith(distDir)) return null;
  return finalPath;
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;

  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
  return true;
}

async function handleSharedDb(req, res) {
  try {
    if (req.method === "GET") {
      const raw = fs.existsSync(dbFile) ? fs.readFileSync(dbFile, "utf8") : null;
      sendJson(res, 200, { ok: true, raw });
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const parsed = JSON.parse(body || "{}");
      const raw = typeof parsed.raw === "string" ? parsed.raw : "";
      if (!raw) {
        sendJson(res, 400, { ok: false, error: "Missing raw payload" });
        return;
      }

      // Validate payload before storing.
      JSON.parse(raw);
      fs.mkdirSync(dataDir, { recursive: true });
      const tmpFile = `${dbFile}.tmp`;
      fs.writeFileSync(tmpFile, raw, "utf8");
      fs.renameSync(tmpFile, dbFile);
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === "DELETE") {
      if (fs.existsSync(dbFile)) {
        fs.unlinkSync(dbFile);
      }
      sendJson(res, 200, { ok: true });
      return;
    }

    sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error?.message || "Server error" });
  }
}

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || "/";
  const pathname = reqUrl.split("?")[0];

  if (pathname === "/health") {
    sendJson(res, 200, { ok: true, status: "healthy" });
    return;
  }

  if (pathname === sharedDbRoute) {
    await handleSharedDb(req, res);
    return;
  }

  // Static assets and SPA fallback.
  const staticPath = safeResolveStaticPath(pathname === "/" ? "/index.html" : pathname);
  if (staticPath && serveFile(res, staticPath)) return;

  const indexPath = path.join(distDir, "index.html");
  if (serveFile(res, indexPath)) return;

  sendJson(res, 404, { ok: false, error: "Not found" });
});

if (!fs.existsSync(distDir)) {
  console.error(`[mc-app] dist directory not found: ${distDir}`);
  process.exit(1);
}

server.listen(port, host, () => {
  console.log(`[mc-app] running on http://${host}:${port}`);
  console.log(`[mc-app] dist: ${distDir}`);
  console.log(`[mc-app] shared db file: ${dbFile}`);
});
