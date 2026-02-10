import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Home, User, Compass, Search, Heart, Coins, Bell, Mail, Shield } from "lucide-react";
import { mc } from "@/api/mcClient";
import PWAMeta from "@/components/PWAMeta";
import UserMenu from "@/components/layout/UserMenu";
import { syncUserProfile } from "@/components/utils/syncProfile";
import { isAdminUser } from "@/lib/admin-utils";
import { canRunNewUserTutorial, isOnboardingComplete, shouldForceOnboarding } from "@/lib/onboarding-utils";
import { toast } from "@/components/ui/use-toast";

const ONBOARDING_DISMISSED_KEY_PREFIX = "mindcircle_onboarding_dismissed_v1:";
const ONBOARDING_NUDGE_DISMISSED_KEY_PREFIX = "mindcircle_onboarding_nudge_dismissed_v1:";

const PAGE_THEME_BACKGROUNDS = {
  default: {
    base: "#0B0C15",
    image:
      "radial-gradient(1200px circle at 20% 20%, rgba(124, 58, 237, 0.35), transparent 55%)," +
      "radial-gradient(900px circle at 80% 30%, rgba(236, 72, 153, 0.20), transparent 60%)," +
      "linear-gradient(135deg, rgb(30, 27, 75) 0%, rgb(88, 28, 135) 50%, rgb(131, 24, 67) 100%)"
  },
  nebula: {
    base: "#0B0C15",
    image:
      "radial-gradient(1000px circle at 22% 18%, rgba(240, 147, 251, 0.30), transparent 55%)," +
      "radial-gradient(900px circle at 75% 28%, rgba(245, 87, 108, 0.22), transparent 60%)," +
      "radial-gradient(900px circle at 55% 88%, rgba(99, 102, 241, 0.16), transparent 65%)," +
      "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(59, 29, 79) 55%, rgb(17, 24, 39) 100%)"
  },
  cyberpunk: {
    base: "#070A12",
    image:
      "radial-gradient(900px circle at 20% 20%, rgba(250, 112, 154, 0.28), transparent 60%)," +
      "radial-gradient(900px circle at 78% 26%, rgba(254, 225, 64, 0.18), transparent 60%)," +
      "radial-gradient(900px circle at 52% 88%, rgba(34, 211, 238, 0.12), transparent 70%)," +
      "linear-gradient(135deg, rgb(7, 10, 18) 0%, rgb(63, 26, 77) 55%, rgb(7, 10, 18) 100%)"
  },
  zen: {
    base: "#071024",
    image:
      "radial-gradient(1000px circle at 24% 20%, rgba(137, 247, 254, 0.22), transparent 58%)," +
      "radial-gradient(1000px circle at 76% 28%, rgba(102, 166, 255, 0.20), transparent 60%)," +
      "linear-gradient(135deg, rgb(7, 16, 36) 0%, rgb(29, 49, 93) 55%, rgb(9, 20, 46) 100%)"
  },
  sunset: {
    base: "#120B14",
    image:
      "radial-gradient(1000px circle at 24% 18%, rgba(252, 182, 159, 0.22), transparent 60%)," +
      "radial-gradient(900px circle at 78% 26%, rgba(255, 236, 210, 0.14), transparent 60%)," +
      "radial-gradient(900px circle at 55% 90%, rgba(236, 72, 153, 0.10), transparent 70%)," +
      "linear-gradient(135deg, rgb(18, 11, 20) 0%, rgb(127, 61, 46) 55%, rgb(15, 23, 42) 100%)"
  },
  aurora: {
    base: "#071322",
    image:
      "radial-gradient(1100px circle at 18% 20%, rgba(168, 237, 234, 0.22), transparent 60%)," +
      "radial-gradient(1100px circle at 78% 26%, rgba(254, 214, 227, 0.18), transparent 60%)," +
      "radial-gradient(900px circle at 56% 88%, rgba(34, 197, 94, 0.10), transparent 70%)," +
      "linear-gradient(135deg, rgb(7, 19, 34) 0%, rgb(65, 80, 99) 55%, rgb(15, 23, 42) 100%)"
  }
};

const isImageBackground = (value = "") =>
  typeof value === "string" && /^(https?:\/\/|data:image\/|blob:)/i.test(value);

