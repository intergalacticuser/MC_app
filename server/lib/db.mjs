import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DOMAIN_CATEGORY_IDS = new Set([
  "love_relationships",
  "lifestyle_values",
  "cultural_taste",
  "hobbies_activities",
  "food_everyday_life"
]);

export function randomId(prefix = "id") {
  const suffix = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex");
  return `${prefix}_${suffix}`;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function normalizeRole(role) {
  return String(role || "").trim().toLowerCase() || "user";
}

export function isAdmin(user) {
  const role = normalizeRole(user?.role || user?._app_role);
  return role === "admin" || user?.is_admin === true;
}

function toStringValue(value, fallback = "") {
  const s = String(value ?? "").trim();
  return s ? s : fallback;
}

function normalizeDomainCategoryId(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (DOMAIN_CATEGORY_IDS.has(raw)) return raw;
  // Allow older display names to pass through if already normalized elsewhere.
  return DOMAIN_CATEGORY_IDS.has(raw.replace(/[^a-z0-9_]/g, "_")) ? raw.replace(/[^a-z0-9_]/g, "_") : "";
}

function normalizeDomainCategoryArray(list, fallback = []) {
  if (!Array.isArray(list)) return fallback;
  const out = [];
  for (const item of list) {
    const id = normalizeDomainCategoryId(item);
    if (id && !out.includes(id)) out.push(id);
  }
  return out;
}

function ensureUserEngagementShape(user) {
  if (!user || typeof user !== "object") return;
  if (!user.badges || typeof user.badges !== "object") {
    user.badges = { matching: 0, messages: 0, my_planet: 0 };
  } else {
    if (typeof user.badges.matching !== "number") user.badges.matching = 0;
    if (typeof user.badges.messages !== "number") user.badges.messages = 0;
    if (typeof user.badges.my_planet !== "number") user.badges.my_planet = 0;
  }
  if (!user.daily_metrics || typeof user.daily_metrics !== "object") {
    user.daily_metrics = {};
  }
}

function isOnboardingCompleteForUser(user) {
  // Minimal: consider completed if profile photo exists and 3+ key categories chosen.
  const cats = normalizeDomainCategoryArray(user?.key_interest_categories, []);
  const hasPhoto = Boolean(String(user?.profile_photo || "").trim());
  return hasPhoto && cats.length >= 3;
}

function createProfileFromUser(user) {
  const now = new Date().toISOString();
  const cats = normalizeDomainCategoryArray(user?.key_interest_categories, []);
  return {
    id: randomId("profile"),
    user_id: user.id,
    full_name: user.full_name || "",
    email: normalizeEmail(user.email),
    profile_photo: user.profile_photo || "",
    bio: user.bio || "",
    quote: user.quote || "",
    mood: user.mood || "",
    background_url: user.background_url || "",
    premium_theme: user.premium_theme || "default",
    owned_themes: Array.isArray(user.owned_themes) ? user.owned_themes : ["default"],
    key_interest_categories: cats,
    onboarding_completed: isOnboardingCompleteForUser(user) || Boolean(user.onboarding_completed),
    is_premium: Boolean(user.is_premium),
    blocked_users: Array.isArray(user.blocked_users) ? user.blocked_users : [],
    created_by: user.email,
    created_date: user.created_date || now,
    updated_date: now
  };
}

function ensureProfileUpToDate(db, user) {
  if (!db || !user) return;
  const existing = db.userProfiles.find((p) => p.user_id === user.id);
  const now = new Date().toISOString();
  const cats = normalizeDomainCategoryArray(user.key_interest_categories, []);
  const next = {
    ...(existing || createProfileFromUser(user)),
    user_id: user.id,
    full_name: user.full_name || "",
    email: normalizeEmail(user.email),
    profile_photo: user.profile_photo || "",
    bio: user.bio || "",
    quote: user.quote || "",
    mood: user.mood || "",
    background_url: user.background_url || "",
    premium_theme: user.premium_theme || "default",
    owned_themes: Array.isArray(user.owned_themes) ? user.owned_themes : ["default"],
    key_interest_categories: cats,
    onboarding_completed: isOnboardingCompleteForUser(user) || Boolean(user.onboarding_completed),
    is_premium: Boolean(user.is_premium),
    blocked_users: Array.isArray(user.blocked_users) ? user.blocked_users : [],
    updated_date: now
  };

  if (!existing) {
    db.userProfiles.push(next);
  } else {
    Object.assign(existing, next);
  }
}

function createDefaultUser(fields = {}) {
  const now = new Date().toISOString();
  const email = normalizeEmail(fields.email);
  const fullName = String(fields.full_name || email.split("@")[0] || "User").trim();
  const role = normalizeRole(fields.role);
  const coins = Number.isFinite(Number(fields.coins)) ? Number(fields.coins) : 100;
  const cats = normalizeDomainCategoryArray(fields.key_interest_categories, []);

  const user = {
    id: fields.id || randomId("user"),
    email,
    username: toStringValue(fields.username, ""),
    first_name: toStringValue(fields.first_name, ""),
    last_name: toStringValue(fields.last_name, ""),
    phone: toStringValue(fields.phone, ""),
    full_name: fullName,
    role,
    disabled: Boolean(fields.disabled),
    coins,
    profile_photo: toStringValue(fields.profile_photo, ""),
    bio: toStringValue(fields.bio, ""),
    quote: toStringValue(fields.quote, ""),
    mood: toStringValue(fields.mood, ""),
    background_url: toStringValue(fields.background_url, ""),
    premium_theme: toStringValue(fields.premium_theme, "default"),
    owned_themes: Array.isArray(fields.owned_themes) ? fields.owned_themes : ["default"],
    key_interest_categories: cats,
    is_premium: Boolean(fields.is_premium),
    blocked_users: Array.isArray(fields.blocked_users) ? fields.blocked_users : [],
    badges: { matching: 0, messages: 0, my_planet: 0 },
    oauth_accounts: Array.isArray(fields.oauth_accounts) ? fields.oauth_accounts : [],
    auth_provider: toStringValue(fields.auth_provider, "email"),
    onboarding_completed: Boolean(fields.onboarding_completed),
    onboarding_required: Boolean(fields.onboarding_required),
    onboarding_step: toStringValue(fields.onboarding_step, "profile_photo"),
    tutorial_v2_step: toStringValue(fields.tutorial_v2_step, "onboarding_pending"),
    tutorial_completed: Boolean(fields.tutorial_completed),
    welcomed: Boolean(fields.welcomed),
    daily_metrics: fields.daily_metrics && typeof fields.daily_metrics === "object" ? fields.daily_metrics : {},
    created_by: toStringValue(fields.created_by, email),
    created_date: toStringValue(fields.created_date, now),
    updated_date: toStringValue(fields.updated_date, now)
  };

  ensureUserEngagementShape(user);
  user.onboarding_completed = isOnboardingCompleteForUser(user) || Boolean(user.onboarding_completed);
  user.onboarding_required = !user.onboarding_completed && !isAdmin(user);
  if (user.onboarding_completed) user.onboarding_step = "completed";
  return user;
}

export function ensureDbShape(rawDb) {
  const db = rawDb || {};
  db.users = Array.isArray(db.users) ? db.users : [];
  db.userProfiles = Array.isArray(db.userProfiles) ? db.userProfiles : [];
  db.interests = Array.isArray(db.interests) ? db.interests : [];
  db.messages = Array.isArray(db.messages) ? db.messages : [];
  db.notifications = Array.isArray(db.notifications) ? db.notifications : [];
  db.subscriptions = Array.isArray(db.subscriptions) ? db.subscriptions : [];
  db.matches = Array.isArray(db.matches) ? db.matches : [];
  db.pulses = Array.isArray(db.pulses) ? db.pulses : [];
  db.stardust = Array.isArray(db.stardust) ? db.stardust : [];
  db.invites = Array.isArray(db.invites) ? db.invites : [];
  db.appLogs = Array.isArray(db.appLogs) ? db.appLogs : [];
  db.activityLogs = Array.isArray(db.activityLogs) ? db.activityLogs : [];
  db.passwordResetRequests = Array.isArray(db.passwordResetRequests) ? db.passwordResetRequests : [];
  db.meta = db.meta && typeof db.meta === "object" ? db.meta : {};
  db.meta.last_engagement_run_at = toStringValue(db.meta.last_engagement_run_at, "");
  db.meta.event_seq = Number.isFinite(Number(db.meta.event_seq)) ? Number(db.meta.event_seq) : 0;
  db.meta.events = Array.isArray(db.meta.events) ? db.meta.events : [];
  db.meta.sessions = Array.isArray(db.meta.sessions) ? db.meta.sessions : [];

  db.users.forEach((user) => {
    user.key_interest_categories = normalizeDomainCategoryArray(user.key_interest_categories, []);
    user.onboarding_completed = isOnboardingCompleteForUser(user) || Boolean(user.onboarding_completed);
    user.onboarding_required = !user.onboarding_completed && !isAdmin(user);
    if (user.onboarding_completed && String(user.onboarding_step || "").trim().toLowerCase() !== "completed") {
      user.onboarding_step = "completed";
    }
    ensureUserEngagementShape(user);
  });

  db.interests = db.interests
    .map((interest) => ({
      ...interest,
      category: normalizeDomainCategoryId(interest.category)
    }))
    .filter((interest) => Boolean(interest.category));

  db.userProfiles.forEach((profile) => {
    profile.key_interest_categories = normalizeDomainCategoryArray(profile.key_interest_categories, []);
    profile.onboarding_completed =
      isOnboardingCompleteForUser({
        role: "user",
        profile_photo: profile.profile_photo,
        key_interest_categories: profile.key_interest_categories
      }) || Boolean(profile.onboarding_completed);
  });

  return db;
}

export function ensureDefaultAdminAccount(db) {
  let changed = false;
  const adminEmail = "admin@mindcircle.local";
  let admin = db.users.find((u) => normalizeEmail(u.email) === adminEmail);
  if (!admin) {
    admin = createDefaultUser({
      email: adminEmail,
      full_name: "Make a Match Admin",
      role: "admin",
      coins: 500,
      welcomed: true,
      onboarding_completed: true,
      onboarding_required: false,
      onboarding_step: "completed",
      tutorial_v2_step: "completed",
      tutorial_completed: true
    });
    db.users.push(admin);
    changed = true;
  }
  ensureProfileUpToDate(db, admin);
  return changed;
}

export function ensureUserProfile(db, user) {
  ensureProfileUpToDate(db, user);
}

export const entityMap = {
  User: "users",
  UserProfile: "userProfiles",
  Interest: "interests",
  Message: "messages",
  Notification: "notifications",
  Subscription: "subscriptions",
  Match: "matches",
  Pulse: "pulses",
  Stardust: "stardust",
  Invite: "invites"
};

export const adminOnlyEntities = new Set(["User", "Invite"]);

export function matchesQuery(record, query = {}) {
  const entries = Object.entries(query || {});
  for (const [key, condition] of entries) {
    const value = record?.[key];
    if (condition && typeof condition === "object" && !Array.isArray(condition)) {
      if (Object.prototype.hasOwnProperty.call(condition, "$gte")) {
        if (String(value ?? "") < String(condition.$gte)) return false;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(condition, "$lte")) {
        if (String(value ?? "") > String(condition.$lte)) return false;
        continue;
      }
      if (Object.prototype.hasOwnProperty.call(condition, "$in")) {
        if (!Array.isArray(condition.$in) || !condition.$in.includes(value)) return false;
        continue;
      }
    }
    if (value !== condition) return false;
  }
  return true;
}

export function applySortingAndLimit(rows, sortBy, limit) {
  let output = Array.isArray(rows) ? [...rows] : [];
  if (sortBy && typeof sortBy === "string") {
    const desc = sortBy.startsWith("-");
    const key = desc ? sortBy.slice(1) : sortBy;
    output.sort((a, b) => {
      const av = a?.[key];
      const bv = b?.[key];
      if (av === bv) return 0;
      if (av === undefined || av === null) return 1;
      if (bv === undefined || bv === null) return -1;
      return desc ? (String(av) < String(bv) ? 1 : -1) : (String(av) > String(bv) ? 1 : -1);
    });
  }
  if (typeof limit === "number") output = output.slice(0, limit);
  return output;
}

function createInitialDb() {
  const db = ensureDbShape({});
  ensureDefaultAdminAccount(db);
  return db;
}

function safeJsonParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function atomicWriteJson(filePath, raw) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, raw, "utf8");
  fs.renameSync(tmp, filePath);
}

