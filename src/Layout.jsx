import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Compass, Search, Heart, Coins, Bell, Mail, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import PWAMeta from "@/components/PWAMeta";
import UserMenu from "@/components/layout/UserMenu";
import { syncUserProfile } from "@/components/utils/syncProfile";
import { isAdminUser } from "@/lib/admin-utils";
import { canRunNewUserTutorial, isOnboardingComplete, shouldForceOnboarding } from "@/lib/onboarding-utils";

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const mobileNavRef = React.useRef(null);

  const onboardingPath = createPageUrl("Onboarding");

  const clearBadgeForPath = React.useCallback(async (pathname) => {
    if (!currentUser?.id) return;
    const sections = [
      { path: createPageUrl("Matching"), key: "matching" },
      { path: createPageUrl("Messages"), key: "messages" },
      { path: createPageUrl("MyProfile"), key: "my_planet" }
    ];
    const section = sections.find((item) => item.path === pathname);
    if (!section) return;
    const amount = Number(currentUser?.badges?.[section.key] || 0);
    if (amount <= 0) return;
    try {
      await base44.auth.clearBadge(section.key);
      setCurrentUser((prev) => (
        prev
          ? {
              ...prev,
              badges: {
                ...(prev.badges || {}),
                [section.key]: 0
              }
            }
          : prev
      ));
    } catch {
      // ignore
    }
  }, [currentUser?.badges, currentUser?.id]);

  const handleTabClick = React.useCallback(async (pagePath) => {
    if (pagePath === createPageUrl("Match") && currentUser?.tutorial_v2_step === "search_highlight") {
      try {
        await base44.auth.updateMe({ tutorial_v2_step: "search_info_pending" });
        setCurrentUser((prev) => (prev ? { ...prev, tutorial_v2_step: "search_info_pending" } : prev));
      } catch {
        // ignore
      }
    }

    const isActive = location.pathname === pagePath;
    if (isActive) {
      navigate(pagePath, { replace: true });
    } else {
      navigate(pagePath);
    }
  }, [currentUser?.tutorial_v2_step, location.pathname, navigate]);

  const loadUser = React.useCallback(async () => {
    try {
      const user = await Promise.race([
        base44.auth.me(),
        new Promise((_, rej) => setTimeout(() => rej("layout_auth_timeout"), 4000))
      ]);

      setCurrentUser((prev) => {
        if (prev && prev.coins === user.coins) {
          return { ...prev, ...user };
        }
        return user;
      });

      if (user.coins === undefined || user.coins === null) {
        await base44.auth.updateMe({ coins: 100 }).catch(() => {});
        user.coins = 100;
        setCurrentUser((prev) => ({ ...prev, coins: 100 }));
      }

      if (!user.welcomed) {
        base44.auth.updateMe({ welcomed: true }).catch(() => {});
      }

      syncUserProfile(user).catch(() => {});

      const admin = isAdminUser(user);
      const onboardingComplete = isOnboardingComplete(user);
      if (shouldForceOnboarding(user) && location.pathname !== onboardingPath) {
        if (user.onboarding_completed) {
          base44.auth.updateMe({
            onboarding_completed: false,
            onboarding_required: true,
            onboarding_step: "profile_photo"
          }).catch(() => {});
        }
        navigate(onboardingPath, { replace: true });
        return;
      }

      if (!admin && onboardingComplete && !user.onboarding_completed) {
        base44.auth.updateMe({
          onboarding_completed: true,
          onboarding_required: false,
          onboarding_step: "completed"
        }).catch(() => {});
      }

      if (canRunNewUserTutorial(user) && (!user.tutorial_v2_step || user.tutorial_v2_step === "onboarding_pending")) {
        await base44.auth.updateMe({ tutorial_v2_step: "my_map_info_pending" }).catch(() => {});
        setCurrentUser((prev) => (prev ? { ...prev, tutorial_v2_step: "my_map_info_pending" } : prev));
      }
    } catch {
      // auth failed or timed out
    }
  }, [location.pathname, navigate, onboardingPath]);

  React.useEffect(() => {
    loadUser();
  }, [loadUser]);

  React.useEffect(() => {
    if (!mobileNavRef.current) return;
    const activeItem = mobileNavRef.current.querySelector('[data-mobile-active="true"]');
    if (activeItem && typeof activeItem.scrollIntoView === "function") {
      activeItem.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [location.pathname, currentUser?.role, currentUser?._app_role]);

  React.useEffect(() => {
    clearBadgeForPath(location.pathname);
  }, [clearBadgeForPath, location.pathname]);

  const loadUnreadNotifications = React.useCallback(async () => {
    try {
      if (!currentUser?.id) return;
      const notifications = await base44.entities.Notification.filter({
        to_user_id: currentUser.id,
        is_read: false
      });
      setUnreadNotifications(notifications?.length || 0);
    } catch {
      // ignore
    }
  }, [currentUser?.id]);

  React.useEffect(() => {
    if (!currentUser) return;

    loadUnreadNotifications();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const unsubNotifications = base44.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data.to_user_id === currentUser.id) {
        setUnreadNotifications((prev) => prev + 1);
        loadUser();

        if (document.hidden && Notification.permission === "granted" && event.data?.push_enabled !== false) {
          new Notification("MindCircle", {
            body: event.data.text,
            icon: "/icon-192.png",
            tag: "notification"
          });
        }
      } else if (event.type === "update" && event.data.to_user_id === currentUser.id) {
        loadUnreadNotifications();
      }
    });

    let unsubUser = () => {};
    try {
      unsubUser = base44.entities.User.subscribe((event) => {
        if (event.id === currentUser.id && (event.type === "update" || event.type === "create")) {
          setCurrentUser((prev) => ({ ...prev, ...event.data }));
        }
      });
    } catch {
      // ignore if restricted
    }

    const handleCoinsUpdate = () => loadUser();
    window.addEventListener("coins-updated", handleCoinsUpdate);

    return () => {
      unsubNotifications();
      unsubUser();
      window.removeEventListener("coins-updated", handleCoinsUpdate);
    };
  }, [currentUser, loadUser, loadUnreadNotifications]);

  const isAdmin = isAdminUser(currentUser);
  const isActive = (path) => location.pathname === path;

  const searchHighlighted = currentUser?.tutorial_v2_step === "search_highlight";
  const matchingHighlighted = currentUser?.tutorial_v2_step === "matching_highlight";
  const badgeMatching = Number(currentUser?.badges?.matching || 0);
  const badgeMessages = Number(currentUser?.badges?.messages || 0);
  const badgeMyPlanet = Number(currentUser?.badges?.my_planet || 0);

  return (
    <div className="min-h-[100dvh] font-sans bg-gradient-to-br from-indigo-950 via-purple-900 to-pink-900 text-white transition-colors duration-300">
      <PWAMeta />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');

        :root {
          --font-sans: 'Outfit', sans-serif;
          --primary: #8B5CF6;
          --primary-dark: #7C3AED;
          --secondary: #EC4899;
          --accent: #F59E0B;
          --bg-deep-space: #0B0C15;
        }

        body {
          font-family: var(--font-sans);
          overscroll-behavior-y: none;
          padding-bottom: env(safe-area-inset-bottom);
          -webkit-touch-callout: none;
          background-color: var(--bg-deep-space);
        }

        button, nav, a, img, .select-none {
          -webkit-user-select: none;
          user-select: none;
        }

        * {
          -webkit-tap-highlight-color: transparent;
        }

        button, a, input, textarea, select {
          touch-action: manipulation;
        }

        html, body {
          overscroll-behavior-y: contain;
        }

        .mobile-nav-scroll {
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x proximity;
          scroll-behavior: smooth;
        }

        .mobile-nav-scroll::-webkit-scrollbar {
          display: none;
        }

        .mobile-nav-item {
          flex: 0 0 auto;
          min-width: 78px;
          scroll-snap-align: center;
        }
      `}</style>

      <nav className="hidden md:block fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 z-50" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to={createPageUrl("Discover")} className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Compass className="w-6 h-6 text-white select-none" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                MindCircle
              </span>
            </Link>

            <div className="flex items-center gap-4">
              {currentUser && (
                <Link to={createPageUrl("Coins")}>
                  <motion.div
                    key={currentUser.coins}
                    initial={{ scale: 1 }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.3 }}
                    className="relative flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer hover:scale-105 select-none"
                  >
                    <Coins className="w-5 h-5 text-white select-none" />
                    <motion.span
                      key={`coins-${currentUser.coins}`}
                      initial={{ scale: 1.5, color: "#FFD700" }}
                      animate={{ scale: 1, color: "#FFFFFF" }}
                      transition={{ duration: 0.5 }}
                      className="font-bold text-white"
                    >
                      {currentUser.coins ?? 100}
                    </motion.span>
                  </motion.div>
                </Link>
              )}

              <div className="flex items-center gap-1">
                <Link to={createPageUrl("Discover")} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                  isActive(createPageUrl("Discover"))
                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  <Home className="w-5 h-5 select-none" />
                  <span className="hidden sm:inline">Discovery</span>
                </Link>

                <button
                  onClick={() => handleTabClick(createPageUrl("Match"))}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                    isActive(createPageUrl("Match"))
                      ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  } ${searchHighlighted ? "ring-2 ring-purple-500 bg-purple-100 z-50" : ""}`}
                >
                  <Search className="w-5 h-5 select-none" />
                  <span className="hidden sm:inline">Search</span>
                </button>

                <button
                  onClick={() => handleTabClick(createPageUrl("Matching"))}
                  className={`relative flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                    isActive(createPageUrl("Matching"))
                      ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  } ${matchingHighlighted ? "ring-2 ring-pink-500 bg-pink-100 z-50" : ""}`}
                >
                  <Heart className="w-5 h-5 select-none" />
                  <span className="hidden sm:inline">Matching</span>
                  {badgeMatching > 0 && (
                    <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-pink-500 text-white text-[11px] font-bold">
                      {badgeMatching}
                    </span>
                  )}
                </button>

                <Link to={createPageUrl("Messages")} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                  isActive(createPageUrl("Messages"))
                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  <Mail className="w-5 h-5 select-none" />
                  <span className="hidden sm:inline">Messages</span>
                  {badgeMessages > 0 && (
                    <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-blue-500 text-white text-[11px] font-bold">
                      {badgeMessages}
                    </span>
                  )}
                </Link>

                <Link to={createPageUrl("MyProfile")} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                  isActive(createPageUrl("MyProfile"))
                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  <User className="w-5 h-5 select-none" />
                  <span className="hidden sm:inline">My Planet</span>
                  {badgeMyPlanet > 0 && (
                    <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-emerald-500 text-white text-[11px] font-bold">
                      {badgeMyPlanet}
                    </span>
                  )}
                </Link>

                {isAdmin && (
                  <Link to={createPageUrl("Admin")} className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer select-none ${
                    isActive(createPageUrl("Admin"))
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}>
                    <Shield className="w-5 h-5 select-none" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}

                <Link to={createPageUrl("Notifications")} className={`relative flex items-center justify-center w-10 h-10 rounded-xl transition-all cursor-pointer select-none ${
                  isActive(createPageUrl("Notifications"))
                    ? "bg-purple-50 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}>
                  <Bell className="w-5 h-5 select-none" />
                  {unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center select-none">
                      {unreadNotifications}
                    </span>
                  )}
                </Link>

                {currentUser && <UserMenu user={currentUser} />}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/70 dark:bg-gray-900/70 border-t border-white/30 dark:border-gray-700/40 z-40 shadow-[0_-8px_30px_rgba(15,23,42,0.18)]"
        style={{
          position: "fixed",
          bottom: 0,
          paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          transform: "translateZ(0)"
        }}
      >
        <div className="flex items-center gap-2 px-2.5 pt-2">
          <div className="relative flex-1 min-w-0">
            <div className="pointer-events-none absolute left-0 top-0 h-full w-6 bg-gradient-to-r from-white/80 dark:from-gray-900/80 to-transparent z-10" />
            <div className="pointer-events-none absolute right-0 top-0 h-full w-6 bg-gradient-to-l from-white/80 dark:from-gray-900/80 to-transparent z-10" />
            <div ref={mobileNavRef} className="mobile-nav-scroll flex items-center gap-2">
              <button
                data-mobile-active={String(isActive(createPageUrl("Discover")))}
                onClick={() => handleTabClick(createPageUrl("Discover"))}
                className={`mobile-nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("Discover"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Home className="w-6 h-6 select-none" />
                <span className="text-xs font-medium">Discovery</span>
              </button>

              <button
                data-mobile-active={String(isActive(createPageUrl("Match")))}
                onClick={() => handleTabClick(createPageUrl("Match"))}
                className={`mobile-nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("Match"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                } ${searchHighlighted ? "ring-2 ring-purple-500" : ""}`}
              >
                <Search className="w-6 h-6 select-none" />
                <span className="text-xs font-medium">Search</span>
              </button>

              <button
                data-mobile-active={String(isActive(createPageUrl("Matching")))}
                onClick={() => handleTabClick(createPageUrl("Matching"))}
                className={`mobile-nav-item relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("Matching"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                } ${matchingHighlighted ? "ring-2 ring-pink-500" : ""}`}
              >
                <Heart className="w-6 h-6 select-none" />
                <span className="text-xs font-medium">Matching</span>
                {badgeMatching > 0 && (
                  <span className="absolute top-0 right-1 bg-pink-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center select-none">
                    {badgeMatching}
                  </span>
                )}
              </button>

              <button
                data-mobile-active={String(isActive(createPageUrl("Notifications")))}
                onClick={() => handleTabClick(createPageUrl("Notifications"))}
                className={`mobile-nav-item relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("Notifications"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Bell className="w-6 h-6 select-none" />
                <span className="text-xs font-medium">Notifications</span>
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center select-none">
                    {unreadNotifications}
                  </span>
                )}
              </button>

              <button
                data-mobile-active={String(isActive(createPageUrl("Messages")))}
                onClick={() => handleTabClick(createPageUrl("Messages"))}
                className={`mobile-nav-item relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("Messages"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <Mail className="w-6 h-6 select-none" />
                <span className="text-xs font-medium">Messages</span>
                {badgeMessages > 0 && (
                  <span className="absolute top-0 right-1 bg-blue-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center select-none">
                    {badgeMessages}
                  </span>
                )}
              </button>

              <button
                data-mobile-active={String(isActive(createPageUrl("MyProfile")))}
                onClick={() => handleTabClick(createPageUrl("MyProfile"))}
                className={`mobile-nav-item relative flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                  isActive(createPageUrl("MyProfile"))
                    ? "bg-purple-100/90 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 shadow-sm"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <User className="w-6 h-6 select-none" />
                <span className="text-[11px] font-medium leading-none whitespace-nowrap">My Planet</span>
                {badgeMyPlanet > 0 && (
                  <span className="absolute top-0 right-1 bg-emerald-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center select-none">
                    {badgeMyPlanet}
                  </span>
                )}
              </button>

              {isAdmin && (
                <button
                  data-mobile-active={String(isActive(createPageUrl("Admin")))}
                  onClick={() => handleTabClick(createPageUrl("Admin"))}
                  className={`mobile-nav-item flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all select-none ${
                    isActive(createPageUrl("Admin"))
                      ? "bg-emerald-100/90 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 shadow-sm"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Shield className="w-6 h-6 select-none" />
                  <span className="text-xs font-medium">Admin</span>
                </button>
              )}
            </div>
          </div>

          {currentUser && (
            <div className="shrink-0 pb-0.5">
              <UserMenu
                user={currentUser}
                openUp
                buttonClassName="w-11 h-11 border-white/80 shadow-lg"
              />
            </div>
          )}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.main
          key={location.pathname}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="pt-0 md:pt-20 pb-24 md:pb-0"
        >
          {children}
        </motion.main>
      </AnimatePresence>
    </div>
  );
}
