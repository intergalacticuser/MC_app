import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, Phone, Mail, CreditCard, Save, LogOut, Trash2, User, RotateCcw, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { syncUserProfile } from "@/components/utils/syncProfile";

const getTipsStorageKey = (userId) => `mindcircle_tips_enabled_${userId}`;
const getTourStorageKey = (userId) => `mindcircle_first_tour_seen_${userId}`;

export default function Settings() {
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [blockedUsersList, setBlockedUsersList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const currentUser = await mc.auth.me();
      setUser(currentUser);
      setFullName(currentUser.full_name || "");
      setEmail(currentUser.email || "");
      setPhone(currentUser.phone || "");
      setPaymentMethod(currentUser.payment_method || "");
      setTipsEnabled(localStorage.getItem(getTipsStorageKey(currentUser.id)) !== "0");

      // Load blocked users
      if (currentUser.blocked_users && currentUser.blocked_users.length > 0) {
        const blocked = await Promise.all(
          currentUser.blocked_users.map(async (id) => {
            const profiles = await mc.entities.UserProfile.filter({ user_id: id }).catch(() => []);
            const profile = profiles[0];
            if (!profile) return null;
            return {
              id: profile.user_id,
              full_name: profile.full_name,
              profile_photo: profile.profile_photo
            };
          })
        );
        setBlockedUsersList(blocked.filter(Boolean));
      } else {
        setBlockedUsersList([]);
      }
    } catch (error) {
      mc.auth.redirectToLogin(window.location.href);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    const safeFullName = fullName.trim();
    if (!safeFullName) {
      alert("Name is required");
      return;
    }

    setSaving(true);
    try {
      await mc.auth.updateMe({
        full_name: safeFullName,
        phone,
        payment_method: paymentMethod
      });

      const updatedUser = await mc.auth.me();
      setUser(updatedUser);
      setFullName(updatedUser.full_name || safeFullName);
      await syncUserProfile(updatedUser).catch(() => {});
      alert("Settings saved successfully");
    } catch (error) {
      alert("Failed to save settings");
    }
    setSaving(false);
  };

  const handleTipsToggle = () => {
    if (!user?.id) return;
    const nextValue = !tipsEnabled;
    localStorage.setItem(getTipsStorageKey(user.id), nextValue ? "1" : "0");
    setTipsEnabled(nextValue);
  };

  const handleRestartTour = () => {
    if (!user?.id) return;
    localStorage.removeItem(getTourStorageKey(user.id));
    localStorage.setItem(getTipsStorageKey(user.id), "1");
    setTipsEnabled(true);
    alert("Onboarding tips will be shown again at next login.");
  };

  const handleLogout = async () => {
    await mc.auth.logout(createPageUrl("Login"));
  };

  const handleChangePassword = async () => {
    if (!user?.id) return;
    if (!currentPassword.trim() || !newPassword.trim()) {
      alert("Enter current password and a new password");
      return;
    }
    if (newPassword.trim().length < 8) {
      alert("New password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      alert("New passwords do not match");
      return;
    }

    setChangingPassword(true);
    try {
      await mc.auth.changePassword({
        userId: user.id,
        currentPassword,
        newPassword
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      alert("Password updated");
    } catch (error) {
      alert(error?.message || "Failed to change password");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete your account? This action is irreversible."
    );
    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      "Last warning! Delete account forever?"
    );
    if (!doubleConfirm) return;

    try {
      await mc.auth.deleteMe();
    } catch (error) {
      alert("Failed to delete account");
    }
  };

  const handleUnblock = async (userIdToUnblock) => {
    try {
      const newBlockedList = user.blocked_users.filter(id => id !== userIdToUnblock);
      await mc.auth.updateMe({ blocked_users: newBlockedList });

      const updatedUser = await mc.auth.me();
      setUser(updatedUser);
      await syncUserProfile(updatedUser).catch(() => {});
      setBlockedUsersList(prev => prev.filter(u => u.id !== userIdToUnblock));
    } catch (error) {
      console.error("Error unblocking:", error);
      alert("Failed to unblock user");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full mb-4 shadow-lg">
            <SettingsIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Account Settings</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Settings</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your account information</p>
        </motion.div>

        {/* Settings Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl space-y-6"
        >
          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <User className="w-4 h-4" />
              Name
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50/80 dark:bg-gray-900/40">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Profile editing</p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              You can edit bio, mood, quotes and interest map on your profile screen.
            </p>
            <Link to={createPageUrl("MyProfile")}>
              <Button variant="outline" className="w-full">Open My Planet</Button>
            </Link>
          </div>

          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <Mail className="w-4 h-4" />
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              disabled
              className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <Phone className="w-4 h-4" />
              Phone Number
            </label>
            <Input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 234 567 8900"
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              <CreditCard className="w-4 h-4" />
              Payment Method
            </label>
            <Input
              type="text"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              placeholder="Card ending in 1234"
              className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">For subscriptions and premium features</p>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:shadow-lg transition-all"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </motion.div>

        {/* Password */}
        {String(user?.auth_provider || "email").toLowerCase() === "email" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl mt-6"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Password</h2>
            <div className="space-y-4">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Lock className="w-4 h-4" />
                  Current password
                </label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                  autoComplete="current-password"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
                    New password
                  </label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 block">
                    Confirm new password
                  </label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="dark:bg-gray-700 dark:text-white dark:border-gray-600"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <Button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full bg-gradient-to-r from-slate-800 to-slate-950 hover:shadow-lg transition-all"
              >
                {changingPassword ? "Updating..." : "Change password"}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Onboarding tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl mt-6"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Onboarding Tips</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Show first-login popups with app usage guidance and behavior hints.
          </p>
          <div className="flex flex-col md:flex-row gap-3">
            <Button
              onClick={handleTipsToggle}
              variant={tipsEnabled ? "default" : "outline"}
              className="md:flex-1"
            >
              {tipsEnabled ? "Tips enabled" : "Tips disabled"}
            </Button>
            <Button onClick={handleRestartTour} variant="outline" className="md:flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart first-login tour
            </Button>
          </div>
        </motion.div>

        {/* Account Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl mt-6"
        >
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Account Information</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Account ID:</span>
              <span className="font-mono text-gray-900 dark:text-white">{user?.id?.slice(0, 8)}...</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Account Type:</span>
              <span className="font-bold text-purple-600 dark:text-purple-400">
                {user?.is_premium ? "Premium" : "Free"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Coins Balance:</span>
              <span className="font-bold text-amber-600">{user?.coins || 0} coins</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Member Since:</span>
              <span className="text-gray-900 dark:text-white">
                {new Date(user?.created_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </motion.div>



        {/* Blocked Users */}
        {blockedUsersList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl mt-6"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Blocked Users</h2>
            <div className="space-y-3">
              {blockedUsersList.map(blockedUser => (
                <div key={blockedUser.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                      {blockedUser.profile_photo && (
                        <img src={blockedUser.profile_photo} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">{blockedUser.full_name}</span>
                  </div>
                  <Button
                    onClick={() => handleUnblock(blockedUser.id)}
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                  >
                    Unblock
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Danger Zone */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-red-50 dark:bg-red-900/20 rounded-3xl p-8 shadow-xl mt-6 border-2 border-red-200 dark:border-red-800"
        >
          <h2 className="text-xl font-bold text-red-900 dark:text-red-400 mb-4">Danger Zone</h2>
          <div className="space-y-4">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            
            <Button
              onClick={handleDeleteAccount}
              variant="outline"
              className="w-full border-red-500 text-red-700 hover:bg-red-100 dark:border-red-600 dark:text-red-500 dark:hover:bg-red-900/40"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </motion.div>

        {/* Privacy Policy Link */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 pb-4"
        >
          <Link 
            to={createPageUrl("PrivacyPolicy")} 
            className="text-xs text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors underline-offset-4 hover:underline"
          >
            Privacy Policy
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
