import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import {
  FileDb,
  ensureDbShape,
  ensureDefaultAdminAccount,
  ensureUserProfile,
  entityMap,
  adminOnlyEntities,
  matchesQuery,
  applySortingAndLimit,
  normalizeEmail,
  normalizeRole,
  isAdmin,
  randomId,
  stripPrivateUserFields
} from "./lib/db.mjs";
import {
  ensurePasswordHash,
  setPassword,
  verifyPassword,
  createSession,
  getSessionUserId,
  destroySession,
  pruneSessions
} from "./lib/auth.mjs";
import { parseUrl, isSecureRequest, sendJson, readBody, jsonFromBody, parseCookies, setCookie, sendText } from "./lib/http.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, "..");

const distDir = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.join(appRoot, "dist");
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(appRoot, "data");
const dbFile = process.env.SHARED_DB_FILE
  ? path.resolve(process.env.SHARED_DB_FILE)
  : path.join(dataDir, "mindcircle-shared-db.json");
const uploadDir = process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.join(dataDir, "uploads");

const port = Number(process.env.PORT || 80);
const host = process.env.HOST || "0.0.0.0";

const COOKIE_NAME = process.env.MC_SESSION_COOKIE || "mc_session";
const SESSION_MAX_AGE_SECONDS = Number(process.env.MC_SESSION_MAX_AGE_SECONDS || 60 * 60 * 24 * 14); // 14 days
const ALLOW_INSECURE_RESET_CODE = String(process.env.MC_ALLOW_INSECURE_RESET_CODE || "1") === "1";
const ALLOW_LEGACY_DB_ENDPOINT = String(process.env.MC_ALLOW_LEGACY_DB_ENDPOINT || "0") === "1";
const LEGACY_DB_ROUTE = "/__mindcircle/local-db";

const DOMAIN_CATEGORY_IDS = new Set([
  "love_relationships",
  "lifestyle_values",
  "cultural_taste",
  "hobbies_activities",
  "food_everyday_life"
]);

function normalizeDomainCategoryId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (DOMAIN_CATEGORY_IDS.has(raw)) return raw;
  const normalized = raw.replace(/[^a-z0-9_]/g, "_");
  return DOMAIN_CATEGORY_IDS.has(normalized) ? normalized : "";
}

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

function safeResolveUploadPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  const finalPath = path.join(uploadDir, normalized);
  if (!finalPath.startsWith(uploadDir)) return null;
  return finalPath;
}

function serveUpload(res, filePath) {
  if (!filePath) return false;
  if (!fs.existsSync(filePath)) return false;
  const stat = fs.statSync(filePath);
  if (!stat.isFile()) return false;
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function isLoopbackIp(ip) {
  const raw = String(ip || "");
  return raw === "127.0.0.1" || raw === "::1" || raw.startsWith("::ffff:127.0.0.1");
}

function nowIso() {
  return new Date().toISOString();
}

function safeString(value, { max = 20000 } = {}) {
  const text = String(value ?? "");
  if (!max || !Number.isFinite(max) || max <= 0) return text;
  return text.length > max ? text.slice(0, max) : text;
}

function normalizeOllamaMessages(input) {
  const raw = Array.isArray(input) ? input : [];
  return raw
    .map((m) => {
      const role = String(m?.role || "").trim();
      const content = String(m?.content || "");
      if (!role || !content) return null;
      if (role !== "system" && role !== "user" && role !== "assistant") return null;
      return { role, content: safeString(content, { max: 24000 }) };
    })
    .filter(Boolean)
    .slice(0, 32);
}

function parseJsonLoose(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  // Common patterns: fenced code blocks or leading chatter.
  const stripped = raw
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(stripped);
  } catch {
    // ignore
  }

  // Try to extract a JSON object/array substring.
  const firstObj = stripped.indexOf("{");
  const lastObj = stripped.lastIndexOf("}");
  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
    const slice = stripped.slice(firstObj, lastObj + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // ignore
    }
  }

  const firstArr = stripped.indexOf("[");
  const lastArr = stripped.lastIndexOf("]");
  if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
    const slice = stripped.slice(firstArr, lastArr + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // ignore
    }
  }

  return null;
}

function normalizeOllamaFormat(schema) {
  if (!schema || typeof schema !== "object") return "json";
  // Ensure it is serializable and not absurdly large.
  try {
    const s = JSON.stringify(schema);
    if (s && s.length <= 12000) return schema;
  } catch {
    // ignore
  }
  return "json";
}

async function callOllamaChat({ baseUrl, model, messages, format, options, timeoutMs } = {}) {
  if (typeof fetch !== "function") {
    throw new Error("Global fetch is not available; run this server on Node 18+ (or add a fetch polyfill).");
  }
  const root = String(baseUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
  const url = `${root}/api/chat`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs || 30000)));

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: String(model || "").trim() || "llama3.2:3b-instruct-q4_K_M",
        stream: false,
        messages: normalizeOllamaMessages(messages),
        ...(format ? { format } : {}),
        ...(options && typeof options === "object" ? { options } : {})
      }),
      signal: controller.signal
    });

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      // ignore
    }

    if (!res.ok) {
      const errMsg = json?.error || text || `Ollama request failed (${res.status})`;
      throw new Error(errMsg);
    }

    const content = json?.message?.content ?? "";
    return String(content || "").trim();
  } finally {
    clearTimeout(timeout);
  }
}

function randomTempPassword() {
  // Human-friendly-ish: 16 chars from URL-safe base64.
  const raw = crypto.randomBytes(12).toString("base64url");
  return `mc_${raw}`.slice(0, 16);
}

function appendActivityLog(db, entry) {
  db.activityLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
  db.activityLogs.unshift({
    id: randomId("activity"),
    created_date: nowIso(),
    ...(entry || {})
  });
  if (db.activityLogs.length > 5000) db.activityLogs = db.activityLogs.slice(0, 5000);
}

function appendAppLog(db, entry) {
  db.appLogs = Array.isArray(db.appLogs) ? db.appLogs : [];
  db.appLogs.unshift({
    id: randomId("applog"),
    created_date: nowIso(),
    ...(entry || {})
  });
  if (db.appLogs.length > 5000) db.appLogs = db.appLogs.slice(0, 5000);
}

function pushEvent(db, entity, type, id, data) {
  if (!db?.meta) db.meta = {};
  db.meta.event_seq = Number.isFinite(Number(db.meta.event_seq)) ? Number(db.meta.event_seq) : 0;
  db.meta.events = Array.isArray(db.meta.events) ? db.meta.events : [];

  db.meta.event_seq += 1;
  db.meta.events.push({
    seq: db.meta.event_seq,
    ts: nowIso(),
    entity,
    type,
    id,
    data
  });
  // keep last N
  if (db.meta.events.length > 4000) {
    db.meta.events = db.meta.events.slice(db.meta.events.length - 4000);
  }
}

function sanitizeEntityRecord(entityName, record, viewer) {
  if (!record) return null;
  const name = String(entityName || "");
  if (!viewer) return null;

  if (name === "User") {
    if (!isAdmin(viewer)) return null;
    return stripPrivateUserFields(record);
  }

  if (name === "Invite") {
    if (!isAdmin(viewer)) return null;
    return record;
  }

  if (name === "Message") {
    if (isAdmin(viewer)) return record;
    return record.from_user_id === viewer.id || record.to_user_id === viewer.id ? record : null;
  }

  if (name === "Notification") {
    if (isAdmin(viewer)) return record;
    return record.to_user_id === viewer.id ? record : null;
  }

  if (name === "Subscription" || name === "Stardust") {
    if (isAdmin(viewer)) return record;
    return record.user_id === viewer.id ? record : null;
  }

  if (name === "Match") {
    if (isAdmin(viewer)) return record;
    return record.from_user_id === viewer.id || record.to_user_id === viewer.id ? record : null;
  }

  if (name === "UserProfile" || name === "Interest" || name === "Pulse") {
    // Public entities (requires auth but not ownership)
    return record;
  }

  return record;
}

function ensureBadges(user) {
  if (!user.badges || typeof user.badges !== "object") user.badges = {};
  if (typeof user.badges.matching !== "number") user.badges.matching = 0;
  if (typeof user.badges.messages !== "number") user.badges.messages = 0;
  if (typeof user.badges.my_planet !== "number") user.badges.my_planet = 0;
}

function incrementBadge(user, key, amount = 1) {
  if (!user || !key) return;
  ensureBadges(user);
  const k = String(key);
  user.badges[k] = Number(user.badges[k] || 0) + Number(amount || 0);
}

