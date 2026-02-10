export function isAdminUser(user) {
  if (!user) return false;
  const role = String(user.role || user._app_role || "").toLowerCase();
  return role === "admin" || user.is_admin === true;
}

