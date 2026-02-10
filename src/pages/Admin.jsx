import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { isAdminUser } from "@/lib/admin-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  RefreshCw,
  ArrowLeft,
  Crown,
  MessageCircle,
  Link2,
  LogIn
} from "lucide-react";

const defaultInviteState = {
  email: "",
  role: "user"
};

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

function toBool(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  const norm = String(value).trim().toLowerCase();
  return norm === "true" || norm === "1" || norm === "yes";
}

function parseBlockedUsers(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((item) => String(item));
  try {
    const parsed = JSON.parse(String(value));
    if (Array.isArray(parsed)) return parsed.map((item) => String(item));
  } catch {
    // ignore
  }
  return [];
}

function csvToImportPayload(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) {
    throw new Error("CSV has no data rows");
  }

  const headers = rows[0].map((h) => String(h || "").trim());
  const users = rows.slice(1).map((line) => {
    const record = {};
    headers.forEach((key, idx) => {
      record[key] = line[idx] ?? "";
    });

    const email = String(record.email || "").trim().toLowerCase();
    if (!email) return null;

    return {
      email,
      full_name: record.full_name || record.name || email.split("@")[0],
      role: "user",
      profile_photo: record.profile_photo || "",
      bio: record.bio || "",
      quote: record.quote || "",
      mood: record.mood || "",
      background_url: record.background_url || "",
      onboarding_completed: toBool(record.onboarding_completed, true),
      is_premium: toBool(record.is_premium, false),
      blocked_users: parseBlockedUsers(record.blocked_users),
      created_date: record.created_date || undefined,
      updated_date: record.updated_date || undefined
    };
  }).filter(Boolean);

  if (!users.length) {
    throw new Error("No valid users found in CSV");
  }

  return { users };
}