function isOnboardingDismissed(userId) {
  if (!userId) return false;
  try {
    return sessionStorage.getItem(`${ONBOARDING_DISMISSED_KEY_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

function isOnboardingNudgeDismissed(userId) {
  if (!userId) return false;
  try {
    return sessionStorage.getItem(`${ONBOARDING_NUDGE_DISMISSED_KEY_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = React.useState(null);
  const [unreadNotifications, setUnreadNotifications] = React.useState(0);
  const mobileNavRef = React.useRef(null);
  const onboardingNudgeShownRef = React.useRef(""); // userId

  const onboardingPath = createPageUrl("Onboarding");
  const settingsPath = createPageUrl("Settings");

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
      await mc.auth.clearBadge(section.key);
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
        await mc.auth.updateMe({ tutorial_v2_step: "search_info_pending" });
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
        mc.auth.me(),
        new Promise((_, rej) => setTimeout(() => rej("layout_auth_timeout"), 4000))
      ]);

      setCurrentUser((prev) => {
        if (prev && prev.coins === user.coins) {
          return { ...prev, ...user };
        }
        return user;
      });

      if (user.coins === undefined || user.coins === null) {
        await mc.auth.updateMe({ coins: 100 }).catch(() => {});
        user.coins = 100;
        setCurrentUser((prev) => ({ ...prev, coins: 100 }));
      }

      if (!user.welcomed) {
        mc.auth.updateMe({ welcomed: true }).catch(() => {});
      }

      syncUserProfile(user).catch(() => {});

      const admin = isAdminUser(user);
      const onboardingComplete = isOnboardingComplete(user);
      if (shouldForceOnboarding(user) && location.pathname !== onboardingPath) {
        // User can temporarily dismiss onboarding via the X button, but it must show again next login.
        if (isOnboardingDismissed(user.id)) {
          // Show a one-time-per-login reminder toast (dismissable for the current browser session/tab).
          if (!isOnboardingNudgeDismissed(user.id) && onboardingNudgeShownRef.current !== String(user.id || "")) {
            onboardingNudgeShownRef.current = String(user.id || "");
            toast({
              title: "Make a Match",
              description: (
                <div className="leading-snug">
                  Пройдите онбординг, чтобы ваш Planet правильно открывался другим и чтобы подбор совпадений стал точнее.
                </div>
              ),
              className:
                "rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950/95 via-indigo-950/85 to-fuchsia-950/80 text-white shadow-2xl backdrop-blur-md",
              dismiss_storage_key: `${ONBOARDING_NUDGE_DISMISSED_KEY_PREFIX}${user.id}`,
              dismiss_storage_value: "1",
            });
          }
          return;
        }
        if (user.onboarding_completed) {
          mc.auth.updateMe({
            onboarding_completed: false,
            onboarding_required: true,
            onboarding_step: "profile_photo"
          }).catch(() => {});
        }
        navigate(onboardingPath, { replace: true });
        return;
      }

      // After password resets, force the user to visit Settings to set a new password.
      if (!admin && user.must_change_password && location.pathname !== settingsPath && location.pathname !== onboardingPath) {
        navigate(settingsPath, { replace: true });
        return;
      }

      if (!admin && onboardingComplete && !user.onboarding_completed) {
        mc.auth.updateMe({
          onboarding_completed: true,
          onboarding_required: false,
          onboarding_step: "completed"
        }).catch(() => {});
      }

      if (canRunNewUserTutorial(user) && (!user.tutorial_v2_step || user.tutorial_v2_step === "onboarding_pending")) {
        await mc.auth.updateMe({ tutorial_v2_step: "my_map_info_pending" }).catch(() => {});
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
      const notifications = await mc.entities.Notification.filter({
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

    const unsubNotifications = mc.entities.Notification.subscribe((event) => {
      if (event.type === "create" && event.data.to_user_id === currentUser.id) {
        setUnreadNotifications((prev) => prev + 1);
        loadUser();

        if (document.hidden && Notification.permission === "granted" && event.data?.push_enabled !== false) {
          new Notification("Make a Match", {
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
      unsubUser = mc.entities.User.subscribe((event) => {
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

  const pageThemeId =
    currentUser?.is_premium ? (currentUser?.premium_theme || "default") : "default";
  const themeBg = PAGE_THEME_BACKGROUNDS[pageThemeId] || PAGE_THEME_BACKGROUNDS.default;

  const hasCustomBackground = Boolean(currentUser?.is_premium && currentUser?.background_url);
  const customBackgroundIsImage = hasCustomBackground && isImageBackground(currentUser.background_url);
  const customBackgroundIsGradientPreset = hasCustomBackground && !customBackgroundIsImage;

  return (
    <div className="min-h-[100dvh] font-sans text-white transition-colors duration-300 relative">
      <PWAMeta />
      <div className="fixed inset-0 -z-10">
        <div
          className={`absolute inset-0 ${customBackgroundIsGradientPreset ? `bg-gradient-to-br ${currentUser.background_url}` : ""}`}
          style={
            customBackgroundIsImage
              ? {
                  backgroundImage: `url(${currentUser.background_url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat"
                }
              : {
                  backgroundColor: themeBg.base,
                  backgroundImage: themeBg.image,
                  backgroundRepeat: "no-repeat"
                }
          }
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/55" />
      </div>
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
          -webkit-touch-callout: none;
          /* Keep background consistent even when the page rubber-bands past the content on mobile. */
          background-color: var(--bg-deep-space);
          background-image: none;
          overflow-x: hidden;
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
            <Link to={createPageUrl("Home")} className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Compass className="w-6 h-6 text-white select-none" />
              </div>
              <span className="text-2xl font-bold whitespace-nowrap bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Make a Match
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
