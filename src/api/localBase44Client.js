import { calculateMatchScore } from "@/components/utils/matchingUtils";
import userProfilesSeedCsv from "@/data/UserProfile_export.csv?raw";

const STORAGE_KEY = "mindcircle_local_backend_v1";
const AUTH_KEY = "mindcircle_local_auth_user_id";
const SHARED_DB_ENDPOINT = "/__mindcircle/local-db";
const MATCH_EVENT_THRESHOLD = 10;
const MAX_PUSH_NOTIFICATIONS_PER_DAY = 2;
const PASSWORD_RESET_CODE_TTL_MINUTES = 15;
const SHARED_DB_CACHE_TTL_MS = 1500;
const ENGAGEMENT_ENGINE_MIN_INTERVAL_MS = 15000;
const DEFAULT_BADGES = { matching: 0, messages: 0, my_planet: 0 };
const NOTIFICATION_PRIORITY = {
  new_match: 3,
  improved_match: 3,
  match: 3,
  message: 3,
  new_similar_user: 2,
  profile_interaction: 2,
  profile_view: 2,
  like: 2,
  daily_update: 1,
  social_proof: 1
};

const DOMAIN_CATEGORY_IDS = new Set([
  "love_relationships",
  "lifestyle_values",
  "cultural_taste",
  "hobbies_activities",
  "food_everyday_life"
]);

function getDayKey(dateIso = defaultNow()) {
  return String(dateIso).slice(0, 10);
}

function toIsoStartOfDay(dayKey) {
  return `${dayKey}T00:00:00.000Z`;
}

function parseCsvRows(csvText = "") {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      row.push(cell);
      const hasValues = row.some((item) => String(item || "").trim() !== "");
      if (hasValues) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    const hasValues = row.some((item) => String(item || "").trim() !== "");
    if (hasValues) rows.push(row);
  }

  return rows;
}

function parseBlockedUsers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // ignore malformed values
  }
  return [];
}

function parseBuiltinImportedProfiles(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];

  const headers = rows[0].map((item) => String(item || "").trim());
  return rows
    .slice(1)
    .map((line) => {
      const record = {};
      headers.forEach((key, idx) => {
        record[key] = line[idx] ?? "";
      });

      const email = String(record.email || "").trim().toLowerCase();
      if (!email) return null;

      return {
        source_user_id: String(record.user_id || "").trim(),
        source_profile_id: String(record.id || "").trim(),
        full_name: record.full_name || record.name || email.split("@")[0],
        email,
        profile_photo: record.profile_photo || "",
        bio: record.bio || "",
        quote: record.quote || "",
        mood: record.mood || "",
        background_url: record.background_url || "",
        onboarding_completed: toBool(record.onboarding_completed, true),
        is_premium: toBool(record.is_premium, false),
        blocked_users: parseBlockedUsers(record.blocked_users),
        created_date: record.created_date || "",
        updated_date: record.updated_date || ""
      };
    })
    .filter(Boolean);
}

const BUILTIN_IMPORTED_PROFILES = parseBuiltinImportedProfiles(userProfilesSeedCsv);

const defaultNow = () => new Date().toISOString();
const clone = (value) => JSON.parse(JSON.stringify(value));

const memoryStorage = (() => {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    }
  };
})();

let cachedDb = null;
let cachedDbRaw = "";
let lastPersistedRaw = "";
let sharedDbRawCache = null;
let sharedDbCacheAt = 0;

function getStorage() {
  if (typeof window !== "undefined") {
    try {
      if (window.localStorage) {
        const probeKey = "__mindcircle_storage_probe__";
        window.localStorage.setItem(probeKey, "1");
        window.localStorage.removeItem(probeKey);
        return window.localStorage;
      }
    } catch {
      // Fall through to in-memory storage when browser blocks localStorage.
    }
  }
  return memoryStorage;
}

function canUseSharedDbEndpoint() {
  if (typeof window === "undefined" || typeof XMLHttpRequest === "undefined") {
    return false;
  }
  const protocol = String(window.location?.protocol || "");
  return protocol === "http:" || protocol === "https:";
}

