import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import { motion, AnimatePresence } from "framer-motion";
import { Users, Sparkles, Grid3x3, Layers, Zap, Loader2, ArrowDown } from "lucide-react";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10),
  success: () => navigator.vibrate && navigator.vibrate([20, 10, 20, 10, 40])
};
import UserCard from "../components/home/UserCard";
import FloatingUserCard from "../components/home/FloatingUserCard";
import SwipeableCard from "../components/home/SwipeableCard";
import DailyAlignment from "../components/home/DailyAlignment";
import CreatePulse from "../components/pulses/CreatePulse";
import PulseShootingStar from "../components/pulses/PulseShootingStar";
import PulseReply from "../components/pulses/PulseReply";
import GalaxyBackground from "../components/home/GalaxyBackground";
import { calculateMatchScore, isProfileDiscoverable } from "@/components/utils/matchingUtils";

export default function Discover() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [userInterests, setUserInterests] = useState({});
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [visualMode, setVisualMode] = useState("floating");
  const [swipeMode, setSwipeMode] = useState(false);
  const [swipeStack, setSwipeStack] = useState([]);
  const [pulses, setPulses] = useState([]);
  const [pulseUsers, setPulseUsers] = useState({});
  const [showCreatePulse, setShowCreatePulse] = useState(false);
  const [replyingToPulse, setReplyingToPulse] = useState(null);
  const [pullProgress, setPullProgress] = useState(0);
  const [dailyHighlight, setDailyHighlight] = useState(null);

  const dailyHighlightLines = React.useMemo(() => {
    if (!dailyHighlight?.text) return [];
    return String(dailyHighlight.text)
      .split(".")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 3);
  }, [dailyHighlight]);

  // Load data for users who passed the check
  const loadData = async (me) => {
    if (!me) return;
    console.log("Discover loadData: starting for user", me.id, me.email);
    try {
       // Use UserProfile entity (readable by all users) instead of User.list() (admin-only)
       let allProfiles = [];
       let allInterests = [];
       let messages = [];

       try { allProfiles = await base44.entities.UserProfile.list() || []; console.log("Discover: loaded profiles:", allProfiles.length); } catch(e) { console.error("Failed to load profiles:", e); }
       try { allInterests = await base44.entities.Interest.list() || []; console.log("Discover: loaded interests:", allInterests.length); } catch(e) { console.error("Failed to load interests:", e); }
       try { messages = await base44.entities.Message.list() || []; console.log("Discover: loaded messages:", messages.length); } catch(e) { console.error("Failed to load messages:", e); }

       const interestsMap = {};
       allInterests.forEach(interest => {
         if (!interestsMap[interest.user_id]) {
           interestsMap[interest.user_id] = [];
         }
         interestsMap[interest.user_id].push(interest);
       });
       // Convert UserProfile records to user-like objects
       const myBlockedUsers = me.blocked_users || [];
       const allUsers = allProfiles
         .filter(p => p.user_id && p.user_id !== me.id)
         .filter((p) => isProfileDiscoverable(p, allInterests || []))
         .filter(p => !myBlockedUsers.includes(p.user_id))
         .filter(p => !(p.blocked_users || []).includes(me.id))
         .map(p => ({
           id: p.user_id,
           full_name: p.full_name || "",
           email: p.email || "",
           profile_photo: p.profile_photo || "",
           bio: p.bio || "",
           quote: p.quote || "",
           mood: p.mood || "",
           background_url: p.background_url || "",
           key_interest_categories: p.key_interest_categories || [],
           onboarding_completed: p.onboarding_completed,
           is_premium: p.is_premium,
           blocked_users: p.blocked_users || []
         }));

       console.log("Discover: filtered users:", allUsers.length, allUsers.map(u => u.full_name));

       const usersWithScores = allUsers.map(user => {
         try {
           const matchInfo = calculateMatchScore(me, user, allInterests, messages);
           return { ...user, matchPercentage: matchInfo.percentage };
         } catch(e) {
           return { ...user, matchPercentage: 0 };
         }
       });

       setUsers(usersWithScores);
       setSwipeStack(usersWithScores);
       setUserInterests(interestsMap);
       setDailyHighlight(me?.daily_highlight || null);
       base44.auth.trackSearchImpressions(allUsers.map((item) => item.id)).catch(() => {});
    } catch (error) {
       console.error("Error loading discover data:", error);
    } finally {
       setLoading(false);
       setRefreshing(false);
    }
  };

  const handleSwipeLeft = (user) => {
    haptics.light();
    setSwipeStack(prev => prev.filter(u => u.id !== user.id));
  };

  const handleSwipeRight = async (user) => {
    haptics.success();
    
    try {
      // Check daily orbit limit
      const today = new Date().toISOString().split('T')[0];
      const todayMatches = await base44.entities.Match.filter({
        from_user_id: currentUser.id,
        created_date: { $gte: `${today}T00:00:00Z` }
      });
      
      const dailyLimit = 10;
      if (todayMatches.length >= dailyLimit && !currentUser.is_premium) {
        alert(`Daily orbit limit reached! Get premium or wait until tomorrow. Or use a Super Nova (20 coins) for unlimited orbits today!`);
        return;
      }
      
      // Create match record
      await base44.entities.Match.create({
        from_user_id: currentUser.id,
        to_user_id: user.id,
        is_super_nova: false
      });
      
      // Create notification
      await base44.entities.Notification.create({
        type: "match",
        from_user_id: currentUser.id,
        to_user_id: user.id,
        text: `${currentUser.full_name} wants to orbit with you! 🌟`
      });
    } catch (error) {
      console.error("Error creating match:", error);
    }
    
    setSwipeStack(prev => prev.filter(u => u.id !== user.id));
  };

  const loadPulses = async () => {
    try {
      const now = new Date().toISOString();
      const allPulses = await Promise.race([
        base44.entities.Pulse.filter({ expires_at: { $gte: now } }, "-created_date", 20),
        new Promise((_, rej) => setTimeout(() => rej("pulse_timeout"), 5000))
      ]).catch(() => []);
      
      setPulses(allPulses || []);
      
      // Reuse users already loaded in main data, don't call User.list() again
      // pulseUsers will be populated from the main users list
    } catch (error) {
      // Silently handle - pulses are optional
    }
  };

  useEffect(() => {
    let cancelled = false;
    
    const init = async () => {
      let me;
      try {
        me = await base44.auth.me();
      } catch (e) {
        console.error("Discover: auth.me() failed", e);
        setLoading(false);
        return;
      }
      if (cancelled) return;
      
      setCurrentUser(me);
      setDailyHighlight(me?.daily_highlight || null);
      
      loadData(me);
    };

    init();
    
    return () => { cancelled = true; };
  }, []);

  // Load pulses only after we confirm user is NOT new
  useEffect(() => {
    if (currentUser) {
      loadPulses();
    }
  }, [currentUser]);

  useEffect(() => {
    let startY = 0;
    let currentPull = 0;
    
    const handleTouchStart = (e) => {
      if (window.scrollY === 0) {
        startY = e.touches[0].clientY;
      }
    };
    
    const handleTouchMove = (e) => {
      const currentY = e.touches[0].clientY;
      const scrollTop = window.scrollY;
      
      if (scrollTop === 0 && !refreshing && !loading && startY > 0) {
        const diff = currentY - startY;
        if (diff > 0) {
          currentPull = Math.min(diff * 0.6, 150); // Add resistance
          setPullProgress(currentPull);
        }
      }
    };

    const handleTouchEnd = () => {
      if (currentPull > 80 && !refreshing && !loading && currentUser) {
        setRefreshing(true);
        loadData(currentUser).finally(() => {
           setPullProgress(0);
        });
      } else {
        setPullProgress(0);
      }
      startY = 0;
      currentPull = 0;
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [refreshing, loading]);

  return (
    <div className="min-h-screen py-12 px-4 relative overflow-hidden">
      {/* Deep Space Background */}
      <GalaxyBackground />
      
      {/* Pull to Refresh Indicator */}
      <div 
        className="fixed top-24 left-0 right-0 flex justify-center z-50 pointer-events-none transition-all duration-300"
        style={{ 
          transform: `translateY(${refreshing ? 20 : pullProgress * 0.5}px)`, 
          opacity: pullProgress > 0 || refreshing ? 1 : 0 
        }}
      >
        <div className="bg-black/40 backdrop-blur-md border border-white/10 p-3 rounded-full shadow-xl">
          {refreshing ? (
            <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
          ) : (
            <ArrowDown 
              className="w-6 h-6 text-purple-400 transition-transform duration-200" 
              style={{ transform: `rotate(${Math.min(pullProgress * 2, 180)}deg)` }} 
            />
          )}
        </div>
      </div>

      {/* Shooting Star Pulses */}
      {pulses.map((pulse, index) => (
        <PulseShootingStar
          key={pulse.id}
          pulse={pulse}
          user={pulseUsers[pulse.user_id]}
          index={index}
          onReply={setReplyingToPulse}
        />
      ))}


      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl px-4 py-2 rounded-full mb-6 border border-white/20 select-none">
            <Sparkles className="w-4 h-4 text-purple-300 select-none" />
            <span className="text-sm font-medium text-purple-200">Galaxy Discovery</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-white">
            Explore the Galaxy
          </h1>
          <p className="text-xl text-purple-200 max-w-2xl mx-auto mb-8">
            Discover planets through their visual interests and cosmic energy
          </p>

          {dailyHighlight?.text && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative max-w-4xl mx-auto mb-7 overflow-hidden rounded-3xl border border-fuchsia-300/30 bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 backdrop-blur-xl px-5 py-5 md:px-8 md:py-6 text-center shadow-[0_16px_60px_rgba(101,66,255,0.25)]"
            >
              <div className="absolute inset-0 pointer-events-none opacity-70 bg-[radial-gradient(circle_at_12%_20%,rgba(255,255,255,0.22),transparent_40%),radial-gradient(circle_at_88%_22%,rgba(255,189,255,0.2),transparent_42%)]" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/35 bg-white/15 text-fuchsia-100 text-xs font-semibold tracking-wide uppercase mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Daily Highlight
                </div>

                <h3 className="text-white text-xl md:text-2xl font-bold leading-tight">
                  Your Cosmic Update
                </h3>

                {Number(dailyHighlight?.top_match_percentage || 0) > 0 && (
                  <p className="mt-1 text-sm text-purple-100">
                    Top match today: <span className="font-semibold text-white">{dailyHighlight.top_match_percentage}%</span>
                  </p>
                )}

                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  {(dailyHighlightLines.length ? dailyHighlightLines : [dailyHighlight.text]).map((line, idx) => (
                    <div
                      key={`${line}-${idx}`}
                      className="rounded-2xl border border-white/20 bg-black/20 px-3 py-2 text-sm text-purple-50 leading-relaxed"
                    >
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Visual Mode Toggle */}
          <div className="flex gap-3 flex-wrap justify-center">
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              onClick={() => {
                haptics.light();
                setShowCreatePulse(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 text-white rounded-full font-bold shadow-lg hover:shadow-xl transition-all"
            >
              <Sparkles className="w-5 h-5 select-none" />
              <span>Send Pulse</span>
            </motion.button>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl rounded-full p-1 border border-white/20"
            >
            <button
              onClick={() => { setVisualMode("floating"); setSwipeMode(false); haptics.light(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all select-none ${
                visualMode === "floating" && !swipeMode
                  ? "bg-white/20 text-white"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              <Layers className="w-4 h-4 select-none" />
              <span className="text-sm font-medium">Floating</span>
            </button>
            <button
              onClick={() => { setSwipeMode(true); haptics.light(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all select-none ${
                swipeMode
                  ? "bg-white/20 text-white"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              <Zap className="w-4 h-4 select-none" />
              <span className="text-sm font-medium">Swipe</span>
            </button>
            <button
              onClick={() => { setVisualMode("standard"); setSwipeMode(false); haptics.light(); }}
              className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all select-none ${
                visualMode === "standard" && !swipeMode
                  ? "bg-white/20 text-white"
                  : "text-purple-200 hover:text-white"
              }`}
            >
              <Grid3x3 className="w-4 h-4 select-none" />
              <span className="text-sm font-medium">Standard</span>
            </button>
          </motion.div>
          </div>
        </motion.div>

        {/* Daily Alignment */}
        {!loading && currentUser && users.length > 0 && !swipeMode && (
          <DailyAlignment 
            currentUser={currentUser}
            allUsers={users}
            interests={Object.values(userInterests).flat()}
          />
        )}

        {/* Users Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : swipeMode ? (
          <div className="max-w-md mx-auto">
            {swipeStack.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-20"
              >
                <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4 select-none" />
                <h3 className="text-xl font-semibold text-white mb-2">No more planets to explore!</h3>
                <p className="text-purple-200 mb-6">Come back tomorrow for new alignments</p>
                <button
                  onClick={() => { setSwipeStack(users); haptics.light(); }}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all select-none"
                >
                  Reset Stack
                </button>
              </motion.div>
            ) : (
              <div className="relative h-[600px]">
                <AnimatePresence>
                  {swipeStack.slice(0, 3).reverse().map((user, index) => (
                    <SwipeableCard
                      key={user.id}
                      user={user}
                      interests={userInterests[user.id] || []}
                      onSwipeLeft={handleSwipeLeft}
                      onSwipeRight={handleSwipeRight}
                      index={index}
                    />
                  ))}
                </AnimatePresence>
                {swipeStack.length > 0 && (
                  <div className="absolute -bottom-16 left-0 right-0 text-center">
                    <p className="text-purple-200 text-sm">
                      {swipeStack.length} planet{swipeStack.length !== 1 ? 's' : ''} remaining
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : users.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <Users className="w-16 h-16 text-purple-300 mx-auto mb-4 select-none" />
            <h3 className="text-xl font-semibold text-white mb-2">No users yet</h3>
            <p className="text-purple-200">Be the first to create your planet!</p>
            <Link to={createPageUrl("MyProfile")}>
              <button className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:shadow-lg transition-all select-none">
                Create my planet
              </button>
            </Link>
          </motion.div>
        ) : (
          <div className={`grid grid-cols-1 ${visualMode === "standard" ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"} gap-8`}>
            {users.map((user, index) => (
              visualMode === "floating" ? (
                <FloatingUserCard 
                  key={user.id} 
                  user={user} 
                  interests={userInterests[user.id] || []}
                  index={index}
                  matchPercentage={user.matchPercentage}
                />
              ) : (
                <UserCard 
                  key={user.id} 
                  user={user} 
                  interests={userInterests[user.id] || []}
                  index={index}
                  matchPercentage={user.matchPercentage}
                />
              )
            ))}
          </div>
        )}

        {/* Create Pulse Modal */}
        <AnimatePresence>
          {showCreatePulse && currentUser && (
            <CreatePulse
              user={currentUser}
              onClose={() => setShowCreatePulse(false)}
              onSuccess={loadPulses}
            />
          )}
        </AnimatePresence>

        {/* Pulse Reply Modal */}
        <AnimatePresence>
          {replyingToPulse && currentUser && (
            <PulseReply
              pulse={replyingToPulse}
              pulseUser={pulseUsers[replyingToPulse.user_id]}
              currentUser={currentUser}
              onClose={() => setReplyingToPulse(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
