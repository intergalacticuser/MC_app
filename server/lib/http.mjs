import { URL } from "node:url";

export function parseUrl(req) {
  const host = req.headers.host || "localhost";
  const proto = String(req.headers["x-forwarded-proto"] || "http");
  const url = new URL(req.url || "/", `${proto}://${host}`);
  return url;
}

export function isSecureRequest(req) {
  const xfProto = String(req.headers["x-forwarded-proto"] || "").toLowerCase();
  if (xfProto === "https") return true;
  // Node's http server won't have TLS info, but keep placeholder.
  return false;
}

export function sendJson(res, code, payload, extraHeaders = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.end(JSON.stringify(payload));
}

export function sendText(res, code, text, extraHeaders = {}) {
  res.statusCode = code;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
  res.end(String(text || ""));
}

export function parseCookies(req) {
  const header = String(req.headers.cookie || "");
  const out = {};
  header.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx < 0) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(val);
  });
  return out;
}

export function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(String(value || ""))}`];
  parts.push(`Path=${opts.path || "/"}`);
  if (opts.httpOnly !== false) parts.push("HttpOnly");
  parts.push(`SameSite=${opts.sameSite || "Lax"}`);
  if (opts.secure) parts.push("Secure");
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${Math.floor(opts.maxAge)}`);
  if (opts.expires) parts.push(`Expires=${opts.expires}`);
  const current = res.getHeader("Set-Cookie");
  const next = Array.isArray(current) ? [...current, parts.join("; ")] : current ? [current, parts.join("; ")] : [parts.join("; ")];
  res.setHeader("Set-Cookie", next);
}

export async function readBody(req, { maxBytes = 15 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", (chunk) => {
      total += chunk.length;
      if (total > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export function jsonFromBody(buf) {
  if (!buf || !buf.length) return {};
  const text = buf.toString("utf8");
  if (!text.trim()) return {};
  return JSON.parse(text);
}