function ensureDailyMetrics(user, dayKey) {
  if (!user.daily_metrics || typeof user.daily_metrics !== "object") user.daily_metrics = {};
  if (!user.daily_metrics[dayKey]) {
    user.daily_metrics[dayKey] = {
      profile_views: 0,
      category_interactions: 0,
      search_impressions: 0
    };
  }
  return user.daily_metrics[dayKey];
}

function getDayKey(iso = nowIso()) {
  return String(iso).slice(0, 10);
}

function ensureEntityName(entityName) {
  const name = String(entityName || "");
  if (!Object.prototype.hasOwnProperty.call(entityMap, name)) {
    const err = new Error(`Unknown entity: ${name}`);
    err.status = 400;
    throw err;
  }
  return name;
}

function requireAdmin(viewer) {
  if (!viewer || !isAdmin(viewer)) {
    const err = new Error("Admin role required");
    err.status = 403;
    throw err;
  }
}

function requireAuth(viewer) {
  if (!viewer) {
    const err = new Error("Authentication required");
    err.status = 401;
    throw err;
  }
}

function isOwnerForCreate(entityName, viewer, data) {
  const name = String(entityName);
  if (name === "Message") return String(data?.from_user_id || "") === viewer.id;
  if (name === "Notification") return true;
  if (name === "Pulse") return String(data?.user_id || "") === viewer.id;
  if (name === "Match") return String(data?.from_user_id || "") === viewer.id;
  if (name === "UserProfile" || name === "Interest" || name === "Subscription" || name === "Stardust") {
    return String(data?.user_id || "") === viewer.id;
  }
  return true;
}

function isOwnerForUpdate(entityName, viewer, record) {
  const name = String(entityName);
  if (name === "Message") return isAdmin(viewer) || record.from_user_id === viewer.id || record.to_user_id === viewer.id;
  if (name === "Notification") return isAdmin(viewer) || record.to_user_id === viewer.id;
  if (name === "Match") return isAdmin(viewer) || record.from_user_id === viewer.id || record.to_user_id === viewer.id;
  if (name === "UserProfile" || name === "Interest" || name === "Subscription" || name === "Stardust" || name === "Pulse") {
    return isAdmin(viewer) || record.user_id === viewer.id;
  }
  return isAdmin(viewer);
}

function sanitizeFilename(name) {
  const base = String(name || "upload.bin").split(/[\\/]/).pop() || "upload.bin";
  return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120) || "upload.bin";
}

const dbStore = new FileDb({ filePath: dbFile });

// One-time best-effort migration: hash any legacy plaintext passwords in the DB file.
try {
  await dbStore.mutate((db) => {
    ensureDefaultAdminAccount(db);
    let changed = false;
    db.users.forEach((user) => {
      changed = ensurePasswordHash(user) || changed;
    });
    if (changed) {
      // Do not emit events here; this is purely a security migration.
      db.meta = db.meta || {};
      db.meta.last_password_migration_at = nowIso();
    }
  });
} catch {
  // ignore migration errors; app can still run
}

async function getViewer(req) {
  const cookies = parseCookies(req);
  const sessionId = String(cookies[COOKIE_NAME] || "");
  const db = await dbStore.read();
  pruneSessions(db);
  const userId = getSessionUserId(db, sessionId);
  const viewer = db.users.find((u) => String(u.id) === userId && !u.disabled) || null;
  return { db, viewer, sessionId };
}

function setSessionCookie(res, req, sessionId) {
  const secure = isSecureRequest(req);
  setCookie(res, COOKIE_NAME, sessionId, { httpOnly: true, sameSite: "Lax", secure, maxAge: SESSION_MAX_AGE_SECONDS });
}

function clearSessionCookie(res, req) {
  const secure = isSecureRequest(req);
  setCookie(res, COOKIE_NAME, "", { httpOnly: true, sameSite: "Lax", secure, maxAge: 0 });
}