function formatDate(dateValue) {
  if (!dateValue) return "-";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function extractErrorMessage(error) {
  return (
    error?.data?.message ||
    error?.response?.data?.message ||
    error?.message ||
    "Unknown error"
  );
}

export default function Admin() {
  const [currentUser, setCurrentUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isReloading, setIsReloading] = React.useState(false);
  const [error, setError] = React.useState("");

  const [rows, setRows] = React.useState([]);
  const [canManageAccounts, setCanManageAccounts] = React.useState(false);
  const [actionUserId, setActionUserId] = React.useState(null);

  const [searchTerm, setSearchTerm] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState("all");
  const [statusFilter, setStatusFilter] = React.useState("all");

  const [inviteState, setInviteState] = React.useState(defaultInviteState);
  const [bulkInvites, setBulkInvites] = React.useState("");
  const [inviteHistory, setInviteHistory] = React.useState([]);
  const [inviting, setInviting] = React.useState(false);
  const [importPayload, setImportPayload] = React.useState("");
  const [importingUsers, setImportingUsers] = React.useState(false);
  const [importResult, setImportResult] = React.useState(null);
  const localAdminCredentials = base44.getLocalAdminCredentials?.();

  const loadAdminData = React.useCallback(async (isSoftReload = false) => {
    if (isSoftReload) setIsReloading(true);
    else setIsLoading(true);
    setError("");

    try {
      const me = await base44.auth.me();
      setCurrentUser(me);

      if (!isAdminUser(me)) {
        setRows([]);
        setCanManageAccounts(false);
        setError("Access denied: admin role is required.");
        return;
      }

      const [
        appUsers,
        profiles,
        interests,
        messages,
        matches,
        subscriptions,
        invites
      ] = await Promise.all([
        base44.entities.User.list().catch(() => null),
        base44.entities.UserProfile.list().catch(() => []),
        base44.entities.Interest.list().catch(() => []),
        base44.entities.Message.list().catch(() => []),
        base44.entities.Match.list().catch(() => []),
        base44.entities.Subscription.filter({ status: "active" }).catch(() => []),
        base44.entities.Invite.list("-created_date", 50).catch(() => [])
      ]);

      const hasUserEntityAccess = Array.isArray(appUsers);
      setCanManageAccounts(hasUserEntityAccess);

      const profilesById = new Map((profiles || []).map((p) => [p.user_id, p]));
      const appUsersById = new Map((appUsers || []).map((u) => [u.id, u]));

      const interestCount = {};
      (interests || []).forEach((item) => {
        interestCount[item.user_id] = (interestCount[item.user_id] || 0) + 1;
      });

      const messageCount = {};
      (messages || []).forEach((msg) => {
        if (msg.from_user_id) {
          messageCount[msg.from_user_id] = (messageCount[msg.from_user_id] || 0) + 1;
        }
        if (msg.to_user_id) {
          messageCount[msg.to_user_id] = (messageCount[msg.to_user_id] || 0) + 1;
        }
      });

      const matchCount = {};
      (matches || []).forEach((m) => {
        if (m.from_user_id) {
          matchCount[m.from_user_id] = (matchCount[m.from_user_id] || 0) + 1;
        }
        if (m.to_user_id) {
          matchCount[m.to_user_id] = (matchCount[m.to_user_id] || 0) + 1;
        }
      });

      const activeSubUsers = new Set((subscriptions || []).map((s) => s.user_id));
      const userIds = new Set([
        ...Object.keys(interestCount),
        ...Object.keys(messageCount),
        ...Object.keys(matchCount),
        ...Array.from(profilesById.keys()),
        ...Array.from(appUsersById.keys()),
        me.id
      ]);

      const normalizedRows = Array.from(userIds).map((id) => {
        const appUser = appUsersById.get(id);
        const profile = profilesById.get(id);
        const role = String(appUser?.role || "user").toLowerCase();

        return {
          id,
          full_name: appUser?.full_name || profile?.full_name || "Unnamed user",
          email: appUser?.email || profile?.email || "-",
          role,
          disabled: !!appUser?.disabled,
          onboarding_completed: !!(profile?.onboarding_completed || appUser?.onboarding_completed),
          is_premium: !!(appUser?.is_premium || profile?.is_premium || activeSubUsers.has(id)),
          interests: interestCount[id] || 0,
          messages: messageCount[id] || 0,
          matches: matchCount[id] || 0,
          created_date: appUser?.created_date || profile?.created_date || null
        };
      });

      normalizedRows.sort((a, b) => {
        const da = new Date(a.created_date || 0).getTime();
        const db = new Date(b.created_date || 0).getTime();
        return db - da;
      });

      setRows(normalizedRows);
      setInviteHistory(
        (invites || []).map((entry) => ({
          id: entry.id,
          email: entry.email,
          role: entry.role,
          status: entry.status || "sent",
          createdAt: entry.created_date
        }))
      );
    } catch (loadError) {
      setError(extractErrorMessage(loadError));
    } finally {
      setIsLoading(false);
      setIsReloading(false);
    }
  }, []);

  React.useEffect(() => {
    loadAdminData(false);
  }, [loadAdminData]);

  const filteredRows = React.useMemo(() => {
    return rows.filter((row) => {
      const text = `${row.full_name} ${row.email}`.toLowerCase();
      const searchOk = !searchTerm || text.includes(searchTerm.toLowerCase());
      const roleOk = roleFilter === "all" || row.role === roleFilter;
      const statusOk =
        statusFilter === "all" ||
        (statusFilter === "active" && !row.disabled) ||
        (statusFilter === "disabled" && row.disabled);
      return searchOk && roleOk && statusOk;
    });
  }, [rows, searchTerm, roleFilter, statusFilter]);

  const metrics = React.useMemo(() => {
    const total = rows.length;
    const onboarding = rows.filter((r) => r.onboarding_completed).length;
    const premium = rows.filter((r) => r.is_premium).length;
    const admins = rows.filter((r) => r.role === "admin").length;
    return { total, onboarding, premium, admins };
  }, [rows]);

  const sendInvite = async (email, role) => {
    await base44.auth.inviteUser(email, role);
    await loadAdminData(true);
  };

  const handleSingleInvite = async () => {
    const email = inviteState.email.trim().toLowerCase();
    if (!email) return;

    setInviting(true);
    try {
      await sendInvite(email, inviteState.role);
      setInviteState(defaultInviteState);
    } catch (inviteError) {
      alert(`Invite failed: ${extractErrorMessage(inviteError)}`);
    } finally {
      setInviting(false);
    }
  };

  const handleBulkInvite = async () => {
    const items = bulkInvites
      .split(/[\n,;]/g)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    if (!items.length) return;
    setInviting(true);
    try {
      for (const email of items) {
        await sendInvite(email, "user");
      }
      setBulkInvites("");
    } catch (inviteError) {
      alert(`Bulk invite stopped: ${extractErrorMessage(inviteError)}`);
    } finally {
      setInviting(false);
    }
  };

  const handleImportUsers = async () => {
    if (!importPayload.trim()) return;

    let parsed;
    try {
      parsed = JSON.parse(importPayload);
    } catch {
      alert("Invalid JSON format");
      return;
    }

    setImportingUsers(true);
    try {
      const result = await base44.auth.importUsers(parsed);
      setImportResult(result);
      await loadAdminData(true);
      alert(`Import complete. Created: ${result.created}, updated: ${result.updated}, interests: ${result.importedInterests}`);
    } catch (importError) {
      alert(`Import failed: ${extractErrorMessage(importError)}`);
    } finally {
      setImportingUsers(false);
    }
  };

  const handleImportCsvFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingUsers(true);
    try {
      const csvText = await file.text();
      const payload = csvToImportPayload(csvText);
      const result = await base44.auth.importUsers(payload);
      setImportResult(result);
      await loadAdminData(true);
      alert(`CSV import complete. Created: ${result.created}, updated: ${result.updated}`);
    } catch (importError) {
      alert(`CSV import failed: ${extractErrorMessage(importError)}`);
    } finally {
      setImportingUsers(false);
      event.target.value = "";
    }
  };

  const handleRoleChange = async (userId, nextRole) => {
    if (!canManageAccounts) return;
    setActionUserId(userId);
    try {
      await base44.entities.User.update(userId, { role: nextRole });
      await loadAdminData(true);
    } catch (updateError) {
      alert(`Role update failed: ${extractErrorMessage(updateError)}`);
    } finally {
      setActionUserId(null);
    }
  };

  const handleToggleDisabled = async (user) => {
    if (!canManageAccounts) return;
    if (user.id === currentUser?.id) {
      alert("You cannot disable your own admin account.");
      return;
    }

    setActionUserId(user.id);
    try {
      await base44.entities.User.update(user.id, { disabled: !user.disabled });
      await loadAdminData(true);
    } catch (updateError) {
      alert(`Status update failed: ${extractErrorMessage(updateError)}`);
    } finally {
      setActionUserId(null);
    }
  };

  const handleAssumeUser = async (user) => {
    if (user.id === currentUser?.id) return;
    setActionUserId(user.id);
    try {
      await base44.auth.assumeUser(user.id);
      window.location.href = createPageUrl("Discover");
    } catch (switchError) {
      alert(`Switch user failed: ${extractErrorMessage(switchError)}`);
    } finally {
      setActionUserId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
      </div>
    );
  }

  if (!isAdminUser(currentUser)) {
    return (
      <div className="min-h-screen px-4 py-10">
        <div className="max-w-2xl mx-auto bg-white/90 rounded-3xl p-8 shadow-2xl text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Admin Access Required</h1>
          <p className="text-gray-600 mb-6">
            This page is available only for users with role <code>admin</code>.
          </p>
          <Link to={createPageUrl("Discover")}>
            <Button>Back to app</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/15 border border-white/20 rounded-full px-4 py-2 mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              <span className="text-sm text-emerald-200 font-semibold">Admin Control Center</span>
            </div>
            <h1 className="text-4xl font-bold text-white">MindCircle Admin Panel</h1>
            <p className="text-purple-200 mt-1">
              Signed in as {currentUser?.email}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to={createPageUrl("Discover")}>
              <Button variant="outline" className="bg-white/10 text-white border-white/30">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to app
              </Button>
            </Link>
            <Button
              onClick={() => loadAdminData(true)}
              disabled={isReloading}
              className="bg-gradient-to-r from-indigo-500 to-purple-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isReloading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-400/40 text-red-100 rounded-2xl p-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div className="bg-white rounded-2xl p-5 shadow-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Total users</p>
              <Users className="w-5 h-5 text-indigo-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.total}</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl p-5 shadow-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Completed onboarding</p>
              <Link2 className="w-5 h-5 text-sky-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.onboarding}</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl p-5 shadow-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Premium users</p>
              <Crown className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.premium}</p>
          </motion.div>

          <motion.div className="bg-white rounded-2xl p-5 shadow-xl" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">Admins</p>
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-2">{metrics.admins}</p>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-3xl p-6 shadow-2xl">
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or email"
                  className="pl-9"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">All roles</option>
                <option value="user">Users</option>
                <option value="admin">Admins</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {!canManageAccounts && (
              <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-900 border border-amber-200 text-sm">
                User runtime management is unavailable from frontend in this environment. Invite flow still works.
              </div>
            )}

            <div className="overflow-auto rounded-2xl border border-gray-200">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left p-3">User</th>
                    <th className="text-left p-3">Role</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Engagement</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr key={row.id} className="border-t border-gray-100">
                      <td className="p-3 min-w-[260px]">
                        <div className="font-semibold text-gray-900">{row.full_name}</div>
                        <div className="text-gray-500 text-xs">{row.email}</div>
                        <div className="text-gray-400 text-xs">Created: {formatDate(row.created_date)}</div>
                      </td>
                      <td className="p-3">
                        {canManageAccounts ? (
                          <select
                            value={row.role}
                            onChange={(e) => handleRoleChange(row.id, e.target.value)}
                            disabled={actionUserId === row.id}
                            className="px-2 py-1 rounded border border-gray-300"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span className="font-medium">{row.role}</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          <div className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${row.disabled ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                            {row.disabled ? "Disabled" : "Active"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.onboarding_completed ? "Onboarding: done" : "Onboarding: pending"}
                          </div>
                          <div className="text-xs text-gray-500">
                            {row.is_premium ? "Premium" : "Free"}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-xs text-gray-700">
                        <div>Interests: {row.interests}</div>
                        <div>Messages: {row.messages}</div>
                        <div>Matches: {row.matches}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex flex-col gap-2">
                          <Link to={`${createPageUrl("UserProfile")}?userId=${row.id}`}>
                            <Button variant="outline" size="sm" className="w-full">Open Profile</Button>
                          </Link>
                          <Link to={`${createPageUrl("Messages")}?userId=${row.id}`}>
                            <Button variant="outline" size="sm" className="w-full">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Message
                            </Button>
                          </Link>
                          {canManageAccounts && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionUserId === row.id}
                              onClick={() => handleToggleDisabled(row)}
                              className="w-full"
                            >
                              {row.disabled ? "Enable" : "Disable"}
                            </Button>
                          )}
                          {canManageAccounts && !row.disabled && row.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={actionUserId === row.id}
                              onClick={() => handleAssumeUser(row)}
                              className="w-full"
                            >
                              <LogIn className="w-3 h-3 mr-1" />
                              Open as user
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-2xl space-y-5">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-500" />
                Invite Users
              </h2>
              <p className="text-sm text-gray-600">
                Send access invite and assign role directly from admin panel.
              </p>
            </div>

            {localAdminCredentials && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-xs text-indigo-900 space-y-1">
                <p className="font-semibold">Local mode credentials</p>
                <p>Admin: {localAdminCredentials.email} / {localAdminCredentials.password}</p>
                <p>Invited user default password: <code>welcome12345</code></p>
              </div>
            )}

            <div className="space-y-2">
              <Input
                value={inviteState.email}
                onChange={(e) => setInviteState((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="user@email.com"
              />
              <select
                value={inviteState.role}
                onChange={(e) => setInviteState((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 rounded-md border border-gray-300 bg-white text-sm"
              >
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
              <Button onClick={handleSingleInvite} disabled={inviting} className="w-full bg-gradient-to-r from-indigo-500 to-purple-600">
                Send invite
              </Button>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">Bulk invite (user role)</p>
              <textarea
                value={bulkInvites}
                onChange={(e) => setBulkInvites(e.target.value)}
                placeholder={"first@email.com\nsecond@email.com"}
                className="w-full h-24 rounded-md border border-gray-300 p-2 text-sm"
              />
              <Button onClick={handleBulkInvite} disabled={inviting} variant="outline" className="w-full mt-2">
                Send bulk invites
              </Button>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-800 mb-2">Invite activity</p>
              {inviteHistory.length === 0 ? (
                <p className="text-xs text-gray-500">No invites sent in this session.</p>
              ) : (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {inviteHistory.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-gray-200 p-2">
                      <div className="text-sm font-medium text-gray-900">{entry.email}</div>
                      <div className="text-xs text-gray-500">
                        role: {entry.role} | {formatDate(entry.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100 space-y-2">
              <p className="text-sm font-semibold text-gray-800">Import Users JSON</p>
              <p className="text-xs text-gray-500">
                Paste JSON array of users or object with <code>users</code>, optional <code>profiles</code> and <code>interests</code>.
              </p>
              <label className="block">
                <span className="text-xs text-gray-600 mb-1 block">Or import CSV export</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleImportCsvFile}
                  disabled={importingUsers}
                  className="block w-full text-xs file:mr-3 file:rounded-md file:border file:border-gray-300 file:bg-gray-50 file:px-3 file:py-2 file:text-xs file:font-medium"
                />
              </label>
              <textarea
                value={importPayload}
                onChange={(e) => setImportPayload(e.target.value)}
                placeholder='{"users":[{"email":"andy@example.com","full_name":"Andy Bain","is_premium":true,"interests":[{"category":"cultural_taste","title":"Music"}]}]}'
                className="w-full h-40 rounded-md border border-gray-300 p-2 text-xs font-mono"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleImportUsers}
                  disabled={importingUsers}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600"
                >
                  {importingUsers ? "Importing..." : "Import users"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportPayload("")}
                  className="flex-1"
                >
                  Clear
                </Button>
              </div>
              {importResult && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-900">
                  <div>Created: {importResult.created}</div>
                  <div>Updated: {importResult.updated}</div>
                  <div>Imported interests: {importResult.importedInterests}</div>
                  <div>Skipped: {importResult.skipped}</div>
                  {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                    <div className="text-amber-800 mt-1">Errors: {importResult.errors.length}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
