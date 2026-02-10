const KEY_PREFIX = "mc_coach_dismissed_v1:";

export function coachDismissalStorageKey(userId, coachKey) {
  const uid = String(userId || "").trim();
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