export class FileDb {
  constructor({ filePath }) {
    this.filePath = filePath;
    this._queue = Promise.resolve();
    this._subscribers = new Map();
  }

  _emit(entityName, event) {
    const listeners = this._subscribers.get(entityName);
    if (!listeners) return;
    for (const cb of listeners) {
      try {
        cb(event);
      } catch {
        // ignore subscriber errors
      }
    }
  }

  subscribe(entityName, callback) {
    const set = this._subscribers.get(entityName) || new Set();
    set.add(callback);
    this._subscribers.set(entityName, set);
    return () => {
      const current = this._subscribers.get(entityName);
      if (!current) return;
      current.delete(callback);
    };
  }

  async read() {
    const raw = fs.existsSync(this.filePath) ? fs.readFileSync(this.filePath, "utf8") : "";
    const parsed = safeJsonParse(raw);
    const db = ensureDbShape(parsed || createInitialDb());
    const changed = ensureDefaultAdminAccount(db) || !parsed;
    if (changed) {
      atomicWriteJson(this.filePath, JSON.stringify(db));
    }
    return db;
  }

  async write(db) {
    const normalized = ensureDbShape(db);
    atomicWriteJson(this.filePath, JSON.stringify(normalized));
    return normalized;
  }

  async mutate(mutator, { emitEvents = [] } = {}) {
    // Serialize all mutations to avoid clobbering the JSON file.
    this._queue = this._queue.then(async () => {
      const db = await this.read();
      const cloned = JSON.parse(JSON.stringify(db));
      const result = await mutator(cloned);
      const saved = await this.write(cloned);
      for (const evt of emitEvents) {
        this._emit(evt.entity, evt.event);
      }
      return { db: saved, result };
    });
    return this._queue;
  }

  emitEntityEvent(entityName, event) {
    this._emit(entityName, event);
  }
}

export function stripPrivateUserFields(user) {
  if (!user) return null;
  const clone = { ...user };
  delete clone.password;
  delete clone.password_hash;
  delete clone.password_salt;
  delete clone.reset_code;
  return clone;
}
