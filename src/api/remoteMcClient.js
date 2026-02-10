function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestJson(method, path, body) {
  const res = await fetch(path, {
    method,
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }

  if (!res.ok) {
    const msg = json?.error || json?.message || text || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  return json;
}

async function requestBinaryUpload(file) {
  const res = await fetch("/api/uploads", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": file?.type || "application/octet-stream",
      "X-Filename": file?.name || "upload.bin"
    },
    body: file
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore
  }
  if (!res.ok) {
    const msg = json?.error || json?.message || text || `Upload failed (${res.status})`;
    throw new Error(msg);
  }
  return json;
}

const eventsHub = (() => {
  let running = false;
  let afterSeq = 0;
  let pollPromise = null;
  const listeners = new Map(); // entity -> Set<cb>

  function hasListeners() {
    for (const set of listeners.values()) {
      if (set && set.size) return true;
    }
    return false;
  }

  async function pollLoop() {
    running = true;
    while (running) {
      if (!hasListeners()) {
        running = false;
        break;
      }

      try {
        const data = await requestJson("GET", `/api/events?after=${encodeURIComponent(afterSeq)}`);
        const events = Array.isArray(data?.events) ? data.events : [];
        const latest = Number(data?.latest_seq || 0);
        if (Number.isFinite(latest) && latest > afterSeq) afterSeq = latest;

        events.forEach((evt) => {
          const entity = String(evt?.entity || "");
          const set = listeners.get(entity);
          if (!set || !set.size) return;
          set.forEach((cb) => {
            try {
              cb({
                type: evt.type,
                id: evt.id,
                data: evt.data
              });
            } catch {
              // ignore
            }
          });
        });
      } catch {
        // ignore transient failures; slow down a bit
      }

      await sleep(1200);
    }
  }

  function ensureRunning() {
    if (running) return;
    if (!hasListeners()) return;
    pollPromise = pollLoop();
  }

  return {
    subscribe(entity, cb) {
      const key = String(entity || "");
      if (!key) return () => {};
      const set = listeners.get(key) || new Set();
      set.add(cb);
      listeners.set(key, set);
      ensureRunning();
      return () => {
        const current = listeners.get(key);
        if (!current) return;
        current.delete(cb);
        if (current.size === 0) listeners.delete(key);
      };
    }
  };
})();

function createEntityClient(entityName) {
  const base = `/api/entities/${encodeURIComponent(entityName)}`;
  return {
    async list(sortBy, limit) {
      const url = new URL(base, window.location.origin);
      if (sortBy) url.searchParams.set("sortBy", String(sortBy));
      if (typeof limit === "number") url.searchParams.set("limit", String(limit));
      const res = await requestJson("GET", url.toString());
      return Array.isArray(res?.items) ? res.items : [];
    },
    async filter(query, sortBy, limit) {
      const res = await requestJson("POST", `${base}/filter`, {
        query: query || {},
        sortBy: sortBy || "",
        limit: typeof limit === "number" ? limit : null
      });
      return Array.isArray(res?.items) ? res.items : [];
    },
    async create(data) {
      const res = await requestJson("POST", base, { data: data || {} });
      return res?.item;
    },
    async update(id, data) {
      const res = await requestJson("PATCH", `${base}/${encodeURIComponent(id)}`, { data: data || {} });
      return res?.item;
    },
    async delete(id) {
      const res = await requestJson("DELETE", `${base}/${encodeURIComponent(id)}`);
      return res?.item ?? null;
    },
    subscribe(callback) {
      return eventsHub.subscribe(entityName, callback);
    }
  };
}

const entities = new Proxy(
  {},
  {
    get(_target, prop) {
      const key = String(prop || "");
      if (!key) return undefined;
      return createEntityClient(key);
    }
  }
);

const auth = {
  async me() {
    const res = await requestJson("GET", "/api/me");
    return res?.user;
  },
  async updateMe(data) {
    const res = await requestJson("PATCH", "/api/me", { data: data || {} });
    return res?.user;
  },
  async deleteMe() {
    return requestJson("DELETE", "/api/me");
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
  async loginViaEmailPassword(email, password) {
    const res = await requestJson("POST", "/api/auth/login", {
      email,
      password
    });
    return res;
  },
  async register(payload) {
    const res = await requestJson("POST", "/api/auth/register", payload || {});
    return res;
  },
  async loginWithProvider(providerInput, payload = {}) {
    const provider = String(providerInput || payload?.provider || "").trim();
    const res = await requestJson("POST", "/api/auth/provider", {
      provider,
      ...payload
    });
    return res;
  },
  async logout(redirectUrl) {
    try {
      await requestJson("POST", "/api/auth/logout");
    } catch {
      // ignore
    }
    if (typeof window !== "undefined" && redirectUrl) {
      window.location.href = redirectUrl;
    }
  },
  setToken() {
    // Cookie-based sessions; no token needed on the client.
  },
  async clearBadge(section) {
    return requestJson("POST", "/api/me/clear-badge", { key: section });
  },
  async recordProfileView(targetUserId) {
    return requestJson("POST", "/api/track/profile-view", { targetUserId });
  },
  async recordProfileInteraction(targetUserId, categoryId) {
    return requestJson("POST", "/api/track/profile-interaction", { targetUserId, categoryId });
  },
  async trackSearchImpressions(userIds) {
    return requestJson("POST", "/api/track/search-impressions", { userIds: userIds || [] });
  },
  async inviteUser(email, role) {
    return requestJson("POST", "/api/admin/invite", { email, role });
  },
  async importUsers(payload) {
    return requestJson("POST", "/api/admin/import-users", payload || {});
  },
  async assumeUser(userId) {
    return requestJson("POST", "/api/admin/assume", { userId });
  },
  async adminResetPassword(userId, payload = {}) {
    if (!userId) throw new Error("User ID is required");
    return requestJson("POST", `/api/admin/users/${encodeURIComponent(userId)}/reset-password`, payload || {});
  },
  async adminAdjustCoins(userId, payload = {}) {
    if (!userId) throw new Error("User ID is required");
    return requestJson("POST", `/api/admin/users/${encodeURIComponent(userId)}/coins`, payload || {});
  },
  async adminSetPremium(userId, payload = {}) {
    if (!userId) throw new Error("User ID is required");
    return requestJson("POST", `/api/admin/users/${encodeURIComponent(userId)}/premium`, payload || {});
  },
  async adminForceOnboarding(userId) {
    if (!userId) throw new Error("User ID is required");
    return requestJson("POST", `/api/admin/users/${encodeURIComponent(userId)}/force-onboarding`, {});
  },
  async adminClearUserContent(userId) {
    if (!userId) throw new Error("User ID is required");
    return requestJson("POST", `/api/admin/users/${encodeURIComponent(userId)}/clear-content`, {});
  },
  async adminBulkClearContent() {
    return requestJson("POST", "/api/admin/bulk/clear-content", {});
  },
  async adminListLogs(kind = "app", { limit = 200, userId = "" } = {}) {
    const url = new URL("/api/admin/logs", window.location.origin);
    url.searchParams.set("kind", String(kind));
    if (limit) url.searchParams.set("limit", String(limit));
    if (userId) url.searchParams.set("userId", String(userId));
    return requestJson("GET", url.toString());
  },
  async adminListEvents({ limit = 200, entity = "", type = "" } = {}) {
    const url = new URL("/api/admin/events", window.location.origin);
    if (limit) url.searchParams.set("limit", String(limit));
    if (entity) url.searchParams.set("entity", String(entity));
    if (type) url.searchParams.set("type", String(type));
    return requestJson("GET", url.toString());
  },
  async resetPasswordRequest(payload = {}) {
    return requestJson("POST", "/api/auth/password/reset-request", payload || {});
  },
  async resetPassword(payload = {}) {
    return requestJson("POST", "/api/auth/password/reset", payload || {});
  }
  ,
  async changePassword({ userId, currentPassword, newPassword }) {
    // userId is ignored in remote mode (derived from session)
    return requestJson("POST", "/api/me/change-password", { userId, currentPassword, newPassword });
  }
};

const integrations = {
  Core: {
    async UploadFile({ file }) {
      return requestBinaryUpload(file);
    },
    async InvokeLLM(payload) {
      const res = await requestJson("POST", "/api/integrations/llm", payload || {});
      // Keep parity with localMcClient: return the model output directly (string or object).
      return res?.result ?? res?.text ?? null;
    }
  }
};

const appLogs = {
  async logUserInApp(pageName) {
    return requestJson("POST", "/api/app-logs", { pageName });
  }
};

export const mc = {
  auth,
  entities,
  integrations,
  appLogs,
  getLocalAdminCredentials() {
    // Not applicable in remote mode.
    return null;
  }
};
