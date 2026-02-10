import { isAdminUser } from "@/lib/admin-utils";

export const NEW_USER_TUTORIAL_STEPS = new Set([
  "my_map_info_pending",
  "category_highlight",
  "category_center_photo",
  "category_additional_photo",
  "search_highlight",
  "search_info_pending",
  "matching_highlight"
]);

export function getKeyCategoriesCount(user) {
  if (!Array.isArray(user?.key_interest_categories)) return 0;
  const unique = new Set(
    user.key_interest_categories
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
  return unique.size;
}

export function hasProfilePhoto(user) {
  return Boolean(String(user?.profile_photo || "").trim());
}

export function isOnboardingComplete(user) {
  if (!user) return false;
  if (isAdminUser(user)) return true;
  return hasProfilePhoto(user) && getKeyCategoriesCount(user) >= 3;
}

export function shouldForceOnboarding(user) {
  if (!user) return false;
  if (isAdminUser(user)) return false;
  return !isOnboardingComplete(user);
}

export function canRunNewUserTutorial(user) {
  if (!user || isAdminUser(user)) return false;
  if (!isOnboardingComplete(user)) return false;
  if (user.tutorial_completed === true) return false;

  const onboardingStep = String(user.onboarding_step || "").trim().toLowerCase();
  if (onboardingStep && onboardingStep !== "completed") return false;

  const step = String(user.tutorial_v2_step || "").trim();
  if (!step || step === "onboarding_pending") return true;
  return NEW_USER_TUTORIAL_STEPS.has(step);
}