function isLoopbackHost() {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function sharedDbRequest(method, payload = null) {
  if (!canUseSharedDbEndpoint()) return null;
  try {
    const xhr = new XMLHttpRequest();
    xhr.open(method, SHARED_DB_ENDPOINT, false);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.send(payload ? JSON.stringify(payload) : null);
    if (xhr.status < 200 || xhr.status >= 300) {
      return null;
    }
    if (!xhr.responseText) return {};
    return JSON.parse(xhr.responseText);
  } catch {
    return null;
  }
}

function readSharedDbRaw(force = false) {
  if (!force) {
    const age = Date.now() - sharedDbCacheAt;
    if (age >= 0 && age < SHARED_DB_CACHE_TTL_MS) {
      return sharedDbRawCache;
    }
  }

  const response = sharedDbRequest("GET");
  sharedDbCacheAt = Date.now();
  if (!response || typeof response.raw !== "string") {
    sharedDbRawCache = null;
    return null;
  }
  sharedDbRawCache = response.raw;
  return sharedDbRawCache;
}

function writeSharedDbRaw(raw) {
  if (!raw) return false;
  if (raw === sharedDbRawCache) {
    sharedDbCacheAt = Date.now();
    return true;
  }
  const response = sharedDbRequest("PUT", { raw });
  if (response?.ok) {
    sharedDbRawCache = raw;
    sharedDbCacheAt = Date.now();
    return true;
  }
  return false;
}

function clearPersistedDb() {
  getStorage().removeItem(STORAGE_KEY);
  sharedDbRequest("DELETE");
  cachedDb = null;
  cachedDbRaw = "";
  lastPersistedRaw = "";
  sharedDbRawCache = null;
  sharedDbCacheAt = 0;
}

function ensureDefaultAdminAccount(db) {
  let changed = false;
  let admin = db.users.find((u) => normalizeEmail(u.email) === "admin@mindcircle.local");
  if (!admin) {
    admin = createDefaultUser({
      email: "admin@mindcircle.local",
      full_name: "MindCircle Admin",
      role: "admin",
      is_premium: true,
      password: "admin12345",
      coins: 1000
    });
    db.users.unshift(admin);
    changed = true;
  }

  const before = JSON.stringify({
    role: admin.role,
    _app_role: admin._app_role,
    disabled: admin.disabled,
    is_premium: admin.is_premium,
    password: admin.password,
    full_name: admin.full_name
  });

  admin.role = "admin";
  admin._app_role = "admin";
  admin.disabled = false;
  admin.is_premium = true;
  admin.password = "admin12345";
  admin.full_name = admin.full_name || "MindCircle Admin";

  const after = JSON.stringify({
    role: admin.role,
    _app_role: admin._app_role,
    disabled: admin.disabled,
    is_premium: admin.is_premium,
    password: admin.password,
    full_name: admin.full_name
  });
  if (before !== after) {
    admin.updated_date = defaultNow();
    changed = true;
  }

  ensureProfileUpToDate(db, admin);
  return changed;
}

function createInitialDb() {
  const admin = createDefaultUser({
    email: "admin@mindcircle.local",
    full_name: "MindCircle Admin",
    role: "admin",
    is_premium: true,
    password: "admin12345",
    coins: 1000
  });

  const demo = createDefaultUser({
    email: "demo@mindcircle.local",
    full_name: "Demo User",
    role: "user",
    is_premium: false,
    password: "demo12345",
    coins: 300
  });
  demo.onboarding_completed = true;
  demo.bio = "Local demo account";
  demo.quote = "MindCircle local mode";
  demo.mood = "🌟";

  const db = ensureDbShape({
    users: [admin, demo],
    userProfiles: [createProfileFromUser(admin), createProfileFromUser(demo)]
  });

  // Seed a few interests so matching works out-of-the-box.
  const seedInterests = [
    { user_id: demo.id, category: "hobbies_activities", title: "Creative Hobbies" },
    { user_id: demo.id, category: "hobbies_activities", title: "Travel & Adventures" },
    { user_id: demo.id, category: "hobbies_activities", title: "Social Activities" }
  ];
  db.interests = seedInterests.map((item, idx) => ({
    id: randomId(`int_${idx}`),
    created_date: defaultNow(),
    updated_date: defaultNow(),
    photo_url: "",
    description: "",
    position: idx + 1,
    ...item
  }));

  applyBuiltinImportedProfiles(db);
  ensureDefaultAdminAccount(db);
  persistDb(db);
  getStorage().setItem(AUTH_KEY, admin.id);
  return db;
}

function randomId(prefix = "id") {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${rand}`;
}

function normalizeEmail(email = "") {
  return String(email).trim().toLowerCase();
}

function normalizeDomainCategoryId(value = "") {
  const key = String(value || "").trim().toLowerCase();
  if (!key) return "";
  return DOMAIN_CATEGORY_IDS.has(key) ? key : "";
}

function normalizeDomainCategoryArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(
    new Set(
      source
        .map((item) => normalizeDomainCategoryId(item))
        .filter(Boolean)
    )
  );
}

function normalizeAuthProvider(provider = "") {
  const value = String(provider || "").trim().toLowerCase();
  if (!value) return "";
  if (value.includes("google")) return "google";
  if (value.includes("apple")) return "apple";
  if (value === "email") return "email";
  return "";
}

function ensureUserAuthShape(user) {
  if (!user) return;
  const primary = normalizeAuthProvider(user.auth_provider) || "email";
  const oauthAccounts = Array.isArray(user.oauth_accounts)
    ? user.oauth_accounts
        .map((item) => normalizeAuthProvider(item))
        .filter((item) => item && item !== "email")
    : [];
  if (primary !== "email" && !oauthAccounts.includes(primary)) {
    oauthAccounts.push(primary);
  }
  user.auth_provider = primary;
  user.oauth_accounts = Array.from(new Set(oauthAccounts));
}

function isOnboardingCompleteForUser(user) {
  if (!user) return false;
  if (normalizeRole(user.role || user._app_role) === "admin") return true;
  const hasPhoto = Boolean(String(user.profile_photo || "").trim());
  const keyCategoryCount = normalizeDomainCategoryArray(user.key_interest_categories, []).length;
  return hasPhoto && keyCategoryCount >= 3;
}

function generatePasswordResetCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function normalizeRole(role) {
  const value = String(role || "user").trim().toLowerCase();
  return value === "admin" ? "admin" : "user";
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
    if (["false", "0", "no", "n", "off"].includes(normalized)) return false;
  }
  return Boolean(value);
}

function toStringValue(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function toNumberValue(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function uniqueStringArray(value, fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => String(item))));
}

function cloneBadges(badges) {
  return {
    matching: toNumberValue(badges?.matching, 0),
    messages: toNumberValue(badges?.messages, 0),
    my_planet: toNumberValue(badges?.my_planet, 0)
  };
}

function ensureUserEngagementShape(user) {
  if (!user) return;
  user.badges = { ...DEFAULT_BADGES, ...cloneBadges(user.badges) };
  user.daily_metrics = user.daily_metrics && typeof user.daily_metrics === "object" ? user.daily_metrics : {};
  user.last_daily_update_day = toStringValue(user.last_daily_update_day, "");
  user.daily_highlight = user.daily_highlight && typeof user.daily_highlight === "object" ? user.daily_highlight : null;
}

function ensureDailyMetrics(user, dayKey) {
  ensureUserEngagementShape(user);
  if (!user.daily_metrics || user.daily_metrics.day !== dayKey) {
    user.daily_metrics = {
      day: dayKey,
      profile_views: 0,
      category_interactions: 0,
      search_impressions: 0,
      new_matches: 0,
      improved_matches: 0
    };
  }
}

function getPairKey(a, b) {
  return [String(a || ""), String(b || "")].sort().join("__");
}

function getNotificationPriority(type) {
  const key = String(type || "").trim().toLowerCase();
  return NOTIFICATION_PRIORITY[key] || 1;
}

function getBadgeKeyFromNotificationType(type) {
  const key = String(type || "").trim().toLowerCase();
  if (key === "message") return "messages";
  if (["match", "new_match", "improved_match", "new_similar_user"].includes(key)) return "matching";
  if (["daily_update", "social_proof", "profile_view", "profile_interaction", "like"].includes(key)) return "my_planet";
  return null;
}

function incrementBadge(user, badgeKey, amount = 1) {
  if (!user || !badgeKey) return;
  ensureUserEngagementShape(user);
  user.badges[badgeKey] = Math.max(0, toNumberValue(user.badges[badgeKey], 0) + amount);
}

function shouldEnablePushForNotification(db, toUserId, priority, dayKey) {
  const startOfDayIso = toIsoStartOfDay(dayKey);
  const todaysPushCount = db.notifications.filter(
    (item) =>
      item.to_user_id === toUserId &&
      item.push_enabled === true &&
      String(item.created_date || "") >= startOfDayIso
  ).length;

  if (todaysPushCount >= MAX_PUSH_NOTIFICATIONS_PER_DAY) return false;
  if (todaysPushCount === 1 && priority < 2) return false;
  return true;
}

function hasRecentDuplicateNotification(db, toUserId, dedupeKey, text, nowIso) {
  if (!toUserId) return true;
  const recentThreshold = new Date(Date.parse(nowIso) - 30 * 60 * 1000).toISOString();
  const latestForUser = db.notifications
    .filter((item) => item.to_user_id === toUserId)
    .sort((a, b) => String(b.created_date || "").localeCompare(String(a.created_date || "")))[0];

  if (dedupeKey && db.notifications.some((item) => item.to_user_id === toUserId && item.dedupe_key === dedupeKey)) {
    return true;
  }
  if (
    latestForUser &&
    latestForUser.text === text &&
    String(latestForUser.created_date || "") >= recentThreshold
  ) {
    return true;
  }
  return false;
}

function normalizeImportPayload(payload) {
  const source = payload || {};
  const users = Array.isArray(source)
    ? source
    : toArray(source.users).length
      ? source.users
      : toArray(source.data);

  const profiles = toArray(source.profiles);
  const interests = toArray(source.interests);

  return { users, profiles, interests };
}

function createDefaultUser({ email, full_name, role = "user", is_premium = false, password = "password123", coins = 100 }) {
  const now = defaultNow();
  const dayKey = getDayKey(now);
  return {
    id: randomId("usr"),
    email: normalizeEmail(email),
    password,
    username: "",
    first_name: "",
    last_name: "",
    phone: "",
    age_confirmed: role === "admin",
    terms_accepted: role === "admin",
    full_name,
    role,
    _app_role: role,
    auth_provider: "email",
    oauth_accounts: [],
    disabled: false,
    is_verified: true,
    app_id: "local-app",
    is_service: false,
    is_premium,
    premium_theme: "default",
    owned_themes: ["default"],
    coins,
    created_date: now,
    updated_date: now,
    onboarding_completed: role === "admin",
    onboarding_required: role !== "admin",
    onboarding_step: role === "admin" ? "completed" : "profile_photo",
    key_interest_categories: [],
    tutorial_v2_step: role === "admin" ? "completed" : "pending_registration",
    welcomed: role === "admin",
    tutorial_completed: role === "admin",
    blocked_users: [],
    badges: { ...DEFAULT_BADGES },
    daily_metrics: {
      day: dayKey,
      profile_views: 0,
      category_interactions: 0,
      search_impressions: 0,
      new_matches: 0,
      improved_matches: 0
    },
    last_daily_update_day: role === "admin" ? dayKey : "",
    daily_highlight: null
  };
}

function createProfileFromUser(user) {
  const now = defaultNow();
  const normalizedKeyCategories = normalizeDomainCategoryArray(user.key_interest_categories, []);
  return {
    id: randomId("uprofile"),
    user_id: user.id,
    full_name: user.full_name || "",
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    email: user.email || "",
    profile_photo: user.profile_photo || "",
    bio: user.bio || "",
    quote: user.quote || "",
    mood: user.mood || "",
    background_url: user.background_url || "",
    premium_theme: user.premium_theme || "default",
    owned_themes: user.owned_themes || ["default"],
    key_interest_categories: normalizedKeyCategories,
    onboarding_completed: isOnboardingCompleteForUser(user),
    is_premium: !!user.is_premium,
    blocked_users: user.blocked_users || [],
    created_by: user.email,
    created_date: now,
    updated_date: now
  };
}

function ensureDbShape(rawDb) {
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
  db.users.forEach((user) => {
    user.key_interest_categories = normalizeDomainCategoryArray(user.key_interest_categories, []);
    user.onboarding_completed = isOnboardingCompleteForUser(user);
    user.onboarding_required = !user.onboarding_completed && normalizeRole(user.role || user._app_role) !== "admin";
    if (user.onboarding_completed && String(user.onboarding_step || "").trim().toLowerCase() !== "completed") {
      user.onboarding_step = "completed";
    }
    ensureUserEngagementShape(user);
    ensureUserAuthShape(user);
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
        _app_role: "user",
        profile_photo: profile.profile_photo,
        key_interest_categories: profile.key_interest_categories
      }) || Boolean(profile.onboarding_completed);
  });
  db.matches.forEach((matchRecord) => {
    if (Array.isArray(matchRecord.matched_categories)) {
      matchRecord.matched_categories = normalizeDomainCategoryArray(matchRecord.matched_categories, []);
    }
  });
  return db;
}

function persistDb(db) {
  const raw = JSON.stringify(db);
  if (raw === lastPersistedRaw) {
    cachedDb = db;
    cachedDbRaw = raw;
    return;
  }
  getStorage().setItem(STORAGE_KEY, raw);
  writeSharedDbRaw(raw);
  cachedDb = db;
  cachedDbRaw = raw;
  lastPersistedRaw = raw;
}

function applyBuiltinImportedProfiles(db) {
  let changed = false;

  BUILTIN_IMPORTED_PROFILES.forEach((seed) => {
    const email = normalizeEmail(seed.email);
    if (!email) return;

    let user = db.users.find((u) => normalizeEmail(u.email) === email);
    if (!user) {
      const sourceId = String(seed.source_user_id || "").trim();
      const sourceIdAvailable = sourceId && !db.users.some((u) => String(u.id) === sourceId);

      user = createDefaultUser({
        email,
        full_name: seed.full_name || email.split("@")[0],
        role: "user",
        is_premium: !!seed.is_premium,
        password: "welcome12345",
        coins: 150
      });

      if (sourceIdAvailable) {
        user.id = sourceId;
      }

      if (seed.created_date) {
        user.created_date = seed.created_date;
      }
      if (seed.updated_date) {
        user.updated_date = seed.updated_date;
      }

      db.users.push(user);
      changed = true;
    }

    const mergedFields = {
      full_name: seed.full_name || user.full_name,
      email,
      profile_photo: seed.profile_photo || user.profile_photo || "",
      bio: seed.bio || user.bio || "",
      quote: seed.quote || user.quote || "",
      mood: seed.mood || user.mood || "",
      background_url: seed.background_url || user.background_url || "",
      onboarding_completed: seed.onboarding_completed !== undefined ? !!seed.onboarding_completed : !!user.onboarding_completed,
      is_premium: seed.is_premium !== undefined ? !!seed.is_premium : !!user.is_premium,
      blocked_users: Array.isArray(seed.blocked_users) ? seed.blocked_users : user.blocked_users || [],
      updated_date: seed.updated_date || defaultNow()
    };

    const before = JSON.stringify({
      full_name: user.full_name,
      profile_photo: user.profile_photo || "",
      bio: user.bio || "",
      quote: user.quote || "",
      mood: user.mood || "",
      background_url: user.background_url || "",
      onboarding_completed: !!user.onboarding_completed,
      is_premium: !!user.is_premium,
      blocked_users: user.blocked_users || []
    });

    Object.assign(user, mergedFields);
    ensureProfileUpToDate(db, user);

    const after = JSON.stringify({
      full_name: user.full_name,
      profile_photo: user.profile_photo || "",
      bio: user.bio || "",
      quote: user.quote || "",
      mood: user.mood || "",
      background_url: user.background_url || "",
      onboarding_completed: !!user.onboarding_completed,
      is_premium: !!user.is_premium,
      blocked_users: user.blocked_users || []
    });

    if (before !== after) {
      changed = true;
    }
  });

  return changed;
}

function loadDb(resetAttempted = false) {
  const localRaw = getStorage().getItem(STORAGE_KEY);
  const sharedRaw = readSharedDbRaw();
  const hasShared = typeof sharedRaw === "string" && sharedRaw.length > 0;
  const hasLocal = typeof localRaw === "string" && localRaw.length > 0;

  let raw = null;
  if (hasShared) {
    raw = sharedRaw;
    if (!hasLocal || localRaw !== sharedRaw) {
      getStorage().setItem(STORAGE_KEY, sharedRaw);
    }
  } else if (hasLocal) {
    raw = localRaw;
    writeSharedDbRaw(localRaw);
  }

  if (!raw) {
    return createInitialDb();
  }

  if (cachedDb && cachedDbRaw && raw === cachedDbRaw) {
    return cachedDb;
  }

  try {
    const db = ensureDbShape(JSON.parse(raw));
    let changed = JSON.stringify(db) !== raw;
    changed = applyBuiltinImportedProfiles(db) || changed;
    changed = ensureDefaultAdminAccount(db) || changed;
    if (changed) {
      persistDb(db);
    }
    if (!db.users.length) {
      getStorage().removeItem(STORAGE_KEY);
      return loadDb();
    }
    cachedDb = db;
    cachedDbRaw = changed ? JSON.stringify(db) : raw;
    lastPersistedRaw = cachedDbRaw;
    return db;
  } catch {
    clearPersistedDb();
    return resetAttempted ? createInitialDb() : loadDb(true);
  }
}

function saveDb(mutator) {
  const sourceDb = loadDb();
  const db = clone(sourceDb);
  mutator(db);
  const normalizedDb = ensureDbShape(db);
  persistDb(normalizedDb);
  return normalizedDb;
}

function getCurrentUser(db = loadDb()) {
  const currentUserId = getStorage().getItem(AUTH_KEY);
  return db.users.find((u) => u.id === currentUserId && !u.disabled) || null;
}

function setCurrentUser(userId) {
  if (userId) getStorage().setItem(AUTH_KEY, userId);
  else getStorage().removeItem(AUTH_KEY);
}

function isAdmin(user) {
  const role = String(user?.role || user?._app_role || "").toLowerCase();
  return role === "admin" || user?.is_admin === true;
}

const entityMap = {
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
const adminOnlyEntities = new Set(["User", "Invite"]);

const subscribers = new Map();

function emitEntityEvent(entityName, event) {
  const listeners = subscribers.get(entityName);
  if (!listeners) return;
  listeners.forEach((callback) => {
    try {
      callback(event);
    } catch {
      // ignore subscriber errors
    }
  });
}

function ensureEntityExists(entityName) {
  if (!entityMap[entityName]) {
    throw new Error(`Unknown entity: ${entityName}`);
  }
}

function evaluateCondition(value, condition) {
  if (condition && typeof condition === "object" && !Array.isArray(condition)) {
    if (Object.prototype.hasOwnProperty.call(condition, "$gte")) {
      return String(value ?? "") >= String(condition.$gte);
    }
    if (Object.prototype.hasOwnProperty.call(condition, "$lte")) {
      return String(value ?? "") <= String(condition.$lte);
    }
    if (Object.prototype.hasOwnProperty.call(condition, "$in")) {
      return Array.isArray(condition.$in) && condition.$in.includes(value);
    }
  }
  return value === condition;
}

function matchesQuery(record, query = {}) {
  return Object.entries(query).every(([key, condition]) => evaluateCondition(record[key], condition));
}

function applySortingAndLimit(rows, sortBy, limit) {
  let output = [...rows];
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
  if (typeof limit === "number") {
    output = output.slice(0, limit);
  }
  return output;
}

function ensureAdminAccess(db) {
  const current = getCurrentUser(db);
  if (!isAdmin(current)) {
    const error = new Error("Admin role required");
    error.status = 403;
    throw error;
  }
}

function ensureProfileUpToDate(db, user) {
  if (!user) return;
  const existing = db.userProfiles.find((p) => p.user_id === user.id);
  const nextProfile = {
    ...(existing || createProfileFromUser(user)),
    full_name: user.full_name || "",
    username: user.username || "",
    first_name: user.first_name || "",
    last_name: user.last_name || "",
    phone: user.phone || "",
    email: user.email || "",
    profile_photo: user.profile_photo || "",
    bio: user.bio || "",
    quote: user.quote || "",
    mood: user.mood || "",
    background_url: user.background_url || "",
    premium_theme: user.premium_theme || "default",
    owned_themes: user.owned_themes || ["default"],
    key_interest_categories: normalizeDomainCategoryArray(user.key_interest_categories, []),
    onboarding_completed: isOnboardingCompleteForUser(user),
    is_premium: !!user.is_premium,
    blocked_users: user.blocked_users || [],
    updated_date: defaultNow()
  };
  if (existing) {
    Object.assign(existing, nextProfile);
  } else {
    db.userProfiles.push(nextProfile);
  }
}

function calculateLocalMatchScore(currentUser, otherUser, interests = [], messages = []) {
  const score = calculateMatchScore(currentUser, otherUser, interests, messages);
  return {
    percentage: score.percentage,
    matchedCategories: score.matchedCategories,
    canMessage: score.canMessage
  };
}

function createNotificationRecord(db, payload, createdNotifications) {
  const nowIso = payload.nowIso || defaultNow();
  const dayKey = getDayKey(nowIso);
  const toUserId = payload.to_user_id;
  if (!toUserId) return null;
  if (payload.from_user_id && payload.from_user_id === toUserId) return null;

  if (hasRecentDuplicateNotification(db, toUserId, payload.dedupe_key, payload.text, nowIso)) {
    return null;
  }

  const toUser = db.users.find((item) => item.id === toUserId);
  if (!toUser || toUser.disabled) return null;
  ensureUserEngagementShape(toUser);

  const priority = toNumberValue(payload.priority, getNotificationPriority(payload.type));
  const pushEnabled =
    payload.push_enabled === false
      ? false
      : shouldEnablePushForNotification(db, toUserId, priority, dayKey);

  const nextRecord = {
    id: randomId("notification"),
    created_date: nowIso,
    updated_date: nowIso,
    type: toStringValue(payload.type, "system"),
    from_user_id: payload.from_user_id || null,
    to_user_id: toUserId,
    text: toStringValue(payload.text, "New update available."),
    is_read: false,
    dedupe_key: payload.dedupe_key || "",
    priority,
    push_enabled: pushEnabled,
    badge_key: payload.badge_key || getBadgeKeyFromNotificationType(payload.type),
    meta: payload.meta && typeof payload.meta === "object" ? clone(payload.meta) : {}
  };

  db.notifications.unshift(nextRecord);
  if (nextRecord.badge_key) {
    incrementBadge(toUser, nextRecord.badge_key, 1);
  }
  createdNotifications.push(nextRecord);
  return nextRecord;
}

function recalculateMatchesAndEvents(db, nowIso, createdNotifications) {
  const users = db.users.filter((item) => !item.disabled && !isAdmin(item));
  if (users.length < 2) return;

  const dayKey = getDayKey(nowIso);
  const interests = db.interests || [];
  const messages = db.messages || [];
  const recentWindowMs = 3 * 24 * 60 * 60 * 1000;
  const matchByPair = new Map();

  db.matches.forEach((matchRecord) => {
    const pairKey = matchRecord.pair_key || getPairKey(matchRecord.from_user_id, matchRecord.to_user_id);
    if (!pairKey) return;
    matchRecord.pair_key = pairKey;
    matchByPair.set(pairKey, matchRecord);
  });

  for (let i = 0; i < users.length; i += 1) {
    for (let j = i + 1; j < users.length; j += 1) {
      const left = users[i];
      const right = users[j];
      const pairKey = getPairKey(left.id, right.id);
      const record = matchByPair.get(pairKey);
      const previousPercentage = toNumberValue(record?.percentage ?? record?.last_percentage, 0);
      const score = calculateLocalMatchScore(left, right, interests, messages);

      const target = record || {
        id: randomId("match"),
        pair_key: pairKey,
        from_user_id: left.id,
        to_user_id: right.id,
        user_a_id: left.id,
        user_b_id: right.id,
        created_date: nowIso
      };

      target.updated_date = nowIso;
      target.percentage = score.percentage;
      target.last_percentage = score.percentage;
      target.matched_categories = score.matchedCategories || [];
      target.can_message = !!score.canMessage;

      if (!record) {
        db.matches.push(target);
        matchByPair.set(pairKey, target);
      }

      const crossedThreshold =
        previousPercentage < MATCH_EVENT_THRESHOLD && score.percentage >= MATCH_EVENT_THRESHOLD;
      const improvedMatch =
        previousPercentage >= MATCH_EVENT_THRESHOLD && score.percentage > previousPercentage;

      if (crossedThreshold) {
        ensureDailyMetrics(left, dayKey);
        ensureDailyMetrics(right, dayKey);
        left.daily_metrics.new_matches += 1;
        right.daily_metrics.new_matches += 1;

        createNotificationRecord(
          db,
          {
            nowIso,
            type: "new_match",
            from_user_id: right.id,
            to_user_id: left.id,
            badge_key: "matching",
            text: `New match: ${right.full_name} (${score.percentage}% compatibility).`,
            dedupe_key: `new_match:${pairKey}:${score.percentage}`
          },
          createdNotifications
        );
        createNotificationRecord(
          db,
          {
            nowIso,
            type: "new_match",
            from_user_id: left.id,
            to_user_id: right.id,
            badge_key: "matching",
            text: `New match: ${left.full_name} (${score.percentage}% compatibility).`,
            dedupe_key: `new_match:${pairKey}:${score.percentage}:reverse`
          },
          createdNotifications
        );

        const leftRecent = Date.parse(left.created_date || nowIso) >= Date.parse(nowIso) - recentWindowMs;
        const rightRecent = Date.parse(right.created_date || nowIso) >= Date.parse(nowIso) - recentWindowMs;
        if (leftRecent !== rightRecent) {
          const receiver = leftRecent ? right : left;
          const newcomer = leftRecent ? left : right;
          createNotificationRecord(
            db,
            {
              nowIso,
              type: "new_similar_user",
              from_user_id: newcomer.id,
              to_user_id: receiver.id,
              badge_key: "matching",
              text: `New similar user joined: ${newcomer.full_name} matches your interests.`,
              dedupe_key: `new_similar:${receiver.id}:${newcomer.id}`
            },
            createdNotifications
          );
        }
      } else if (improvedMatch) {
        ensureDailyMetrics(left, dayKey);
        ensureDailyMetrics(right, dayKey);
        left.daily_metrics.improved_matches += 1;
        right.daily_metrics.improved_matches += 1;

        createNotificationRecord(
          db,
          {
            nowIso,
            type: "improved_match",
            from_user_id: right.id,
            to_user_id: left.id,
            badge_key: "matching",
            text: `Match improved with ${right.full_name}: ${previousPercentage}% -> ${score.percentage}%.`,
            dedupe_key: `improved:${pairKey}:${previousPercentage}:${score.percentage}`
          },
          createdNotifications
        );
        createNotificationRecord(
          db,
          {
            nowIso,
            type: "improved_match",
            from_user_id: left.id,
            to_user_id: right.id,
            badge_key: "matching",
            text: `Match improved with ${left.full_name}: ${previousPercentage}% -> ${score.percentage}%.`,
            dedupe_key: `improved:${pairKey}:${previousPercentage}:${score.percentage}:reverse`
          },
          createdNotifications
        );
      }
    }
  }
}

function createDailyHighlights(db, nowIso, createdNotifications) {
  const dayKey = getDayKey(nowIso);
  const eligibleUsers = db.users.filter((item) => !item.disabled && !isAdmin(item));

  eligibleUsers.forEach((user) => {
    ensureDailyMetrics(user, dayKey);
    if (user.last_daily_update_day === dayKey) return;

    const relatedMatches = db.matches
      .filter((item) => item.user_a_id === user.id || item.user_b_id === user.id || item.from_user_id === user.id || item.to_user_id === user.id)
      .map((item) => {
        const otherId = item.user_a_id === user.id || item.from_user_id === user.id
          ? item.user_b_id || item.to_user_id
          : item.user_a_id || item.from_user_id;
        const other = db.users.find((candidate) => candidate.id === otherId);
        return {
          percentage: toNumberValue(item.percentage ?? item.last_percentage, 0),
          other
        };
      })
      .filter((item) => item.other)
      .sort((a, b) => b.percentage - a.percentage);

    const topMatch = relatedMatches[0];
    const views = toNumberValue(user.daily_metrics.profile_views, 0);
    const interactions = toNumberValue(user.daily_metrics.category_interactions, 0);
    const impressions = toNumberValue(user.daily_metrics.search_impressions, 0);
    const newMatches = toNumberValue(user.daily_metrics.new_matches, 0);
    const improved = toNumberValue(user.daily_metrics.improved_matches, 0);

    const summary = topMatch
      ? `Daily update: top match is ${topMatch.other.full_name} at ${topMatch.percentage}%.`
      : "Daily update: compatibility scores were recalculated for your profile.";

    const social = `${views} profile views, ${interactions} interactions, ${impressions} search appearances today.`;
    const quality = `New matches: ${newMatches}. Improved matches: ${improved}.`;
    const text = `${summary} ${social} ${quality}`;

    createNotificationRecord(
      db,
      {
        nowIso,
        type: "daily_update",
        to_user_id: user.id,
        badge_key: "my_planet",
        dedupe_key: `daily_update:${user.id}:${dayKey}`,
        text
      },
      createdNotifications
    );

    user.daily_highlight = {
      day: dayKey,
      text,
      top_match_user_id: topMatch?.other?.id || "",
      top_match_percentage: topMatch?.percentage || 0
    };
    user.last_daily_update_day = dayKey;
  });
}

function runEngagementEngine(db, options = {}) {
  const nowIso = options.nowIso || defaultNow();
  const nowMs = Date.parse(nowIso);
  const lastRunMs = Date.parse(db?.meta?.last_engagement_run_at || "");
  const canRun =
    options.force === true ||
    !Number.isFinite(lastRunMs) ||
    !Number.isFinite(nowMs) ||
    nowMs - lastRunMs >= ENGAGEMENT_ENGINE_MIN_INTERVAL_MS;

  if (!canRun) {
    return [];
  }

  if (db?.meta && Number.isFinite(nowMs)) {
    db.meta.last_engagement_run_at = nowIso;
  }

  const createdNotifications = [];
  recalculateMatchesAndEvents(db, nowIso, createdNotifications);
  createDailyHighlights(db, nowIso, createdNotifications);

  if (db.activityLogs.length > 5000) {
    db.activityLogs = db.activityLogs.slice(-5000);
  }

  return createdNotifications;
}

const entityHandlers = Object.fromEntries(
  Object.keys(entityMap).map((entityName) => [
    entityName,
    {
      async list(sortBy, limit) {
        ensureEntityExists(entityName);
        const db = loadDb();
        if (adminOnlyEntities.has(entityName)) ensureAdminAccess(db);
        const rows = db[entityMap[entityName]];
        return clone(applySortingAndLimit(rows, sortBy, limit));
      },
      async filter(query = {}, sortBy, limit) {
        ensureEntityExists(entityName);
        const db = loadDb();
        if (adminOnlyEntities.has(entityName)) ensureAdminAccess(db);
        const rows = db[entityMap[entityName]].filter((record) => matchesQuery(record, query));
        return clone(applySortingAndLimit(rows, sortBy, limit));
      },
      async create(data) {
        ensureEntityExists(entityName);
        const now = defaultNow();
        let created = null;
        let generatedNotifications = [];
        const dbAfterSave = saveDb((db) => {
          if (adminOnlyEntities.has(entityName)) ensureAdminAccess(db);
          const rows = db[entityMap[entityName]];
          const nextRecord = {
            id: data?.id || randomId(entityName.toLowerCase()),
            created_date: now,
            updated_date: now,
            ...clone(data || {})
          };

          if (entityName === "Notification") {
            nextRecord.type = toStringValue(nextRecord.type, "system");
            nextRecord.is_read = toBool(nextRecord.is_read, false);
            nextRecord.priority = toNumberValue(nextRecord.priority, getNotificationPriority(nextRecord.type));
            nextRecord.badge_key = nextRecord.badge_key || getBadgeKeyFromNotificationType(nextRecord.type);
            if (nextRecord.push_enabled !== false) {
              nextRecord.push_enabled = shouldEnablePushForNotification(
                db,
                nextRecord.to_user_id,
                nextRecord.priority,
                getDayKey(now)
              );
            }
          }
          if (entityName === "Interest") {
            const normalizedCategory = normalizeDomainCategoryId(nextRecord.category);
            if (!normalizedCategory) {
              throw new Error("Invalid category. Use one of the 5 Core Domains.");
            }
            nextRecord.category = normalizedCategory;
          }
          if (entityName === "User") {
            nextRecord.key_interest_categories = normalizeDomainCategoryArray(nextRecord.key_interest_categories, []);
            nextRecord.onboarding_completed = isOnboardingCompleteForUser(nextRecord);
            nextRecord.onboarding_required =
              !nextRecord.onboarding_completed && normalizeRole(nextRecord.role || nextRecord._app_role) !== "admin";
          }
          if (entityName === "UserProfile") {
            nextRecord.key_interest_categories = normalizeDomainCategoryArray(nextRecord.key_interest_categories, []);
          }

          rows.push(nextRecord);

          if (entityName === "User") {
            ensureProfileUpToDate(db, nextRecord);
          }

          if (entityName === "Notification") {
            const recipient = db.users.find((item) => item.id === nextRecord.to_user_id);
            if (recipient && !recipient.disabled && nextRecord.badge_key) {
              incrementBadge(recipient, nextRecord.badge_key, 1);
            }
          }

          if (entityName !== "Notification") {
            generatedNotifications = runEngagementEngine(db, { nowIso: now });
          }

          created = nextRecord;
        });

        if (!created && dbAfterSave[entityMap[entityName]].length) {
          created = dbAfterSave[entityMap[entityName]].slice(-1)[0];
        }
        emitEntityEvent(entityName, { type: "create", id: created.id, data: clone(created) });
        generatedNotifications.forEach((notification) => {
          emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
        });
        return clone(created);
      },
      async update(id, data) {
        ensureEntityExists(entityName);
        let updated = null;
        let generatedNotifications = [];
        const dbAfterSave = saveDb((db) => {
          if (adminOnlyEntities.has(entityName)) ensureAdminAccess(db);
          const rows = db[entityMap[entityName]];
          const target = rows.find((record) => record.id === id);
          if (!target) {
            throw new Error(`${entityName} record not found: ${id}`);
          }
          Object.assign(target, clone(data || {}), { updated_date: defaultNow() });
          if (entityName === "Interest" && Object.prototype.hasOwnProperty.call(data || {}, "category")) {
            const normalizedCategory = normalizeDomainCategoryId(target.category);
            if (!normalizedCategory) {
              throw new Error("Invalid category. Use one of the 5 Core Domains.");
            }
            target.category = normalizedCategory;
          }
          if (entityName === "User") {
            target.key_interest_categories = normalizeDomainCategoryArray(target.key_interest_categories, []);
            target.onboarding_completed = isOnboardingCompleteForUser(target);
            target.onboarding_required =
              !target.onboarding_completed && normalizeRole(target.role || target._app_role) !== "admin";
          }
          if (entityName === "UserProfile") {
            target.key_interest_categories = normalizeDomainCategoryArray(target.key_interest_categories, []);
          }
          if (entityName === "User") {
            ensureProfileUpToDate(db, target);
          }
          if (entityName !== "Notification") {
            generatedNotifications = runEngagementEngine(db, { nowIso: defaultNow() });
          }
          updated = target;
        });
        if (!updated) {
          updated = dbAfterSave[entityMap[entityName]].find((record) => record.id === id);
        }
        emitEntityEvent(entityName, { type: "update", id, data: clone(updated) });
        generatedNotifications.forEach((notification) => {
          emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
        });
        return clone(updated);
      },
      async delete(id) {
        ensureEntityExists(entityName);
        let removed = null;
        let generatedNotifications = [];
        saveDb((db) => {
          if (adminOnlyEntities.has(entityName)) ensureAdminAccess(db);
          const rows = db[entityMap[entityName]];
          const idx = rows.findIndex((record) => record.id === id);
          if (idx >= 0) {
            removed = rows[idx];
            rows.splice(idx, 1);
          }
          if (entityName === "User") {
            db.userProfiles = db.userProfiles.filter((p) => p.user_id !== id);
          }
          if (entityName !== "Notification") {
            generatedNotifications = runEngagementEngine(db, { nowIso: defaultNow() });
          }
        });
        if (removed) {
          emitEntityEvent(entityName, { type: "delete", id, data: clone(removed) });
        }
        generatedNotifications.forEach((notification) => {
          emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
        });
        return clone(removed);
      },
      subscribe(callback) {
        const listeners = subscribers.get(entityName) || new Set();
        listeners.add(callback);
        subscribers.set(entityName, listeners);
        return () => {
          const current = subscribers.get(entityName);
          if (!current) return;
          current.delete(callback);
        };
      }
    }
  ])
);

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function handleLocalLLM({ prompt, response_json_schema }) {
  const db = loadDb();
  const me = getCurrentUser(db);

  // Structured response for Perfect Match widget
  if (response_json_schema && typeof response_json_schema === "object") {
    const others = db.users.filter((u) => u.id !== me.id && !u.disabled);
    if (!others.length) {
      return {
        user_id: "",
        match_score: 0,
        matching_categories: [],
        compatibility_factors: { interests: 0, mood: 0, values: 0, interaction: 0 },
        reason: "No users available for matching."
      };
    }

    let best = null;
    for (const candidate of others) {
      const score = calculateLocalMatchScore(me, candidate, db.interests, db.messages);
      if (!best || score.percentage > best.score.percentage) {
        best = { user: candidate, score };
      }
    }

    return {
      user_id: best.user.id,
      match_score: best.score.percentage,
      matching_categories: best.score.matchedCategories,
      compatibility_factors: {
        interests: Math.min(100, best.score.matchedCategories.length * 20),
        mood: me.mood && me.mood === best.user.mood ? 100 : 40,
        values: me.quote && best.user.quote ? 70 : 35,
        interaction: Math.min(100, Math.round((db.messages.filter(
          (msg) =>
            (msg.from_user_id === me.id && msg.to_user_id === best.user.id) ||
            (msg.from_user_id === best.user.id && msg.to_user_id === me.id)
        ).length / 10) * 100))
      },
      reason: `${best.user.full_name} has the strongest local compatibility profile based on shared categories, mood and interaction history.`
    };
  }

  const lower = String(prompt || "").toLowerCase();
  if (lower.includes("bio")) {
    return `Explorer of ideas and people. ${me?.mood ? `Current vibe: ${me.mood}.` : ""}`;
  }
  if (lower.includes("motto") || lower.includes("quote")) {
    return "Build meaningful circles, one honest connection at a time.";
  }
  return "Local LLM simulation response.";
}

const integrations = {
  Core: {
    async UploadFile({ file }) {
      const file_url = await fileToDataUrl(file);
      return { file_url };
    },
    async InvokeLLM(payload) {
      return handleLocalLLM(payload || {});
    }
  }
};

const auth = {
  async me() {
    const db = loadDb();
    const user = getCurrentUser(db);
    if (!user) {
      const error = new Error("Authentication required");
      error.status = 401;
      throw error;
    }
    ensureUserEngagementShape(user);
    ensureUserAuthShape(user);
    return clone(user);
  },

  async updateMe(data) {
    let generatedNotifications = [];
    const updated = saveDb((db) => {
      const user = getCurrentUser(db);
      if (!user) throw new Error("Authentication required");
      Object.assign(user, clone(data || {}), { updated_date: defaultNow() });
      ensureUserEngagementShape(user);
      ensureProfileUpToDate(db, user);
      generatedNotifications = runEngagementEngine(db, { nowIso: defaultNow() });
    });
    const user = getCurrentUser(updated);
    emitEntityEvent("User", { type: "update", id: user.id, data: clone(user) });
    generatedNotifications.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return clone(user);
  },

  async deleteMe() {
    saveDb((db) => {
      const user = getCurrentUser(db);
      if (!user) throw new Error("Authentication required");
      if (isAdmin(user) && db.users.filter((u) => isAdmin(u) && !u.disabled).length <= 1) {
        throw new Error("Cannot delete the last admin account");
      }
      db.users = db.users.filter((u) => u.id !== user.id);
      db.userProfiles = db.userProfiles.filter((p) => p.user_id !== user.id);
      db.interests = db.interests.filter((i) => i.user_id !== user.id);
      db.messages = db.messages.filter((m) => m.from_user_id !== user.id && m.to_user_id !== user.id);
      db.notifications = db.notifications.filter((n) => n.from_user_id !== user.id && n.to_user_id !== user.id);
      db.matches = db.matches.filter((m) => m.from_user_id !== user.id && m.to_user_id !== user.id);
      db.pulses = db.pulses.filter((p) => p.user_id !== user.id);
      db.subscriptions = db.subscriptions.filter((s) => s.user_id !== user.id);
      setCurrentUser(null);
    });
    return { success: true };
  },

  redirectToLogin(nextUrl) {
    if (typeof window === "undefined") return;
    let next = nextUrl;
    if (!next) {
      next = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    } else if (typeof next === "string" && /^https?:\/\//i.test(next)) {
      try {
        const parsed = new URL(next);
        next = `${parsed.pathname}${parsed.search}${parsed.hash}`;
      } catch {
        next = "/";
      }
    }
    const target = `/Login?next=${encodeURIComponent(next)}`;
    window.location.href = target;
  },

  async loginWithProvider(providerInput, payload = {}) {
    const provider = normalizeAuthProvider(providerInput || payload?.provider);
    if (!provider || provider === "email") {
      throw new Error("Unsupported auth provider");
    }

    const email = normalizeEmail(payload?.email);
    if (!email) {
      throw new Error(`Email is required for ${provider} sign in`);
    }

    const firstName = String(payload?.first_name || "").trim();
    const lastName = String(payload?.last_name || "").trim();
    const phone = String(payload?.phone || "").trim();
    const username = String(payload?.username || "").trim().toLowerCase();
    const fullName = String(
      payload?.full_name || `${firstName} ${lastName}`.trim() || email.split("@")[0]
    ).trim();

    let changedType = "update";
    let targetUserId = "";
    let generatedNotifications = [];

    const updatedDb = saveDb((db) => {
      let user = db.users.find((item) => normalizeEmail(item.email) === email);
      if (user?.disabled) {
        throw new Error("User account is disabled");
      }

      if (!user) {
        changedType = "create";
        user = createDefaultUser({
          email,
          full_name: fullName || email.split("@")[0],
          role: "user",
          password: `oauth_${randomId("pwd")}`,
          coins: 100
        });
        user.username = username;
        user.first_name = firstName;
        user.last_name = lastName;
        user.phone = phone;
        user.age_confirmed = true;
        user.terms_accepted = true;
        user.onboarding_completed = false;
        user.onboarding_required = true;
        user.onboarding_step = "profile_photo";
        user.key_interest_categories = [];
        user.tutorial_v2_step = "onboarding_pending";
        user.tutorial_completed = false;
        user.welcomed = true;
        db.users.push(user);
      } else {
        if (!user.first_name && firstName) user.first_name = firstName;
        if (!user.last_name && lastName) user.last_name = lastName;
        if (!user.phone && phone) user.phone = phone;
        if (!user.username && username) user.username = username;
        if (!user.full_name && fullName) user.full_name = fullName;
      }

      ensureUserAuthShape(user);
      if (!user.oauth_accounts.includes(provider)) {
        user.oauth_accounts.push(provider);
      }
      user.auth_provider = provider;
      user.updated_date = defaultNow();

      ensureProfileUpToDate(db, user);
      setCurrentUser(user.id);
      targetUserId = user.id;
      generatedNotifications = runEngagementEngine(db, { nowIso: defaultNow() });
    });

    const targetUser = updatedDb.users.find((item) => item.id === targetUserId);
    if (!targetUser) throw new Error("Provider sign in failed");

    emitEntityEvent("User", { type: changedType, id: targetUser.id, data: clone(targetUser) });
    generatedNotifications.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });

    return {
      access_token: `local_${provider}_${targetUser.id}`,
      provider,
      is_new_user: changedType === "create",
      user: clone(targetUser)
    };
  },

  logout(redirectUrl) {
    setCurrentUser(null);
    if (typeof window !== "undefined") {
      if (redirectUrl) {
        window.location.href = redirectUrl;
      }
    }
  },

  setToken() {
    // No-op in local mode
  },

  async clearBadge(section) {
    if (!section) return { success: true };
    const key = String(section);
    const updated = saveDb((db) => {
      const me = getCurrentUser(db);
      if (!me) throw new Error("Authentication required");
      ensureUserEngagementShape(me);
      if (Object.prototype.hasOwnProperty.call(me.badges, key)) {
        me.badges[key] = 0;
        me.updated_date = defaultNow();
      }
    });
    const user = getCurrentUser(updated);
    emitEntityEvent("User", { type: "update", id: user.id, data: clone(user) });
    return { success: true, badges: clone(user.badges || DEFAULT_BADGES) };
  },

  async recordProfileView(targetUserId) {
    if (!targetUserId) return { success: false };
    let generated = [];
    const nowIso = defaultNow();
    saveDb((db) => {
      const me = getCurrentUser(db);
      if (!me) throw new Error("Authentication required");
      const target = db.users.find((item) => item.id === targetUserId && !item.disabled);
      if (!target || target.id === me.id) return;

      const dayKey = getDayKey(nowIso);
      ensureDailyMetrics(target, dayKey);
      target.daily_metrics.profile_views += 1;
      target.updated_date = nowIso;

      createNotificationRecord(
        db,
        {
          nowIso,
          type: "profile_view",
          from_user_id: me.id,
          to_user_id: target.id,
          badge_key: "my_planet",
          dedupe_key: `profile_view:${me.id}:${target.id}:${dayKey}`,
          text: `${me.full_name} viewed your planet.`
        },
        generated
      );

      if (target.daily_metrics.profile_views === 3) {
        createNotificationRecord(
          db,
          {
            nowIso,
            type: "social_proof",
            to_user_id: target.id,
            badge_key: "my_planet",
            dedupe_key: `social_profile_views:${target.id}:${dayKey}:3`,
            text: "3 people viewed your planet today."
          },
          generated
        );
      }
    });

    generated.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return { success: true };
  },

  async recordProfileInteraction(targetUserId, categoryId = "") {
    if (!targetUserId) return { success: false };
    let generated = [];
    const nowIso = defaultNow();
    saveDb((db) => {
      const me = getCurrentUser(db);
      if (!me) throw new Error("Authentication required");
      const target = db.users.find((item) => item.id === targetUserId && !item.disabled);
      if (!target || target.id === me.id) return;

      const dayKey = getDayKey(nowIso);
      ensureDailyMetrics(target, dayKey);
      target.daily_metrics.category_interactions += 1;
      target.updated_date = nowIso;

      createNotificationRecord(
        db,
        {
          nowIso,
          type: "profile_interaction",
          from_user_id: me.id,
          to_user_id: target.id,
          badge_key: "my_planet",
          dedupe_key: `profile_interaction:${me.id}:${target.id}:${categoryId}:${dayKey}`,
          text: `${me.full_name} interacted with your ${categoryId || "profile"} category.`
        },
        generated
      );
    });

    generated.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return { success: true };
  },

  async trackSearchImpressions(userIds = []) {
    const targets = uniqueStringArray(userIds, []).filter(Boolean);
    if (!targets.length) return { success: true };
    let generated = [];
    const nowIso = defaultNow();
    saveDb((db) => {
      const me = getCurrentUser(db);
      if (!me) throw new Error("Authentication required");
      const dayKey = getDayKey(nowIso);

      targets.forEach((targetUserId) => {
        if (targetUserId === me.id) return;
        const target = db.users.find((item) => item.id === targetUserId && !item.disabled);
        if (!target) return;

        const logKey = `search_impression:${me.id}:${target.id}:${dayKey}`;
        const exists = db.activityLogs.some((item) => item.key === logKey);
        if (exists) return;

        db.activityLogs.push({
          id: randomId("activity"),
          key: logKey,
          type: "search_impression",
          actor_user_id: me.id,
          target_user_id: target.id,
          created_date: nowIso
        });

        ensureDailyMetrics(target, dayKey);
        target.daily_metrics.search_impressions += 1;
        target.updated_date = nowIso;

        if (target.daily_metrics.search_impressions === 5) {
          createNotificationRecord(
            db,
            {
              nowIso,
              type: "social_proof",
              to_user_id: target.id,
              badge_key: "my_planet",
              dedupe_key: `social_search:${target.id}:${dayKey}:5`,
              text: "Your profile appeared in search results today."
            },
            generated
          );
        }
      });
    });

    generated.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return { success: true };
  },

  async loginViaEmailPassword(email, password) {
    const db = loadDb();
    const normalized = normalizeEmail(email);
    const fallbackName = String(email || "").trim().toLowerCase();
    const user = db.users.find((u) => {
      if (u.disabled) return false;
      const byEmail = normalizeEmail(u.email) === normalized;
      const byName =
        !normalized.includes("@") &&
        fallbackName.length > 0 &&
        String(u.full_name || "").trim().toLowerCase() === fallbackName;
      return byEmail || byName;
    });

    const suppliedPassword = String(password || "").trim();
    const storedPassword = String(user?.password || "").trim();
    const isAdminLogin =
      normalizeEmail(user?.email || "") === "admin@mindcircle.local" ||
      normalized === "admin@mindcircle.local";
    const defaultPasswordAllowed = isAdminLogin ? "admin12345" : "welcome12345";
    const passwordMatched = suppliedPassword === storedPassword || suppliedPassword === defaultPasswordAllowed;

    if (!user || !passwordMatched) {
      throw new Error("Invalid email or password");
    }

    if (storedPassword !== suppliedPassword) {
      user.password = suppliedPassword;
      user.updated_date = defaultNow();
      persistDb(db);
    }

    setCurrentUser(user.id);
    return { access_token: `local_${user.id}`, user: clone(user) };
  },

  async isAuthenticated() {
    try {
      await auth.me();
      return true;
    } catch {
      return false;
    }
  },

  async inviteUser(userEmail, role = "user") {
    const email = normalizeEmail(userEmail);
    if (!email) throw new Error("Email is required");
    if (!["user", "admin"].includes(role)) throw new Error("Role must be user or admin");

    let invitedUser = null;
    let generatedNotifications = [];
    const db = saveDb((state) => {
      const me = getCurrentUser(state);
      if (!isAdmin(me)) {
        const error = new Error("Admin role required for invites");
        error.status = 403;
        throw error;
      }

      const existing = state.users.find((u) => normalizeEmail(u.email) === email);
      if (existing) {
        existing.role = role;
        existing._app_role = role;
        existing.disabled = false;
        existing.updated_date = defaultNow();
        invitedUser = existing;
        ensureProfileUpToDate(state, existing);
      } else {
        invitedUser = createDefaultUser({
          email,
          full_name: email.split("@")[0],
          role,
          is_premium: false,
          password: "welcome12345",
          coins: 100
        });
        invitedUser.invited = true;
        state.users.push(invitedUser);
        ensureProfileUpToDate(state, invitedUser);
      }

      state.invites.unshift({
        id: randomId("invite"),
        email,
        user_id: invitedUser.id,
        role,
        invited_by: me?.id,
        status: "sent",
        created_date: defaultNow()
      });
      generatedNotifications = runEngagementEngine(state, { nowIso: defaultNow() });
    });

    const finalUser = db.users.find((u) => u.id === invitedUser.id);
    emitEntityEvent("User", { type: "create", id: finalUser.id, data: clone(finalUser) });
    generatedNotifications.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return { success: true, user: clone(finalUser) };
  },

  async register(payload) {
    const email = normalizeEmail(payload?.email);
    const password = String(payload?.password || "");
    const username = String(payload?.username || "").trim().toLowerCase();
    const firstName = String(payload?.first_name || "").trim();
    const lastName = String(payload?.last_name || "").trim();
    const phone = String(payload?.phone || "").trim();
    const ageConfirmed = toBool(payload?.age_confirmed, false);
    const termsAccepted = toBool(payload?.terms_accepted, false);

    if (!username || !firstName || !lastName || !email || !phone || !password) {
      throw new Error("All registration fields are required");
    }
    if (!ageConfirmed) {
      throw new Error("You must confirm age 18+");
    }
    if (!termsAccepted) {
      throw new Error("You must accept Terms and Conditions");
    }

    const db = loadDb();
    if (db.users.some((u) => normalizeEmail(u.email) === email)) {
      throw new Error("User already exists");
    }
    if (db.users.some((u) => String(u.username || "").trim().toLowerCase() === username)) {
      throw new Error("Username is already taken");
    }

    let generatedNotifications = [];
    const user = saveDb((state) => {
      const created = createDefaultUser({
        email,
        full_name: `${firstName} ${lastName}`.trim(),
        role: "user",
        password,
        coins: 100
      });
      created.username = username;
      created.first_name = firstName;
      created.last_name = lastName;
      created.phone = phone;
      created.age_confirmed = true;
      created.terms_accepted = true;
      created.onboarding_completed = false;
      created.onboarding_required = true;
      created.onboarding_step = "profile_photo";
      created.key_interest_categories = [];
      created.tutorial_v2_step = "onboarding_pending";
      created.tutorial_completed = false;
      created.welcomed = true;
      state.users.push(created);
      ensureProfileUpToDate(state, created);
      setCurrentUser(created.id);
      generatedNotifications = runEngagementEngine(state, { nowIso: defaultNow() });
    });

    const createdUser = getCurrentUser(user);
    emitEntityEvent("User", { type: "create", id: createdUser.id, data: clone(createdUser) });
    generatedNotifications.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });
    return { success: true, user: clone(createdUser) };
  },

  async importUsers(payload) {
    const { users, profiles, interests } = normalizeImportPayload(payload);
    if (!users.length) {
      throw new Error("Import payload has no users");
    }

    const profileByEmail = new Map();
    const interestsByEmail = new Map();
    const interestsByUserId = new Map();

    profiles.forEach((profile) => {
      const email = normalizeEmail(profile?.email || profile?.user_email);
      if (email) profileByEmail.set(email, profile);
      const userId = profile?.user_id;
      if (userId) profileByEmail.set(String(userId), profile);
    });

    interests.forEach((interest) => {
      const email = normalizeEmail(interest?.user_email || interest?.email);
      const userId = interest?.user_id ? String(interest.user_id) : "";

      if (email) {
        const list = interestsByEmail.get(email) || [];
        list.push(interest);
        interestsByEmail.set(email, list);
      }
      if (userId) {
        const list = interestsByUserId.get(userId) || [];
        list.push(interest);
        interestsByUserId.set(userId, list);
      }
    });

    const summary = {
      total: users.length,
      created: 0,
      updated: 0,
      importedInterests: 0,
      skipped: 0,
      errors: []
    };

    const changedUsers = [];
    let generatedNotifications = [];
    const updatedDb = saveDb((db) => {
      const me = getCurrentUser(db);
      if (!isAdmin(me)) {
        throw new Error("Admin role required");
      }

      users.forEach((entry, index) => {
        try {
          const rawUser = entry?.user && typeof entry.user === "object" ? entry.user : entry || {};
          const email = normalizeEmail(rawUser.email || entry?.email || entry?.profile?.email);
          if (!email) {
            summary.skipped += 1;
            return;
          }

          const importedProfile =
            (entry?.profile && typeof entry.profile === "object" ? entry.profile : null) ||
            profileByEmail.get(email) ||
            profileByEmail.get(String(rawUser.id || ""));

          const role = normalizeRole(rawUser.role || rawUser._app_role || entry?.role);
          const fullName = toStringValue(
            rawUser.full_name || rawUser.name || importedProfile?.full_name || importedProfile?.name || email.split("@")[0],
            email.split("@")[0]
          );

          const isPremium = toBool(rawUser.is_premium ?? importedProfile?.is_premium, false);
          const premiumTheme = toStringValue(rawUser.premium_theme || importedProfile?.premium_theme, "default");
          const ownedThemes = uniqueStringArray(rawUser.owned_themes || importedProfile?.owned_themes, ["default"]);
          const resolvedOwnedThemes = ownedThemes.includes("default")
            ? ownedThemes
            : ["default", ...ownedThemes];
          const importedKeyCategories = normalizeDomainCategoryArray(
            rawUser.key_interest_categories || importedProfile?.key_interest_categories,
            []
          );
          const importedProfilePhoto = toStringValue(rawUser.profile_photo || importedProfile?.profile_photo, "");
          const inferredOnboardingCompleted = toBool(
            rawUser.onboarding_completed ?? importedProfile?.onboarding_completed,
            Boolean(importedProfilePhoto) && importedKeyCategories.length >= 3
          );

          const mergedFields = {
            email,
            full_name: fullName,
            username: toStringValue(rawUser.username || importedProfile?.username, ""),
            first_name: toStringValue(rawUser.first_name || importedProfile?.first_name, ""),
            last_name: toStringValue(rawUser.last_name || importedProfile?.last_name, ""),
            phone: toStringValue(rawUser.phone || importedProfile?.phone, ""),
            age_confirmed: toBool(rawUser.age_confirmed, false),
            terms_accepted: toBool(rawUser.terms_accepted, false),
            role,
            _app_role: role,
            disabled: false,
            is_premium: isPremium,
            premium_theme: premiumTheme,
            owned_themes: resolvedOwnedThemes,
            onboarding_required: role !== "admin" && !inferredOnboardingCompleted,
            onboarding_step: toStringValue(
              rawUser.onboarding_step,
              role === "admin" || inferredOnboardingCompleted ? "completed" : "profile_photo"
            ),
            key_interest_categories: importedKeyCategories,
            tutorial_v2_step: toStringValue(
              rawUser.tutorial_v2_step,
              role === "admin" || inferredOnboardingCompleted ? "completed" : "onboarding_pending"
            ),
            coins: toNumberValue(rawUser.coins, 100),
            profile_photo: importedProfilePhoto,
            bio: toStringValue(rawUser.bio || importedProfile?.bio, ""),
            quote: toStringValue(rawUser.quote || importedProfile?.quote, ""),
            mood: toStringValue(rawUser.mood || importedProfile?.mood, ""),
            background_url: toStringValue(rawUser.background_url || importedProfile?.background_url, ""),
            payment_method: toStringValue(rawUser.payment_method || importedProfile?.payment_method, ""),
            blocked_users: uniqueStringArray(rawUser.blocked_users || importedProfile?.blocked_users, []),
            onboarding_completed: inferredOnboardingCompleted,
            welcomed: toBool(rawUser.welcomed, role === "admin"),
            tutorial_completed: toBool(rawUser.tutorial_completed, role === "admin" || inferredOnboardingCompleted),
            updated_date: defaultNow()
          };

          let target = db.users.find((u) => normalizeEmail(u.email) === email);
          let changeType = "update";

          if (target) {
            Object.assign(target, mergedFields);
            summary.updated += 1;
          } else {
            target = createDefaultUser({
              email,
              full_name: fullName,
              role,
              is_premium: isPremium,
              password: toStringValue(rawUser.password, "welcome12345"),
              coins: mergedFields.coins
            });
            Object.assign(target, mergedFields, {
              created_date: defaultNow()
            });
            db.users.push(target);
            summary.created += 1;
            changeType = "create";
          }

          ensureProfileUpToDate(db, target);
          changedUsers.push({ id: target.id, type: changeType });

          const inlineInterests = toArray(entry?.interests);
          const mappedInterestsByEmail = toArray(interestsByEmail.get(email));
          const mappedInterestsByExternalId = toArray(interestsByUserId.get(String(rawUser.id || "")));
          const mappedInterestsByFinalId = toArray(interestsByUserId.get(String(target.id)));
          const allInterests = [
            ...inlineInterests,
            ...mappedInterestsByEmail,
            ...mappedInterestsByExternalId,
            ...mappedInterestsByFinalId
          ];

          allInterests.forEach((interest, interestIndex) => {
            const category = normalizeDomainCategoryId(
              toStringValue(interest?.category || interest?.type || "hobbies_activities", "hobbies_activities")
            );
            if (!category) return;
            const title = toStringValue(interest?.title || interest?.name || interest?.label, "").trim();
            if (!title) return;

            const photoUrl = toStringValue(interest?.photo_url || interest?.photo, "");
            const description = toStringValue(interest?.description, "");
            const position = Number.isFinite(Number(interest?.position)) ? Number(interest.position) : interestIndex + 1;

            const exists = db.interests.some(
              (item) =>
                item.user_id === target.id &&
                item.category === category &&
                item.title === title &&
                String(item.photo_url || "") === photoUrl
            );

            if (exists) return;

            db.interests.push({
              id: randomId("interest"),
              user_id: target.id,
              category,
              title,
              photo_url: photoUrl,
              description,
              position,
              created_date: defaultNow(),
              updated_date: defaultNow()
            });
            summary.importedInterests += 1;
          });
        } catch (error) {
          summary.errors.push({
            index,
            email: entry?.email || entry?.user?.email || null,
            message: error?.message || "Unknown import error"
          });
        }
      });
      generatedNotifications = runEngagementEngine(db, { nowIso: defaultNow() });
    });

    changedUsers.forEach((event) => {
      const user = updatedDb.users.find((u) => u.id === event.id);
      if (!user) return;
      emitEntityEvent("User", { type: event.type, id: user.id, data: clone(user) });
    });
    generatedNotifications.forEach((notification) => {
      emitEntityEvent("Notification", { type: "create", id: notification.id, data: clone(notification) });
    });

    return summary;
  },

  async assumeUser(userId) {
    if (!userId) throw new Error("User ID is required");
    saveDb((db) => {
      const me = getCurrentUser(db);
      if (!isAdmin(me)) {
        throw new Error("Only admin can switch active user");
      }
      const target = db.users.find((u) => u.id === userId);
      if (!target) throw new Error("User not found");
      if (target.disabled) throw new Error("Cannot switch into a disabled user");
      setCurrentUser(target.id);
    });
    return auth.me();
  },

  async verifyOtp(payload = {}) {
    const email = normalizeEmail(payload?.email);
    const code = String(payload?.code || payload?.otp || "").trim();
    if (!email || !code) return { success: false };

    const nowMs = Date.now();
    const db = loadDb();
    const validRequest = db.passwordResetRequests.find(
      (item) =>
        normalizeEmail(item.email) === email &&
        String(item.code || "").trim() === code &&
        !item.used &&
        Date.parse(item.expires_date || "") > nowMs
    );
    return { success: Boolean(validRequest) };
  },
  async resendOtp(payload = {}) {
    return auth.resetPasswordRequest(payload);
  },
  async resetPasswordRequest(payload = {}) {
    const email = normalizeEmail(typeof payload === "string" ? payload : payload?.email);
    if (!email) throw new Error("Email is required");

    const now = new Date();
    const nowIso = now.toISOString();
    const expiresDate = new Date(now.getTime() + PASSWORD_RESET_CODE_TTL_MINUTES * 60 * 1000).toISOString();
    let localResetCode = "";

    saveDb((db) => {
      const user = db.users.find((item) => normalizeEmail(item.email) === email && !item.disabled);
      db.passwordResetRequests = db.passwordResetRequests
        .filter((item) => Date.parse(item.expires_date || "") > Date.parse(nowIso) && !item.used)
        .slice(0, 200);

      if (!user) {
        return;
      }

      localResetCode = generatePasswordResetCode();
      db.passwordResetRequests.unshift({
        id: randomId("pwdreset"),
        user_id: user.id,
        email,
        code: localResetCode,
        provider: user.auth_provider || "email",
        created_date: nowIso,
        expires_date: expiresDate,
        used: false
      });
    });

    return {
      success: true,
      message: "If this email exists, a reset code has been generated.",
      local_reset_code: localResetCode,
      expires_in_minutes: PASSWORD_RESET_CODE_TTL_MINUTES
    };
  },
  async resetPassword(payload = {}) {
    const email = normalizeEmail(payload?.email);
    const code = String(payload?.code || payload?.otp || "").trim();
    const newPassword = String(payload?.newPassword || payload?.new_password || "").trim();
    if (!email || !code || !newPassword) {
      throw new Error("Email, reset code and new password are required");
    }
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters");
    }

    const nowIso = defaultNow();
    const nowMs = Date.parse(nowIso);

    saveDb((db) => {
      const user = db.users.find((item) => normalizeEmail(item.email) === email && !item.disabled);
      if (!user) throw new Error("Invalid reset code");

      const request = db.passwordResetRequests.find(
        (item) =>
          normalizeEmail(item.email) === email &&
          String(item.code || "").trim() === code &&
          !item.used &&
          Date.parse(item.expires_date || "") > nowMs
      );

      if (!request) {
        throw new Error("Invalid or expired reset code");
      }

      user.password = newPassword;
      user.updated_date = nowIso;
      ensureUserAuthShape(user);

      request.used = true;
      request.used_date = nowIso;
    });

    return { success: true };
  },
  async changePassword({ userId, currentPassword, newPassword }) {
    if (!userId || !newPassword) throw new Error("Missing password params");
    saveDb((db) => {
      const me = getCurrentUser(db);
      const isSelf = me?.id === userId;
      if (!isSelf && !isAdmin(me)) {
        throw new Error("Not allowed");
      }
      const target = db.users.find((u) => u.id === userId);
      if (!target) throw new Error("User not found");
      if (isSelf && target.password !== currentPassword) {
        throw new Error("Current password is incorrect");
      }
      target.password = String(newPassword);
      target.updated_date = defaultNow();
    });
    return { success: true };
  }
};

const appLogs = {
  async logUserInApp(pageName) {
    saveDb((db) => {
      const me = getCurrentUser(db);
      db.appLogs.unshift({
        id: randomId("log"),
        page: pageName,
        user_id: me?.id || null,
        created_date: defaultNow()
      });
      db.appLogs = db.appLogs.slice(0, 1000);
    });
    return { success: true };
  }
};

export const base44 = {
  auth,
  entities: entityHandlers,
  integrations,
  appLogs,
  analytics: {
    async track() {
      return { success: true };
    }
  },
  functions: {},
  agents: {},
  cleanup() {},
  setToken() {},
  getConfig() {
    return { serverUrl: "local", appId: "local-app", requiresAuth: false };
  },
  getLocalAdminCredentials() {
    return {
      email: "admin@mindcircle.local",
      password: "admin12345"
    };
  }
};