async function handleLegacyDb(req, res) {
  if (!ALLOW_LEGACY_DB_ENDPOINT) {
    sendJson(res, 404, { ok: false, error: "Not found" });
    return;
  }
  const remote = req.socket.remoteAddress || "";
  if (!isLoopbackIp(remote)) {
    sendJson(res, 403, { ok: false, error: "Forbidden" });
    return;
  }

  try {
    if (req.method === "GET") {
      const raw = fs.existsSync(dbFile) ? fs.readFileSync(dbFile, "utf8") : null;
      sendJson(res, 200, { ok: true, raw });
      return;
    }
    if (req.method === "PUT") {
      const body = await readBody(req);
      const parsed = jsonFromBody(body);
      const raw = typeof parsed.raw === "string" ? parsed.raw : "";
      if (!raw) {
        sendJson(res, 400, { ok: false, error: "Missing raw payload" });
        return;
      }
      JSON.parse(raw);
      fs.mkdirSync(dataDir, { recursive: true });
      const tmpFile = `${dbFile}.tmp`;
      fs.writeFileSync(tmpFile, raw, "utf8");
      fs.renameSync(tmpFile, dbFile);
      sendJson(res, 200, { ok: true });
      return;
    }
    if (req.method === "DELETE") {
      if (fs.existsSync(dbFile)) fs.unlinkSync(dbFile);
      sendJson(res, 200, { ok: true });
      return;
    }
    sendJson(res, 405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    sendJson(res, 500, { ok: false, error: err?.message || "Server error" });
  }
}

async function handleApi(req, res) {
  const url = parseUrl(req);
  const pathname = url.pathname;

  if (pathname === "/api/health") {
    sendJson(res, 200, { ok: true, status: "healthy" });
    return true;
  }

  if (pathname === "/api/events" && req.method === "GET") {
    const after = Number(url.searchParams.get("after") || 0);
    const { db, viewer } = await getViewer(req);
    if (!viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }
    const events = Array.isArray(db.meta?.events) ? db.meta.events : [];
    const filtered = events
      .filter((evt) => Number(evt.seq || 0) > after)
      .map((evt) => {
        const entity = String(evt.entity || "");
        const data = sanitizeEntityRecord(entity, evt.data, viewer);
        if (!data) return null;
        return {
          seq: Number(evt.seq || 0),
          ts: evt.ts,
          entity,
          type: evt.type,
          id: evt.id,
          data
        };
      })
      .filter(Boolean);

    sendJson(res, 200, { ok: true, events: filtered, latest_seq: Number(db.meta?.event_seq || 0) });
    return true;
  }

  if (pathname === "/api/me" && req.method === "GET") {
    const { viewer } = await getViewer(req);
    if (!viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }
    sendJson(res, 200, { ok: true, user: stripPrivateUserFields(viewer) });
    return true;
  }

  if (pathname === "/api/me" && req.method === "PATCH") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const userId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === userId && !u.disabled) || null;
      requireAuth(viewer);

      const allowed = { ...data };
      // Restrict role changes to admin.
      delete allowed.role;
      delete allowed._app_role;
      delete allowed.disabled;
      delete allowed.is_admin;

      Object.assign(viewer, allowed, { updated_date: nowIso() });
      // Normalize key categories to the allowed set.
      if (Array.isArray(viewer.key_interest_categories)) {
        viewer.key_interest_categories = viewer.key_interest_categories.map(normalizeDomainCategoryId).filter(Boolean);
        viewer.key_interest_categories = Array.from(new Set(viewer.key_interest_categories));
      }
      ensurePasswordHash(viewer);
      ensureUserProfile(db, viewer);

      pushEvent(db, "User", "update", viewer.id, stripPrivateUserFields(viewer));
      pushEvent(db, "UserProfile", "update", viewer.id, db.userProfiles.find((p) => p.user_id === viewer.id) || null);

      return { user: stripPrivateUserFields(viewer) };
    });

    sendJson(res, 200, { ok: true, user: result.result.user });
    return true;
  }

  if (pathname === "/api/me" && req.method === "DELETE") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    await dbStore.mutate((db) => {
      pruneSessions(db);
      const userId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === userId && !u.disabled) || null;
      requireAuth(viewer);

      if (isAdmin(viewer) && db.users.filter((u) => isAdmin(u) && !u.disabled).length <= 1) {
        const err = new Error("Cannot delete the last admin account");
        err.status = 400;
        throw err;
      }

      db.users = db.users.filter((u) => u.id !== viewer.id);
      db.userProfiles = db.userProfiles.filter((p) => p.user_id !== viewer.id);
      db.interests = db.interests.filter((i) => i.user_id !== viewer.id);
      db.messages = db.messages.filter((m) => m.from_user_id !== viewer.id && m.to_user_id !== viewer.id);
      db.notifications = db.notifications.filter((n) => n.from_user_id !== viewer.id && n.to_user_id !== viewer.id);
      db.matches = db.matches.filter((m) => m.from_user_id !== viewer.id && m.to_user_id !== viewer.id);
      db.pulses = db.pulses.filter((p) => p.user_id !== viewer.id);
      db.subscriptions = db.subscriptions.filter((s) => s.user_id !== viewer.id);
      db.stardust = db.stardust.filter((s) => s.user_id !== viewer.id);

      // Destroy current session
      destroySession(db, sessionId);
      clearSessionCookie(res, req);
      pushEvent(db, "User", "delete", viewer.id, { id: viewer.id });
      return { success: true };
    });
    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/me/clear-badge" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const key = String(payload?.key || "").trim();

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const userId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === userId && !u.disabled) || null;
      requireAuth(viewer);
      ensureBadges(viewer);
      if (key && Object.prototype.hasOwnProperty.call(viewer.badges, key)) {
        viewer.badges[key] = 0;
        viewer.updated_date = nowIso();
        ensureUserProfile(db, viewer);
        pushEvent(db, "User", "update", viewer.id, stripPrivateUserFields(viewer));
      }
      return { badges: viewer.badges };
    });

    sendJson(res, 200, { ok: true, success: true, badges: result.result.badges });
    return true;
  }

  if (pathname === "/api/me/change-password" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const currentPassword = String(payload?.currentPassword || payload?.current_password || "").trim();
    const newPassword = String(payload?.newPassword || payload?.new_password || "").trim();

    if (!currentPassword || !newPassword) {
      sendJson(res, 400, { ok: false, error: "Current password and new password are required" });
      return true;
    }
    if (newPassword.length < 8) {
      sendJson(res, 400, { ok: false, error: "New password must be at least 8 characters" });
      return true;
    }

    await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAuth(viewer);

      const ok =
        verifyPassword(currentPassword, viewer) ||
        (String(viewer.password || "").trim() && String(viewer.password || "").trim() === currentPassword);
      if (!ok) {
        const err = new Error("Current password is incorrect");
        err.status = 401;
        throw err;
      }

      setPassword(viewer, newPassword);
      viewer.must_change_password = false;
      viewer.updated_date = nowIso();
      ensureUserProfile(db, viewer);

      // Invalidate all other sessions for this user (keep current).
      if (db?.meta?.sessions) {
        db.meta.sessions = db.meta.sessions.filter((s) => String(s.user_id) !== String(viewer.id) || String(s.id) === String(sessionId));
      }

      pushEvent(db, "User", "update", viewer.id, stripPrivateUserFields(viewer));
    });

    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || "");

    if (!email || !password) {
      sendJson(res, 400, { ok: false, error: "Email and password are required" });
      return true;
    }

    const result = await dbStore.mutate((db) => {
      ensureDefaultAdminAccount(db);
      pruneSessions(db);

      const user = db.users.find((u) => normalizeEmail(u.email) === email && !u.disabled) || null;
      const ok =
        user &&
        (verifyPassword(password, user) ||
          (String(user.password || "").trim() && String(user.password || "").trim() === String(password).trim()));

      if (!ok) {
        const err = new Error("Invalid email or password");
        err.status = 401;
        throw err;
      }

      const changed = ensurePasswordHash(user);
      user.updated_date = nowIso();

      const sess = createSession(db, {
        userId: user.id,
        maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
        ip: String(req.socket.remoteAddress || ""),
        userAgent: String(req.headers["user-agent"] || "")
      });

      // Set cookie from the outer handler by returning value
      if (changed) {
        pushEvent(db, "User", "update", user.id, stripPrivateUserFields(user));
      }

      return { sessionId: sess.id, user: stripPrivateUserFields(user) };
    });

    setSessionCookie(res, req, result.result.sessionId);
    sendJson(res, 200, { ok: true, access_token: `session_${result.result.sessionId}`, user: result.result.user });
    return true;
  }

  if (pathname === "/api/auth/logout" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    await dbStore.mutate((db) => {
      destroySession(db, sessionId);
      return { ok: true };
    });
    clearSessionCookie(res, req);
    sendJson(res, 200, { ok: true });
    return true;
  }

  if (pathname === "/api/auth/register" && req.method === "POST") {
    const body = await readBody(req);
    const payload = jsonFromBody(body);

    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || "");
    const username = String(payload?.username || "").trim().toLowerCase();
    const firstName = String(payload?.first_name || "").trim();
    const lastName = String(payload?.last_name || "").trim();
    const phone = String(payload?.phone || "").trim();
    const ageConfirmed = payload?.age_confirmed === true;
    const termsAccepted = payload?.terms_accepted === true;

    if (!username || !firstName || !lastName || !email || !phone || !password) {
      sendJson(res, 400, { ok: false, error: "All registration fields are required" });
      return true;
    }
    if (!ageConfirmed) {
      sendJson(res, 400, { ok: false, error: "You must confirm age 18+" });
      return true;
    }
    if (!termsAccepted) {
      sendJson(res, 400, { ok: false, error: "You must accept Terms and Conditions" });
      return true;
    }
    if (password.length < 8) {
      sendJson(res, 400, { ok: false, error: "Password must be at least 8 characters" });
      return true;
    }

    const result = await dbStore.mutate((db) => {
      ensureDefaultAdminAccount(db);
      pruneSessions(db);

      if (db.users.some((u) => normalizeEmail(u.email) === email)) {
        const err = new Error("User already exists");
        err.status = 409;
        throw err;
      }
      if (db.users.some((u) => String(u.username || "").trim().toLowerCase() === username)) {
        const err = new Error("Username is already taken");
        err.status = 409;
        throw err;
      }

      const user = {
        id: randomId("user"),
        email,
        username,
        first_name: firstName,
        last_name: lastName,
        phone,
        full_name: `${firstName} ${lastName}`.trim(),
        role: "user",
        _app_role: "user",
        disabled: false,
        coins: 100,
        profile_photo: "",
        bio: "",
        quote: "",
        mood: "",
        background_url: "",
        premium_theme: "default",
        owned_themes: ["default"],
        key_interest_categories: [],
        is_premium: false,
        blocked_users: [],
        badges: { matching: 0, messages: 0, my_planet: 0 },
        oauth_accounts: [],
        auth_provider: "email",
        age_confirmed: true,
        terms_accepted: true,
        onboarding_completed: false,
        onboarding_required: true,
        onboarding_step: "profile_photo",
        tutorial_v2_step: "onboarding_pending",
        tutorial_completed: false,
        welcomed: true,
        daily_metrics: {},
        created_by: email,
        created_date: nowIso(),
        updated_date: nowIso(),
        password
      };
      ensurePasswordHash(user);
      db.users.push(user);
      ensureUserProfile(db, user);
      pushEvent(db, "User", "create", user.id, stripPrivateUserFields(user));
      const profile = db.userProfiles.find((p) => p.user_id === user.id);
      if (profile) pushEvent(db, "UserProfile", "create", profile.id, profile);

      const sess = createSession(db, {
        userId: user.id,
        maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
        ip: String(req.socket.remoteAddress || ""),
        userAgent: String(req.headers["user-agent"] || "")
      });
      return { sessionId: sess.id, user: stripPrivateUserFields(user) };
    });

    setSessionCookie(res, req, result.result.sessionId);
    sendJson(res, 200, { ok: true, success: true, user: result.result.user });
    return true;
  }

  if (pathname === "/api/auth/provider" && req.method === "POST") {
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const provider = String(payload?.provider || "").trim().toLowerCase();
    const email = normalizeEmail(payload?.email);
    if (!provider || (provider !== "google" && provider !== "apple")) {
      sendJson(res, 400, { ok: false, error: "Unsupported auth provider" });
      return true;
    }
    if (!email) {
      sendJson(res, 400, { ok: false, error: `Email is required for ${provider} sign in` });
      return true;
    }

    const firstName = String(payload?.first_name || "").trim();
    const lastName = String(payload?.last_name || "").trim();
    const phone = String(payload?.phone || "").trim();
    const username = String(payload?.username || "").trim().toLowerCase();
    const fullName = String(payload?.full_name || `${firstName} ${lastName}`.trim() || email.split("@")[0]).trim();

    const result = await dbStore.mutate((db) => {
      ensureDefaultAdminAccount(db);
      pruneSessions(db);

      let user = db.users.find((u) => normalizeEmail(u.email) === email) || null;
      let changedType = "update";

      if (user?.disabled) {
        const err = new Error("User account is disabled");
        err.status = 403;
        throw err;
      }

      if (!user) {
        changedType = "create";
        user = {
          id: randomId("user"),
          email,
          username,
          first_name: firstName,
          last_name: lastName,
          phone,
          full_name: fullName || email.split("@")[0],
          role: "user",
          _app_role: "user",
          disabled: false,
          coins: 100,
          profile_photo: "",
          bio: "",
          quote: "",
          mood: "",
          background_url: "",
          premium_theme: "default",
          owned_themes: ["default"],
          key_interest_categories: [],
          is_premium: false,
          blocked_users: [],
          badges: { matching: 0, messages: 0, my_planet: 0 },
          oauth_accounts: [provider],
          auth_provider: provider,
          age_confirmed: true,
          terms_accepted: true,
          onboarding_completed: false,
          onboarding_required: true,
          onboarding_step: "profile_photo",
          tutorial_v2_step: "onboarding_pending",
          tutorial_completed: false,
          welcomed: true,
          daily_metrics: {},
          created_by: email,
          created_date: nowIso(),
          updated_date: nowIso(),
          password: `oauth_${crypto.randomBytes(12).toString("hex")}`
        };
        ensurePasswordHash(user);
        db.users.push(user);
      } else {
        if (!user.first_name && firstName) user.first_name = firstName;
        if (!user.last_name && lastName) user.last_name = lastName;
        if (!user.phone && phone) user.phone = phone;
        if (!user.username && username) user.username = username;
        if (!user.full_name && fullName) user.full_name = fullName;
        user.updated_date = nowIso();
        user.oauth_accounts = Array.isArray(user.oauth_accounts) ? user.oauth_accounts : [];
        if (!user.oauth_accounts.includes(provider)) user.oauth_accounts.push(provider);
        user.auth_provider = provider;
      }

      ensureUserProfile(db, user);
      pushEvent(db, "User", changedType, user.id, stripPrivateUserFields(user));

      const sess = createSession(db, {
        userId: user.id,
        maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
        ip: String(req.socket.remoteAddress || ""),
        userAgent: String(req.headers["user-agent"] || "")
      });
      return { sessionId: sess.id, provider, is_new_user: changedType === "create", user: stripPrivateUserFields(user) };
    });

    setSessionCookie(res, req, result.result.sessionId);
    sendJson(res, 200, {
      ok: true,
      access_token: `session_${result.result.sessionId}`,
      provider: result.result.provider,
      is_new_user: result.result.is_new_user,
      user: result.result.user
    });
    return true;
  }

  if (pathname === "/api/auth/password/reset-request" && req.method === "POST") {
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const email = normalizeEmail(typeof payload === "string" ? payload : payload?.email);
    if (!email) {
      sendJson(res, 400, { ok: false, error: "Email is required" });
      return true;
    }

    const ttlMinutes = 15;
    const created = nowIso();
    const expires = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
    const code = String(Math.floor(100000 + Math.random() * 900000));

    await dbStore.mutate((db) => {
      ensureDefaultAdminAccount(db);
      const user = db.users.find((u) => normalizeEmail(u.email) === email && !u.disabled) || null;

      // prune old
      const nowMs = Date.now();
      db.passwordResetRequests = Array.isArray(db.passwordResetRequests) ? db.passwordResetRequests : [];
      db.passwordResetRequests = db.passwordResetRequests
        .filter((r) => Date.parse(String(r.expires_date || "")) > nowMs && !r.used)
        .slice(0, 200);

      if (!user) return;
      db.passwordResetRequests.unshift({
        id: randomId("pwdreset"),
        user_id: user.id,
        email,
        code,
        provider: user.auth_provider || "email",
        created_date: created,
        expires_date: expires,
        used: false
      });
    });

    sendJson(res, 200, {
      ok: true,
      success: true,
      message: "If this email exists, a reset code has been generated.",
      local_reset_code: ALLOW_INSECURE_RESET_CODE ? code : "",
      expires_in_minutes: ttlMinutes
    });
    return true;
  }

  if (pathname === "/api/auth/password/reset" && req.method === "POST") {
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const email = normalizeEmail(payload?.email);
    const code = String(payload?.code || payload?.otp || "").trim();
    const newPassword = String(payload?.newPassword || payload?.new_password || "").trim();
    if (!email || !code || !newPassword) {
      sendJson(res, 400, { ok: false, error: "Email, reset code and new password are required" });
      return true;
    }
    if (newPassword.length < 8) {
      sendJson(res, 400, { ok: false, error: "New password must be at least 8 characters" });
      return true;
    }

    await dbStore.mutate((db) => {
      ensureDefaultAdminAccount(db);
      const user = db.users.find((u) => normalizeEmail(u.email) === email && !u.disabled) || null;
      if (!user) {
        const err = new Error("Invalid reset code");
        err.status = 400;
        throw err;
      }
      const nowMs = Date.now();
      const reqRecord = (db.passwordResetRequests || []).find(
        (r) =>
          normalizeEmail(r.email) === email &&
          String(r.code || "").trim() === code &&
          !r.used &&
          Date.parse(String(r.expires_date || "")) > nowMs
      );
      if (!reqRecord) {
        const err = new Error("Invalid or expired reset code");
        err.status = 400;
        throw err;
      }
      user.password = newPassword;
      ensurePasswordHash(user);
      user.updated_date = nowIso();
      reqRecord.used = true;
      reqRecord.used_date = nowIso();
      ensureUserProfile(db, user);
      pushEvent(db, "User", "update", user.id, stripPrivateUserFields(user));
    });

    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/admin/invite" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const email = normalizeEmail(payload?.email);
    const role = normalizeRole(payload?.role || "user");
    if (!email) {
      sendJson(res, 400, { ok: false, error: "Email is required" });
      return true;
    }
    if (role !== "user" && role !== "admin") {
      sendJson(res, 400, { ok: false, error: "Role must be user or admin" });
      return true;
    }

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const userId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === userId && !u.disabled) || null;
      requireAdmin(viewer);

      let invitedUser = db.users.find((u) => normalizeEmail(u.email) === email) || null;
      let eventType = "update";
      if (invitedUser) {
        invitedUser.role = role;
        invitedUser._app_role = role;
        invitedUser.disabled = false;
        invitedUser.updated_date = nowIso();
      } else {
        eventType = "create";
        invitedUser = {
          id: randomId("user"),
          email,
          username: "",
          first_name: "",
          last_name: "",
          phone: "",
          full_name: email.split("@")[0],
          role,
          _app_role: role,
          disabled: false,
          coins: 100,
          profile_photo: "",
          bio: "",
          quote: "",
          mood: "",
          background_url: "",
          premium_theme: "default",
          owned_themes: ["default"],
          key_interest_categories: [],
          is_premium: false,
          blocked_users: [],
          badges: { matching: 0, messages: 0, my_planet: 0 },
          oauth_accounts: [],
          auth_provider: "email",
          onboarding_completed: false,
          onboarding_required: true,
          onboarding_step: "profile_photo",
          tutorial_v2_step: "onboarding_pending",
          tutorial_completed: false,
          welcomed: true,
          daily_metrics: {},
          created_by: viewer.email,
          created_date: nowIso(),
          updated_date: nowIso(),
          password: "welcome12345",
          invited: true
        };
        ensurePasswordHash(invitedUser);
        db.users.push(invitedUser);
      }

      ensureUserProfile(db, invitedUser);

      db.invites = Array.isArray(db.invites) ? db.invites : [];
      const invite = {
        id: randomId("invite"),
        email,
        user_id: invitedUser.id,
        role,
        invited_by: viewer.id,
        status: "sent",
        created_date: nowIso()
      };
      db.invites.unshift(invite);

      pushEvent(db, "User", eventType, invitedUser.id, stripPrivateUserFields(invitedUser));
      pushEvent(db, "Invite", "create", invite.id, invite);
      const profile = db.userProfiles.find((p) => p.user_id === invitedUser.id);
      if (profile) pushEvent(db, "UserProfile", "update", profile.id, profile);
      return { user: stripPrivateUserFields(invitedUser) };
    });

    sendJson(res, 200, { ok: true, success: true, user: result.result.user });
    return true;
  }

  if (pathname === "/api/admin/assume" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const targetId = String(payload?.userId || payload?.user_id || "").trim();
    if (!targetId) {
      sendJson(res, 400, { ok: false, error: "User ID is required" });
      return true;
    }

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAdmin(viewer);

      const target = db.users.find((u) => String(u.id) === targetId && !u.disabled) || null;
      if (!target) {
        const err = new Error("User not found");
        err.status = 404;
        throw err;
      }

      // Re-issue session for target.
      destroySession(db, sessionId);
      const sess = createSession(db, {
        userId: target.id,
        maxAgeSeconds: SESSION_MAX_AGE_SECONDS,
        ip: String(req.socket.remoteAddress || ""),
        userAgent: String(req.headers["user-agent"] || "")
      });
      return { sessionId: sess.id, user: stripPrivateUserFields(target) };
    });

    setSessionCookie(res, req, result.result.sessionId);
    sendJson(res, 200, { ok: true, user: result.result.user });
    return true;
  }

  if (pathname === "/api/admin/import-users" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req, { maxBytes: 25 * 1024 * 1024 });
    const payload = jsonFromBody(body);

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAdmin(viewer);

      const users = Array.isArray(payload?.users) ? payload.users : Array.isArray(payload) ? payload : [];
      const profiles = Array.isArray(payload?.profiles) ? payload.profiles : [];
      const interests = Array.isArray(payload?.interests) ? payload.interests : [];

      const profileByEmail = new Map();
      profiles.forEach((p) => {
        const e = normalizeEmail(p?.email || p?.user_email);
        if (e) profileByEmail.set(e, p);
      });

      const summary = { total: users.length, created: 0, updated: 0, importedInterests: 0, skipped: 0, errors: [] };

      users.forEach((entry, index) => {
        try {
          const rawUser = entry?.user && typeof entry.user === "object" ? entry.user : entry || {};
          const email = normalizeEmail(rawUser.email || entry?.email || entry?.profile?.email);
          if (!email) {
            summary.skipped += 1;
            return;
          }

          const importedProfile = (entry?.profile && typeof entry.profile === "object" ? entry.profile : null) || profileByEmail.get(email) || null;
          const role = normalizeRole(rawUser.role || rawUser._app_role || entry?.role || "user");
          const fullName = String(rawUser.full_name || rawUser.name || importedProfile?.full_name || importedProfile?.name || email.split("@")[0]).trim();

          const merged = {
            email,
            full_name: fullName || email.split("@")[0],
            username: String(rawUser.username || importedProfile?.username || "").trim(),
            first_name: String(rawUser.first_name || importedProfile?.first_name || "").trim(),
            last_name: String(rawUser.last_name || importedProfile?.last_name || "").trim(),
            phone: String(rawUser.phone || importedProfile?.phone || "").trim(),
            role,
            _app_role: role,
            disabled: false,
            coins: Number.isFinite(Number(rawUser.coins)) ? Number(rawUser.coins) : 100,
            profile_photo: String(rawUser.profile_photo || importedProfile?.profile_photo || "").trim(),
            bio: String(rawUser.bio || importedProfile?.bio || "").trim(),
            quote: String(rawUser.quote || importedProfile?.quote || "").trim(),
            mood: String(rawUser.mood || importedProfile?.mood || "").trim(),
            background_url: String(rawUser.background_url || importedProfile?.background_url || "").trim(),
            is_premium: Boolean(rawUser.is_premium ?? importedProfile?.is_premium),
            premium_theme: String(rawUser.premium_theme || importedProfile?.premium_theme || "default"),
            owned_themes: Array.isArray(rawUser.owned_themes || importedProfile?.owned_themes) ? (rawUser.owned_themes || importedProfile?.owned_themes) : ["default"],
            key_interest_categories: Array.isArray(rawUser.key_interest_categories || importedProfile?.key_interest_categories)
              ? (rawUser.key_interest_categories || importedProfile?.key_interest_categories).map(normalizeDomainCategoryId).filter(Boolean)
              : []
          };

          let target = db.users.find((u) => normalizeEmail(u.email) === email) || null;
          let type = "update";
          if (target) {
            Object.assign(target, merged, { updated_date: nowIso() });
            summary.updated += 1;
          } else {
            type = "create";
            target = {
              id: randomId("user"),
              coins: 100,
              profile_photo: "",
              bio: "",
              quote: "",
              mood: "",
              background_url: "",
              premium_theme: "default",
              owned_themes: ["default"],
              key_interest_categories: [],
              is_premium: false,
              blocked_users: [],
              badges: { matching: 0, messages: 0, my_planet: 0 },
              oauth_accounts: [],
              auth_provider: "email",
              onboarding_completed: false,
              onboarding_required: role !== "admin",
              onboarding_step: role === "admin" ? "completed" : "profile_photo",
              tutorial_v2_step: role === "admin" ? "completed" : "onboarding_pending",
              tutorial_completed: role === "admin",
              welcomed: role === "admin",
              daily_metrics: {},
              created_by: viewer.email,
              created_date: nowIso(),
              updated_date: nowIso(),
              password: String(rawUser.password || "welcome12345")
            };
            Object.assign(target, merged);
            ensurePasswordHash(target);
            db.users.push(target);
            summary.created += 1;
          }

          ensureUserProfile(db, target);
          pushEvent(db, "User", type, target.id, stripPrivateUserFields(target));

          const inlineInterests = Array.isArray(entry?.interests) ? entry.interests : [];
          const relevantInterests = [...inlineInterests, ...interests.filter((i) => String(i.user_id) === String(target.id) || normalizeEmail(i.user_email) === email)];
          relevantInterests.forEach((interest, idx2) => {
            const category = normalizeDomainCategoryId(String(interest?.category || interest?.type || "hobbies_activities"));
            const title = String(interest?.title || interest?.name || interest?.label || "").trim();
            if (!category || !title) return;
            const photoUrl = String(interest?.photo_url || interest?.photo || "").trim();
            const exists = db.interests.some((it) => it.user_id === target.id && it.category === category && it.title === title && String(it.photo_url || "") === photoUrl);
            if (exists) return;
            const record = {
              id: randomId("interest"),
              user_id: target.id,
              category,
              title,
              photo_url: photoUrl,
              description: String(interest?.description || "").trim(),
              position: Number.isFinite(Number(interest?.position)) ? Number(interest.position) : idx2 + 1,
              created_date: nowIso(),
              updated_date: nowIso(),
              created_by: viewer.email
            };
            db.interests.push(record);
            summary.importedInterests += 1;
            pushEvent(db, "Interest", "create", record.id, record);
          });
        } catch (err) {
          summary.errors.push({ index, email: entry?.email || entry?.user?.email || null, message: err?.message || "Import error" });
        }
      });

      return summary;
    });

    sendJson(res, 200, result.result);
    return true;
  }

  // Admin: reset a user's password (sets a new password and invalidates sessions)
  {
    const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/reset-password$/);
    if (match && req.method === "POST") {
      const targetId = String(match[1] || "").trim();
      const cookies = parseCookies(req);
      const sessionId = String(cookies[COOKIE_NAME] || "");
      const body = await readBody(req);
      const payload = jsonFromBody(body);
      const requestedPassword = String(payload?.password || "").trim();
      const returnPassword = payload?.return_password !== false;
      const requireChange = payload?.require_change !== false;

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAdmin(viewer);

        const target = db.users.find((u) => String(u.id) === targetId) || null;
        if (!target) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }

        const nextPassword = requestedPassword || randomTempPassword();
        setPassword(target, nextPassword);
        target.updated_date = nowIso();
        if (requireChange) target.must_change_password = true;
        ensureUserProfile(db, target);

        // Invalidate all sessions for this user (including the current one if admin reset self).
        db.meta.sessions = Array.isArray(db.meta.sessions) ? db.meta.sessions : [];
        db.meta.sessions = db.meta.sessions.filter((s) => String(s.user_id) !== String(target.id));

        appendActivityLog(db, {
          key: `admin_reset_password:${viewer.id}:${target.id}:${Date.now()}`,
          type: "admin_reset_password",
          actor_user_id: viewer.id,
          target_user_id: target.id,
          meta: { require_change: !!requireChange }
        });

        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
        return { user: stripPrivateUserFields(target), password: nextPassword };
      });

      sendJson(res, 200, {
        ok: true,
        success: true,
        user: result.result.user,
        temp_password: returnPassword ? result.result.password : ""
      });
      return true;
    }
  }

  // Admin: adjust coins for a user (delta can be negative)
  {
    const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/coins$/);
    if (match && req.method === "POST") {
      const targetId = String(match[1] || "").trim();
      const cookies = parseCookies(req);
      const sessionId = String(cookies[COOKIE_NAME] || "");
      const body = await readBody(req);
      const payload = jsonFromBody(body);
      const delta = Number(payload?.delta ?? payload?.amount ?? 0);
      const reason = String(payload?.reason || "").trim();

      if (!Number.isFinite(delta) || delta === 0) {
        sendJson(res, 400, { ok: false, error: "delta must be a non-zero number" });
        return true;
      }

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAdmin(viewer);

        const target = db.users.find((u) => String(u.id) === targetId) || null;
        if (!target) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }

        const before = Number(target.coins || 0);
        const next = Math.max(0, before + delta);
        target.coins = next;
        target.updated_date = nowIso();
        ensureUserProfile(db, target);

        appendActivityLog(db, {
          key: `admin_adjust_coins:${viewer.id}:${target.id}:${Date.now()}`,
          type: "admin_adjust_coins",
          actor_user_id: viewer.id,
          target_user_id: target.id,
          meta: { before, delta, after: next, reason }
        });

        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
        return { user: stripPrivateUserFields(target), before, after: next };
      });

      sendJson(res, 200, { ok: true, success: true, user: result.result.user, before: result.result.before, after: result.result.after });
      return true;
    }
  }

  // Admin: set premium flag for a user
  {
    const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/premium$/);
    if (match && req.method === "POST") {
      const targetId = String(match[1] || "").trim();
      const cookies = parseCookies(req);
      const sessionId = String(cookies[COOKIE_NAME] || "");
      const body = await readBody(req);
      const payload = jsonFromBody(body);
      const isPremium = Boolean(payload?.is_premium);
      const reason = String(payload?.reason || "").trim();

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAdmin(viewer);

        const target = db.users.find((u) => String(u.id) === targetId) || null;
        if (!target) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }

        const before = Boolean(target.is_premium);
        target.is_premium = isPremium;
        if (!target.premium_theme) target.premium_theme = "default";
        if (!Array.isArray(target.owned_themes) || target.owned_themes.length === 0) target.owned_themes = ["default"];
        target.updated_date = nowIso();
        ensureUserProfile(db, target);

        appendActivityLog(db, {
          key: `admin_set_premium:${viewer.id}:${target.id}:${Date.now()}`,
          type: "admin_set_premium",
          actor_user_id: viewer.id,
          target_user_id: target.id,
          meta: { before, after: isPremium, reason }
        });

        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
        return { user: stripPrivateUserFields(target), before, after: Boolean(target.is_premium) };
      });

      sendJson(res, 200, { ok: true, success: true, user: result.result.user, before: result.result.before, after: result.result.after });
      return true;
    }
  }

  // Admin: force onboarding for a user (will show onboarding again until completed)
  {
    const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/force-onboarding$/);
    if (match && req.method === "POST") {
      const targetId = String(match[1] || "").trim();
      const cookies = parseCookies(req);
      const sessionId = String(cookies[COOKIE_NAME] || "");

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAdmin(viewer);

        const target = db.users.find((u) => String(u.id) === targetId) || null;
        if (!target) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }

        target.onboarding_completed = false;
        target.onboarding_required = true;
        target.onboarding_step = "profile_photo";
        target.tutorial_v2_step = "onboarding_pending";
        target.tutorial_completed = false;
        target.welcomed = false;
        target.updated_date = nowIso();
        ensureUserProfile(db, target);

        appendActivityLog(db, {
          key: `admin_force_onboarding:${viewer.id}:${target.id}:${Date.now()}`,
          type: "admin_force_onboarding",
          actor_user_id: viewer.id,
          target_user_id: target.id
        });

        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
        return { user: stripPrivateUserFields(target) };
      });

      sendJson(res, 200, { ok: true, success: true, user: result.result.user });
      return true;
    }
  }

  // Admin: clear a user's content (interests/matches/notifications) to avoid taxonomy conflicts
  {
    const match = pathname.match(/^\/api\/admin\/users\/([^/]+)\/clear-content$/);
    if (match && req.method === "POST") {
      const targetId = String(match[1] || "").trim();
      const cookies = parseCookies(req);
      const sessionId = String(cookies[COOKIE_NAME] || "");

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAdmin(viewer);

        const target = db.users.find((u) => String(u.id) === targetId) || null;
        if (!target) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }

        const before = {
          interests: db.interests.length,
          matches: db.matches.length,
          notifications: db.notifications.length
        };

        db.interests = db.interests.filter((i) => String(i.user_id) !== String(target.id));
        db.matches = db.matches.filter((m) => String(m.from_user_id) !== String(target.id) && String(m.to_user_id) !== String(target.id));
        db.notifications = db.notifications.filter((n) => String(n.from_user_id) !== String(target.id) && String(n.to_user_id) !== String(target.id));

        target.key_interest_categories = [];
        target.onboarding_completed = false;
        target.onboarding_required = true;
        target.onboarding_step = "profile_photo";
        target.tutorial_v2_step = "onboarding_pending";
        target.tutorial_completed = false;
        target.welcomed = false;
        target.updated_date = nowIso();
        ensureUserProfile(db, target);

        appendActivityLog(db, {
          key: `admin_clear_user_content:${viewer.id}:${target.id}:${Date.now()}`,
          type: "admin_clear_user_content",
          actor_user_id: viewer.id,
          target_user_id: target.id,
          meta: { before }
        });

        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
        pushEvent(db, "UserProfile", "update", target.id, db.userProfiles.find((p) => p.user_id === target.id) || null);
        return { user: stripPrivateUserFields(target) };
      });

      sendJson(res, 200, { ok: true, success: true, user: result.result.user });
      return true;
    }
  }

  // Admin: bulk clear content for all users
  if (pathname === "/api/admin/bulk/clear-content" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");

    const result = await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAdmin(viewer);

      const before = {
        interests: db.interests.length,
        matches: db.matches.length,
        notifications: db.notifications.length
      };

      db.interests = [];
      db.matches = [];
      db.notifications = [];
      db.meta.events = [];
      db.meta.event_seq = 0;

      db.users.forEach((u) => {
        if (isAdmin(u)) return;
        u.key_interest_categories = [];
        u.onboarding_completed = false;
        u.onboarding_required = true;
        u.onboarding_step = "profile_photo";
        u.tutorial_v2_step = "onboarding_pending";
        u.tutorial_completed = false;
        u.welcomed = false;
        u.updated_date = nowIso();
        ensureUserProfile(db, u);
      });

      appendActivityLog(db, {
        key: `admin_bulk_clear_content:${viewer.id}:${Date.now()}`,
        type: "admin_bulk_clear_content",
        actor_user_id: viewer.id,
        meta: { before }
      });

      return { before, users: db.users.length };
    });

    sendJson(res, 200, { ok: true, success: true, before: result.result.before, users: result.result.users });
    return true;
  }

  // Admin: read logs/events for debugging
  if (pathname === "/api/admin/logs" && req.method === "GET") {
    const { viewer, db } = await getViewer(req);
    requireAdmin(viewer);
    const kind = String(url.searchParams.get("kind") || "app").trim();
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") || 200)));
    const userId = String(url.searchParams.get("userId") || "").trim();

    if (kind === "app") {
      const rows = (Array.isArray(db.appLogs) ? db.appLogs : []).filter((l) => !userId || String(l.user_id) === userId).slice(0, limit);
      sendJson(res, 200, { ok: true, kind, items: rows });
      return true;
    }
    if (kind === "activity") {
      const rows = (Array.isArray(db.activityLogs) ? db.activityLogs : []).filter((l) => !userId || String(l.actor_user_id) === userId || String(l.target_user_id) === userId).slice(0, limit);
      sendJson(res, 200, { ok: true, kind, items: rows });
      return true;
    }
    if (kind === "pwdreset") {
      const rows = (Array.isArray(db.passwordResetRequests) ? db.passwordResetRequests : []).filter((l) => !userId || String(l.user_id) === userId).slice(0, limit);
      sendJson(res, 200, { ok: true, kind, items: rows });
      return true;
    }

    sendJson(res, 400, { ok: false, error: "Unknown kind. Use app|activity|pwdreset" });
    return true;
  }

  if (pathname === "/api/admin/events" && req.method === "GET") {
    const { viewer, db } = await getViewer(req);
    requireAdmin(viewer);
    const limit = Math.max(1, Math.min(1000, Number(url.searchParams.get("limit") || 200)));
    const entityFilter = String(url.searchParams.get("entity") || "").trim();
    const typeFilter = String(url.searchParams.get("type") || "").trim();

    const events = Array.isArray(db.meta?.events) ? db.meta.events : [];
    const filtered = events
      .filter((evt) => (entityFilter ? String(evt.entity || "") === entityFilter : true))
      .filter((evt) => (typeFilter ? String(evt.type || "") === typeFilter : true))
      .slice(Math.max(0, events.length - limit))
      .map((evt) => {
        const entity = String(evt.entity || "");
        return {
          seq: Number(evt.seq || 0),
          ts: evt.ts,
          entity,
          type: evt.type,
          id: evt.id,
          data: sanitizeEntityRecord(entity, evt.data, viewer)
        };
      });

    sendJson(res, 200, { ok: true, items: filtered, latest_seq: Number(db.meta?.event_seq || 0) });
    return true;
  }

  if (pathname === "/api/app-logs" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const pageName = String(payload?.pageName || "").trim();
    if (!pageName) {
      sendJson(res, 400, { ok: false, error: "pageName is required" });
      return true;
    }

    await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAuth(viewer);
      appendAppLog(db, {
        page: pageName,
        user_id: viewer.id
      });
    });

    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/integrations/llm" && req.method === "POST") {
    const { viewer } = await getViewer(req);
    if (!viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }
    const body = await readBody(req);
    const payload = jsonFromBody(body);

    const provider = String(process.env.MC_LLM_PROVIDER || process.env.MC_LLM_MODE || "stub").trim().toLowerCase();
    const prompt = String(payload?.prompt || "").trim();
    const messagesInput = normalizeOllamaMessages(payload?.messages);
    const wantsJson = Boolean(payload?.response_json_schema);

    // Build role messages. If caller provided messages, respect them; otherwise wrap prompt.
    let messages = messagesInput.length
      ? messagesInput
      : prompt
        ? [{ role: "user", content: safeString(prompt, { max: 24000 }) }]
        : [];

    if (!messages.length) {
      sendJson(res, 400, { ok: false, error: "prompt or messages is required" });
      return true;
    }

    if (provider === "ollama") {
      try {
        const baseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim();
        const model = String(payload?.model || process.env.OLLAMA_MODEL || "llama3.2:3b-instruct-q4_K_M").trim();
        const timeoutMs = Number(process.env.OLLAMA_TIMEOUT_MS || 30000);

        if (wantsJson) {
          const schema = safeString(JSON.stringify(payload.response_json_schema), { max: 12000 });
          const sys = {
            role: "system",
            content: `Return ONLY valid JSON (no markdown, no extra text) matching this JSON schema: ${schema}`
          };
          messages = [sys, ...messages];
        }

        const content = await callOllamaChat({
          baseUrl,
          model,
          messages,
          format: wantsJson ? normalizeOllamaFormat(payload?.response_json_schema) : undefined,
          options: payload?.options && typeof payload.options === "object" ? payload.options : undefined,
          timeoutMs
        });

        if (wantsJson) {
          const parsed = parseJsonLoose(content);
          sendJson(res, 200, { ok: true, result: parsed ?? content });
          return true;
        }

        sendJson(res, 200, { ok: true, result: content });
        return true;
      } catch (err) {
        sendJson(res, 502, { ok: false, error: err?.message || "LLM provider error" });
        return true;
      }
    }

    // Stubbed response (default).
    const lower = prompt.toLowerCase();
    if (wantsJson) {
      sendJson(res, 200, {
        ok: true,
        result: {
          user_id: "",
          match_score: 0,
          matching_categories: [],
          compatibility_factors: { interests: 0, mood: 0, values: 0, interaction: 0 },
          reason: "LLM integration not configured yet."
        }
      });
      return true;
    }

    if (lower.includes("bio")) {
      sendJson(res, 200, { ok: true, result: "Explorer of ideas and people." });
      return true;
    }
    if (lower.includes("motto") || lower.includes("quote")) {
      sendJson(res, 200, { ok: true, result: "Build meaningful circles, one honest connection at a time." });
      return true;
    }

    sendJson(res, 200, { ok: true, result: "MindCircle server LLM stub response." });
    return true;
  }

  if (pathname === "/api/integrations/llm/health" && req.method === "GET") {
    const { viewer } = await getViewer(req);
    if (!viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }

    const provider = String(process.env.MC_LLM_PROVIDER || process.env.MC_LLM_MODE || "stub").trim().toLowerCase();
    const baseUrl = String(process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434").trim();
    const model = String(process.env.OLLAMA_MODEL || "llama3.2:3b-instruct-q4_K_M").trim();

    if (provider !== "ollama") {
      sendJson(res, 200, { ok: true, provider, healthy: true, note: "LLM provider is not ollama." });
      return true;
    }

    try {
      // Quick ping (minimal cost).
      const content = await callOllamaChat({
        baseUrl,
        model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        options: { temperature: 0 },
        timeoutMs: Number(process.env.OLLAMA_TIMEOUT_MS || 8000)
      });
      const healthy = String(content || "").trim().toUpperCase().includes("OK");
      sendJson(res, 200, { ok: true, provider, baseUrl, model, healthy, sample: safeString(content, { max: 200 }) });
      return true;
    } catch (err) {
      sendJson(res, 200, { ok: true, provider, baseUrl, model, healthy: false, error: err?.message || "Unknown error" });
      return true;
    }
  }

  if (pathname === "/api/uploads" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const viewerState = await getViewer(req);
    if (!viewerState.viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }

    const filename = sanitizeFilename(req.headers["x-filename"]);
    const ext = path.extname(filename) || "";
    const id = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
    const storedName = `${id}${ext || ".bin"}`;
    const storedPath = path.join(uploadDir, storedName);

    const buf = await readBody(req, { maxBytes: 10 * 1024 * 1024 });
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.writeFileSync(storedPath, buf);

    sendJson(res, 200, { ok: true, file_url: `/uploads/${encodeURIComponent(storedName)}` });
    return true;
  }

  if (pathname.startsWith("/api/entities/")) {
    const parts = pathname.split("/").filter(Boolean);
    const entityName = ensureEntityName(parts[2]);
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");

    // Admin-only entities are gated even for reads
    const { viewer } = await getViewer(req);
    if (!viewer) {
      sendJson(res, 401, { ok: false, error: "Authentication required" });
      return true;
    }
    if (adminOnlyEntities.has(entityName) && !isAdmin(viewer)) {
      sendJson(res, 403, { ok: false, error: "Admin role required" });
      return true;
    }

    const collectionKey = entityMap[entityName];

    if (req.method === "GET" && parts.length === 3) {
      const sortBy = url.searchParams.get("sortBy") || "";
      const limitRaw = url.searchParams.get("limit");
      const limit = limitRaw ? Number(limitRaw) : undefined;

      const db = await dbStore.read();
      const rows = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
      const sorted = applySortingAndLimit(rows, sortBy, Number.isFinite(limit) ? limit : undefined);
      const items = sorted.map((r) => sanitizeEntityRecord(entityName, r, viewer)).filter(Boolean);
      sendJson(res, 200, { ok: true, items });
      return true;
    }

    if (req.method === "POST" && parts.length === 4 && parts[3] === "filter") {
      const body = await readBody(req);
      const payload = jsonFromBody(body);
      const query = payload?.query && typeof payload.query === "object" ? payload.query : {};
      const sortBy = String(payload?.sortBy || "");
      const limit = payload?.limit === null ? undefined : Number(payload?.limit);

      const db = await dbStore.read();
      const rows = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
      const filtered = rows.filter((r) => matchesQuery(r, query));
      const sorted = applySortingAndLimit(filtered, sortBy, Number.isFinite(limit) ? limit : undefined);
      const items = sorted.map((r) => sanitizeEntityRecord(entityName, r, viewer)).filter(Boolean);
      sendJson(res, 200, { ok: true, items });
      return true;
    }

    if (req.method === "POST" && parts.length === 3) {
      const body = await readBody(req);
      const payload = jsonFromBody(body);
      const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer2 = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAuth(viewer2);
        if (adminOnlyEntities.has(entityName)) requireAdmin(viewer2);
        if (!isOwnerForCreate(entityName, viewer2, data) && !isAdmin(viewer2)) {
          const err = new Error("Not allowed");
          err.status = 403;
          throw err;
        }

        const now = nowIso();
        const base = {
          id: randomId(entityName.toLowerCase()),
          created_date: now,
          updated_date: now,
          created_by: viewer2.email
        };
        const next = { ...base, ...data };

        // Normalize some fields
        if (entityName === "Interest") {
          next.category = normalizeDomainCategoryId(next.category);
          if (!next.category) {
            const err = new Error("Invalid category. Use one of the 5 Core Domains.");
            err.status = 400;
            throw err;
          }
        }
        if (entityName === "Message") {
          next.from_user_id = String(next.from_user_id || viewer2.id);
          if (next.from_user_id !== viewer2.id && !isAdmin(viewer2)) {
            const err = new Error("Not allowed");
            err.status = 403;
            throw err;
          }
        }
        if (entityName === "Notification") {
          if (!next.from_user_id) next.from_user_id = viewer2.id;
          if (next.badge_key && next.to_user_id) {
            const recipient = db.users.find((u) => u.id === next.to_user_id);
            if (recipient && !recipient.disabled) incrementBadge(recipient, next.badge_key, 1);
          }
        }

        db[collectionKey] = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
        db[collectionKey].push(next);
        if (entityName === "UserProfile" && next.user_id) {
          const u = db.users.find((u) => u.id === next.user_id);
          if (u) ensureUserProfile(db, u);
        }

        // Store raw event data; /api/events will filter/sanitize per viewer.
        pushEvent(db, entityName, "create", next.id, entityName === "User" ? stripPrivateUserFields(next) : next);
        return { item: sanitizeEntityRecord(entityName, next, viewer2) };
      });

      sendJson(res, 200, { ok: true, item: result.result.item });
      return true;
    }

    if ((req.method === "PATCH" || req.method === "DELETE") && parts.length === 4) {
      const id = parts[3];

      if (req.method === "PATCH") {
        const body = await readBody(req);
        const payload = jsonFromBody(body);
        const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

        const result = await dbStore.mutate((db) => {
          pruneSessions(db);
          const viewerId2 = getSessionUserId(db, sessionId);
          const viewer3 = db.users.find((u) => String(u.id) === viewerId2 && !u.disabled) || null;
          requireAuth(viewer3);
          if (adminOnlyEntities.has(entityName)) requireAdmin(viewer3);

          db[collectionKey] = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
          const target = db[collectionKey].find((r) => String(r.id) === String(id)) || null;
          if (!target) {
            const err = new Error(`${entityName} record not found: ${id}`);
            err.status = 404;
            throw err;
          }
          if (!isOwnerForUpdate(entityName, viewer3, target)) {
            const err = new Error("Not allowed");
            err.status = 403;
            throw err;
          }

          Object.assign(target, data, { updated_date: nowIso() });
          if (entityName === "Interest" && Object.prototype.hasOwnProperty.call(data, "category")) {
            target.category = normalizeDomainCategoryId(target.category);
            if (!target.category) {
              const err = new Error("Invalid category. Use one of the 5 Core Domains.");
              err.status = 400;
              throw err;
            }
          }
          if (entityName === "User") {
            // Normalize role fields
            const role = normalizeRole(target.role || target._app_role || "user");
            target.role = role;
            target._app_role = role;
            ensurePasswordHash(target);
            ensureUserProfile(db, target);
          }
          if (entityName === "UserProfile" && target.user_id) {
            const u = db.users.find((u) => u.id === target.user_id);
            if (u) ensureUserProfile(db, u);
          }

          pushEvent(db, entityName, "update", target.id, entityName === "User" ? stripPrivateUserFields(target) : target);
          return { item: sanitizeEntityRecord(entityName, target, viewer3) };
        });

        sendJson(res, 200, { ok: true, item: result.result.item });
        return true;
      }

      // DELETE
      const result = await dbStore.mutate((db) => {
        pruneSessions(db);
        const viewerId = getSessionUserId(db, sessionId);
        const viewer2 = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
        requireAuth(viewer2);
        if (adminOnlyEntities.has(entityName)) requireAdmin(viewer2);

        db[collectionKey] = Array.isArray(db[collectionKey]) ? db[collectionKey] : [];
        const idx = db[collectionKey].findIndex((r) => String(r.id) === String(id));
        if (idx < 0) {
          const err = new Error(`${entityName} record not found: ${id}`);
          err.status = 404;
          throw err;
        }
        const current = db[collectionKey][idx];
        if (!isOwnerForUpdate(entityName, viewer2, current)) {
          const err = new Error("Not allowed");
          err.status = 403;
          throw err;
        }

        const removed = db[collectionKey].splice(idx, 1)[0];
        pushEvent(db, entityName, "delete", removed.id, entityName === "User" ? stripPrivateUserFields(removed) : removed);
        return { item: sanitizeEntityRecord(entityName, removed, viewer2) };
      });

      sendJson(res, 200, { ok: true, item: result.result.item });
      return true;
    }

    sendJson(res, 405, { ok: false, error: "Method not allowed" });
    return true;
  }

  if (pathname === "/api/track/profile-view" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const targetUserId = String(payload?.targetUserId || "").trim();
    if (!targetUserId) {
      sendJson(res, 400, { ok: false, error: "targetUserId is required" });
      return true;
    }
    await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAuth(viewer);
      const target = db.users.find((u) => String(u.id) === targetUserId && !u.disabled) || null;
      if (!target || target.id === viewer.id) return;

      const dayKey = getDayKey();
      const metrics = ensureDailyMetrics(target, dayKey);
      metrics.profile_views += 1;
      target.updated_date = nowIso();

      const notification = {
        id: randomId("notification"),
        type: "profile_view",
        from_user_id: viewer.id,
        to_user_id: target.id,
        badge_key: "my_planet",
        text: `${viewer.full_name} viewed your planet.`,
        is_read: false,
        created_date: nowIso(),
        updated_date: nowIso()
      };
      db.notifications.unshift(notification);
      incrementBadge(target, "my_planet", 1);

      pushEvent(db, "Notification", "create", notification.id, notification);
      pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
    });
    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/track/profile-interaction" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const targetUserId = String(payload?.targetUserId || "").trim();
    const categoryId = String(payload?.categoryId || "").trim();
    if (!targetUserId) {
      sendJson(res, 400, { ok: false, error: "targetUserId is required" });
      return true;
    }
    await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAuth(viewer);
      const target = db.users.find((u) => String(u.id) === targetUserId && !u.disabled) || null;
      if (!target || target.id === viewer.id) return;

      const dayKey = getDayKey();
      const metrics = ensureDailyMetrics(target, dayKey);
      metrics.category_interactions += 1;
      target.updated_date = nowIso();

      const notification = {
        id: randomId("notification"),
        type: "profile_interaction",
        from_user_id: viewer.id,
        to_user_id: target.id,
        badge_key: "my_planet",
        text: `${viewer.full_name} interacted with your ${categoryId || "profile"} category.`,
        is_read: false,
        created_date: nowIso(),
        updated_date: nowIso()
      };
      db.notifications.unshift(notification);
      incrementBadge(target, "my_planet", 1);

      pushEvent(db, "Notification", "create", notification.id, notification);
      pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
    });
    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  if (pathname === "/api/track/search-impressions" && req.method === "POST") {
    const cookies = parseCookies(req);
    const sessionId = String(cookies[COOKIE_NAME] || "");
    const body = await readBody(req);
    const payload = jsonFromBody(body);
    const userIds = Array.isArray(payload?.userIds) ? payload.userIds.map((x) => String(x)) : [];

    await dbStore.mutate((db) => {
      pruneSessions(db);
      const viewerId = getSessionUserId(db, sessionId);
      const viewer = db.users.find((u) => String(u.id) === viewerId && !u.disabled) || null;
      requireAuth(viewer);
      const dayKey = getDayKey();

      db.activityLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
      userIds.forEach((targetUserId) => {
        if (!targetUserId || targetUserId === viewer.id) return;
        const target = db.users.find((u) => String(u.id) === targetUserId && !u.disabled) || null;
        if (!target) return;

        const logKey = `search_impression:${viewer.id}:${target.id}:${dayKey}`;
        const exists = db.activityLogs.some((l) => l.key === logKey);
        if (exists) return;

        db.activityLogs.unshift({
          id: randomId("activity"),
          key: logKey,
          type: "search_impression",
          actor_user_id: viewer.id,
          target_user_id: target.id,
          created_date: nowIso()
        });
        const metrics = ensureDailyMetrics(target, dayKey);
        metrics.search_impressions += 1;
        target.updated_date = nowIso();
        pushEvent(db, "User", "update", target.id, stripPrivateUserFields(target));
      });

      if (db.activityLogs.length > 5000) db.activityLogs = db.activityLogs.slice(0, 5000);
    });

    sendJson(res, 200, { ok: true, success: true });
    return true;
  }

  return false;
}

