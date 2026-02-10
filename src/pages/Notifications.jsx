import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { Bell, MessageCircle, Heart, User as UserIcon, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const [currentUser, setCurrentUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await mc.auth.me();
      setCurrentUser(me);

      const [allNotifications, allProfiles] = await Promise.all([
        mc.entities.Notification.filter(
          { to_user_id: me.id },
          "-created_date"
        ).catch(() => []),
        mc.entities.UserProfile.list().catch(() => [])
      ]);
      
      const usersMap = {};
      (allProfiles || []).forEach(p => { 
        usersMap[p.user_id] = {
          id: p.user_id,
          full_name: p.full_name,
          profile_photo: p.profile_photo,
          onboarding_completed: p.onboarding_completed
        }; 
      });
      setUsers(usersMap);

      setNotifications(allNotifications || []);
    } catch (error) {
      console.error("Error loading notifications:", error);
    }
    setLoading(false);
  };

  const markAsRead = async (notificationId) => {
    try {
      await mc.entities.Notification.update(notificationId, { is_read: true });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      await Promise.all(unreadIds.map(id => 
        mc.entities.Notification.update(id, { is_read: true })
      ));
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "message":
        return <MessageCircle className="w-5 h-5 text-blue-500 select-none" />;
      case "match":
      case "new_match":
      case "improved_match":
      case "new_similar_user":
      case "like":
        return <Heart className="w-5 h-5 text-pink-500 select-none" />;
      case "profile_view":
      case "profile_interaction":
      case "daily_update":
      case "social_proof":
        return <UserIcon className="w-5 h-5 text-emerald-500 select-none" />;
      default:
        return <Bell className="w-5 h-5 text-purple-500 select-none" />;
    }
  };

  const getNotificationLink = (notification) => {
    switch (notification.type) {
      case "message":
        return `${createPageUrl("Messages")}?userId=${notification.from_user_id}`;
      case "match":
      case "new_match":
      case "improved_match":
      case "new_similar_user":
        return createPageUrl("Matching");
      case "like":
        return `${createPageUrl("UserProfile")}?userId=${notification.from_user_id}`;
      case "daily_update":
        return createPageUrl("MyProfile");
      default:
        return createPageUrl("Discover");
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
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm px-6 py-3 rounded-full mb-4 shadow-lg select-none">
            <Bell className="w-5 h-5 text-purple-600 dark:text-purple-400 select-none" />
            <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Notifications</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 dark:from-purple-400 dark:via-pink-400 dark:to-orange-400 bg-clip-text text-transparent">
            Notifications
          </h1>
          {notifications.some(n => !n.is_read) && (
            <Button
              onClick={markAllAsRead}
              variant="outline"
              className="mt-4 select-none"
            >
              <Check className="w-4 h-4 mr-2 select-none" />
              Mark all as read
            </Button>
          )}
        </motion.div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border-4 border-white dark:border-gray-700 text-center"
          >
            <Bell className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4 select-none" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              No notifications
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              New notifications will appear here
            </p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification, index) => {
              const systemUser = {
                id: "system",
                full_name: "Make a Match",
                profile_photo: "/icon-192.png",
                onboarding_completed: true
              };
              const user = notification.from_user_id ? users[notification.from_user_id] : systemUser;
              const resolvedUser = user || systemUser;

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link 
                    to={getNotificationLink(notification)}
                    onClick={() => !notification.is_read && markAsRead(notification.id)}
                  >
                    <div className={`bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl p-4 shadow-lg hover:shadow-xl border-2 transition-all group cursor-pointer select-none ${
                      notification.is_read 
                        ? "border-white dark:border-gray-700" 
                        : "border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-900/20"
                    }`}>
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        <div className="relative flex-shrink-0">
                          <div className="w-14 h-14 rounded-full overflow-hidden border-3 border-white dark:border-gray-700 shadow-lg">
                            {resolvedUser.profile_photo ? (
                              <img
                                src={resolvedUser.profile_photo}
                                alt={resolvedUser.full_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                <UserIcon className="w-7 h-7 text-white select-none" />
                              </div>
                            )}
                          </div>
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-gray-800 rounded-full p-1">
                            {getNotificationIcon(notification.type)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900 dark:text-white">
                              {resolvedUser.full_name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(notification.created_date).toLocaleDateString('ru-RU', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {notification.text}
                          </p>
                        </div>

                        {!notification.is_read && (
                          <div className="w-3 h-3 bg-purple-500 rounded-full flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
