import crypto from "node:crypto";

const PASSWORD_KEYLEN = 64;
const PASSWORD_SALT_BYTES = 16;
const PASSWORD_ALGO = "scrypt-v1";

export function timingSafeEqualHex(a, b) {
  try {
    const ab = Buffer.from(String(a || ""), "hex");
    const bb = Buffer.from(String(b || ""), "hex");
    if (ab.length !== bb.length) return false;
    return crypto.timingSafeEqual(ab, bb);
  } catch {
    return false;
  }
}

export function hashPassword(password, saltHex = "") {
  const pwd = String(password || "");
  if (!pwd) throw new Error("Password is required");
  const salt = saltHex ? Buffer.from(String(saltHex), "hex") : crypto.randomBytes(PASSWORD_SALT_BYTES);
  const derived = crypto.scryptSync(pwd, salt, PASSWORD_KEYLEN);
  return {
    algo: PASSWORD_ALGO,
    salt_hex: salt.toString("hex"),
    hash_hex: derived.toString("hex")
  };
}

export function verifyPassword(password, record) {
  const pwd = String(password || "");
  if (!pwd) return false;
  const algo = String(record?.password_algo || record?.algo || "").trim();
  const saltHex = String(record?.password_salt || record?.salt_hex || "").trim();
  const hashHex = String(record?.password_hash || record?.hash_hex || "").trim();
  if (!algo || !saltHex || !hashHex) return false;
  if (algo !== PASSWORD_ALGO) return false;
  const computed = hashPassword(pwd, saltHex);
  return timingSafeEqualHex(computed.hash_hex, hashHex);
}

export function ensurePasswordHash(user) {
  if (!user || typeof user !== "object") return false;
  const already = Boolean(user.password_hash && user.password_salt && user.password_algo);
  if (already) return false;
  const plain = String(user.password || "").trim();
  if (!plain) return false;
  const { algo, salt_hex, hash_hex } = hashPassword(plain);
  user.password_algo = algo;
  user.password_salt = salt_hex;
  user.password_hash = hash_hex;
  delete user.password;
  return true;
}

export function setPassword(user, newPassword) {
  if (!user || typeof user !== "object") throw new Error("User is required");
  const pwd = String(newPassword || "");
  if (!pwd) throw new Error("Password is required");
  const { algo, salt_hex, hash_hex } = hashPassword(pwd);
  user.password_algo = algo;
  user.password_salt = salt_hex;
  user.password_hash = hash_hex;
  delete user.password;
  return true;
}

export function randomSessionId() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
}

export function pruneSessions(db, nowMs = Date.now()) {
  if (!db?.meta?.sessions) return;
  db.meta.sessions = db.meta.sessions.filter((s) => {
    const exp = Date.parse(String(s.expires_at || ""));
    return Number.isFinite(exp) && exp > nowMs;
  });
  // Prevent unbounded growth.
  if (db.meta.sessions.length > 5000) {
    db.meta.sessions = db.meta.sessions.slice(0, 5000);
  }
}

export function createSession(db, { userId, maxAgeSeconds, ip = "", userAgent = "" }) {
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000).toISOString();
  const id = randomSessionId();
  db.meta.sessions.unshift({
    id,
    user_id: userId,
    created_at: nowIso,
    expires_at: expiresAt,
    ip,
    user_agent: userAgent
  });
  pruneSessions(db);
  return { id, expires_at: expiresAt };
}

export function destroySession(db, sessionId) {
  if (!sessionId) return;
  if (!db?.meta?.sessions) return;
  db.meta.sessions = db.meta.sessions.filter((s) => String(s.id) !== String(sessionId));
}

export function getSessionUserId(db, sessionId) {
  if (!sessionId) return "";
  const sessions = db?.meta?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return "";
  const now = Date.now();
  const found = sessions.find((s) => String(s.id) === String(sessionId));
  if (!found) return "";
  const exp = Date.parse(String(found.expires_at || ""));
  if (!Number.isFinite(exp) || exp <= now) return "";
  return String(found.user_id || "");
}
