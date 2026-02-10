const KEY_PREFIX = "mc_coach_dismissed_v1:";
const ANON_UID_KEY = "mc_coach_anon_uid_v1";

function getStableUserId(userId) {
  const uid = String(userId || "").trim();
  if (uid) return uid;
  if (typeof window === "undefined") return "";
  try {
    let v = sessionStorage.getItem(ANON_UID_KEY);
    if (!v) {
      v = `anon_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      sessionStorage.setItem(ANON_UID_KEY, v);
    }
    return v;
  } catch {
    return "";
  }
}

export function coachDismissalStorageKey(userId, coachKey) {
  const uid = getStableUserId(userId);
  const key = String(coachKey || "").trim();
  if (!uid || !key) return "";
  return `${KEY_PREFIX}${uid}:${key}`;
}

export function isCoachDismissed(userId, coachKey) {
  if (typeof window === "undefined") return false;
  const storageKey = coachDismissalStorageKey(userId, coachKey);
  if (!storageKey) return false;
  try {
    return sessionStorage.getItem(storageKey) === "1";
  } catch {
    return false;
  }
}

export function dismissCoach(userId, coachKey) {
  if (typeof window === "undefined") return;
  const storageKey = coachDismissalStorageKey(userId, coachKey);
  if (!storageKey) return;
  try {
    sessionStorage.setItem(storageKey, "1");
  } catch {
    // ignore
  }
}