const server = http.createServer(async (req, res) => {
  const reqUrl = req.url || "/";
  const pathname = reqUrl.split("?")[0];

  try {
    if (pathname === "/health") {
      sendJson(res, 200, { ok: true, status: "healthy" });
      return;
    }

    if (pathname === LEGACY_DB_ROUTE) {
      await handleLegacyDb(req, res);
      return;
    }

    if (pathname.startsWith("/api/")) {
      const handled = await handleApi(req, res);
      if (handled) return;
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    if (pathname.startsWith("/uploads/")) {
      const uploadPath = safeResolveUploadPath(pathname.replace("/uploads/", "/"));
      if (uploadPath && serveUpload(res, uploadPath)) return;
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    // Static assets and SPA fallback.
    const staticPath = safeResolveStaticPath(pathname === "/" ? "/index.html" : pathname);
    if (staticPath && serveFile(res, staticPath)) return;

    const indexPath = path.join(distDir, "index.html");
    if (serveFile(res, indexPath)) return;

    sendText(res, 404, "Not found");
  } catch (err) {
    const status = Number(err?.status || 500);
    sendJson(res, status, { ok: false, error: err?.message || "Server error" });
  }
});

if (!fs.existsSync(distDir)) {
  console.error(`[mc-app] dist directory not found: ${distDir}`);
  process.exit(1);
}

server.listen(port, host, () => {
  console.log(`[mc-app] running on http://${host}:${port}`);
  console.log(`[mc-app] dist: ${distDir}`);
  console.log(`[mc-app] db file: ${dbFile}`);
  console.log(`[mc-app] uploads: ${uploadDir}`);
});
