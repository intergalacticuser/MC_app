import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { User as UserIcon, Settings, Coins, LogOut, Shield, Crown } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isAdminUser } from "@/lib/admin-utils";

export default function UserMenu({ user, openUp = false, buttonClassName = "" }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    await base44.auth.logout(createPageUrl("Login"));
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-lg hover:shadow-xl transition-all hover:scale-105 ${buttonClassName}`}
      >
        {user?.profile_photo ? (
          <img
            src={user.profile_photo}
            alt={user.full_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 10 : -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute right-0 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[120] ${
              openUp ? "bottom-full mb-2" : "mt-2"
            }`}
          >
            {/* User Info */}
            <div className="p-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <h3 className="font-bold text-lg">{user?.full_name}</h3>
              <p className="text-sm text-purple-100">{user?.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              <Link to={createPageUrl("Coins")} onClick={() => setIsOpen(false)}>
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Coins className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">Coins</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{user?.coins || 0} available</div>
                  </div>
                </div>
              </Link>

              <Link to={createPageUrl("Premium")} onClick={() => setIsOpen(false)}>
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">Premium</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {user?.is_premium ? "Premium active" : "Unlock all features"}
                    </div>
                  </div>
                </div>
              </Link>

              <Link to={createPageUrl("Settings")} onClick={() => setIsOpen(false)}>
                <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 transition-colors">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                    <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 dark:text-white">Settings</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Account settings</div>
                  </div>
                </div>
              </Link>

              {isAdminUser(user) && (
                <Link to={createPageUrl("Admin")} onClick={() => setIsOpen(false)}>
                  <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer flex items-center gap-3 transition-colors">
                    <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                      <Shield className="w-5 h-5 text-emerald-700 dark:text-emerald-300" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900 dark:text-white">Admin Panel</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Users, invites, moderation</div>
                    </div>
                  </div>
                </Link>
              )}

              <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>

              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer flex items-center gap-3 transition-colors text-left"
              >
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-600 dark:text-red-400">Logout</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Sign out of account</div>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
