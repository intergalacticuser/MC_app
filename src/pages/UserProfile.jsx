import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { mc } from "@/api/mcClient";
import { ArrowLeft, Sparkles, Lock, MessageCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import MindMapView from "../components/profile/MindMapView";
import CategoryViewer from "../components/profile/CategoryViewer";
import SuperNovaButton from "../components/premium/SuperNovaButton";
import { calculateMatchScore, CATEGORIES_LIST, MESSAGE_UNLOCK_THRESHOLD, buildMatchExplanation } from "@/components/utils/matchingUtils";
import { syncUserProfile } from "@/components/utils/syncProfile";

export default function UserProfile() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  
  const [user, setUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [interests, setInterests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showStardustEffect, setShowStardustEffect] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [matchScore, setMatchScore] = useState(null);
  const [matchExplanation, setMatchExplanation] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const me = await mc.auth.me();
        setCurrentUser(me);

        const profiles = await mc.entities.UserProfile.filter({ user_id: userId }).catch(() => []);
        const p = profiles[0];
        if (!p) {
          setLoading(false);
          return;
        }

        const foundUser = {
          id: p.user_id,
          full_name: p.full_name,
          profile_photo: p.profile_photo,
          bio: p.bio,
          quote: p.quote,
          mood: p.mood,
          key_interest_categories: p.key_interest_categories || [],
          background_url: p.background_url,
          premium_theme: p.premium_theme || "default",
          owned_themes: p.owned_themes || ["default"],
          onboarding_completed: p.onboarding_completed,
          is_premium: p.is_premium,
          blocked_users: p.blocked_users || []
        };

        setUser(foundUser);

        if (me.id !== foundUser.id) {
          mc.auth.recordProfileView(foundUser.id).catch(() => {});
        }

        // Check blocking status
        const isBlockedByMe = me.blocked_users?.includes(foundUser.id);
        const amIBlocked = foundUser.blocked_users?.includes(me.id);
        setIsBlocked(Boolean(isBlockedByMe || amIBlocked));

        const [userInterests, allInterests, allMessages] = await Promise.all([
          mc.entities.Interest.filter({ user_id: userId }).catch(() => []),
          mc.entities.Interest.list().catch(() => []),
          mc.entities.Message.list().catch(() => [])
        ]);

        setInterests(userInterests || []);

        // Calculate match score
        const score = calculateMatchScore(me, foundUser, allInterests, allMessages);
        setMatchScore(score);
        setMatchExplanation(buildMatchExplanation(me, foundUser, allInterests, score));
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadData();
    }
  }, [userId]);

  const canUnlockByMatch = (matchScore?.percentage || 0) >= MESSAGE_UNLOCK_THRESHOLD;
  const isPremiumUser = !!currentUser?.is_premium;
  const canAccessProfile = canUnlockByMatch || isPremiumUser;
  const shouldLockProfile = currentUser?.id !== userId && !canAccessProfile;

  const handleSendStardust = async () => {
    if (!currentUser || sending) return;
    const cost = 10;
    const currentCoins = currentUser.coins || 0;

    if (!canAccessProfile) {
      alert(`You need at least ${MESSAGE_UNLOCK_THRESHOLD}% compatibility or Premium to interact with this profile.`);
      return;
    }

    // Check if user has enough coins
    if (currentCoins < cost) {
      alert("Insufficient coins! You need 10 coins to send Stardust.");
      return;
    }

    setSending(true);
    
    // Optimistic Update
    setCurrentUser({ ...currentUser, coins: currentCoins - cost });
    setShowStardustEffect(true);
    setTimeout(() => setShowStardustEffect(false), 3000);

    try {
      // Deduct coins on server
      await mc.auth.updateMe({ coins: currentCoins - cost });
      
      // Create stardust record
      await mc.entities.Stardust.create({
        from_user_id: currentUser.id,
        to_user_id: userId,
        type: "profile"
      });

      // Create notification
      await mc.entities.Notification.create({
        type: "like",
        from_user_id: currentUser.id,
        to_user_id: userId,
        text: `${currentUser.full_name} sent you Stardust ✨`
      });
      
    } catch (error) {
      console.error("Error sending stardust:", error);
      // Rollback
      setCurrentUser({ ...currentUser, coins: currentCoins });
      setShowStardustEffect(false);
      alert("Error sending Stardust");
    }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!user || isBlocked) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">User not found</h2>
        <Link to={createPageUrl("Discover")}>
          <button className="text-purple-600 hover:underline">Back to Discover</button>
        </Link>
      </div>
    );
  }

  const handleBlockUser = async () => {
    if (!currentUser || !user) return;
    if (!confirm(`Are you sure you want to block ${user.full_name}? You won't see each other anymore.`)) return;

    try {
      const currentBlocked = currentUser.blocked_users || [];
      const newBlocked = [...currentBlocked, user.id];
      
      await mc.auth.updateMe({ blocked_users: newBlocked });
      const updatedMe = await mc.auth.me();
      await syncUserProfile(updatedMe).catch(() => {});
      alert("User blocked");
      window.location.href = createPageUrl("Discover");
    } catch (error) {
      console.error("Error blocking user:", error);
      alert("Error blocking user");
    }
  };

  return (
    <div className="min-h-screen py-8 px-4 relative overflow-hidden">
      {/* Stardust Effect */}
      <AnimatePresence>
        {showStardustEffect && (
          <div className="fixed inset-0 pointer-events-none z-50">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: `linear-gradient(135deg, #FFD700, #FFA500)`,
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                initial={{ scale: 0, opacity: 1 }}
                animate={{
                  scale: [0, 1.5, 0],
                  y: [0, -100],
                  opacity: [1, 1, 0],
                }}
                transition={{
                  duration: 2,
                  delay: Math.random() * 0.5,
                }}
              />
            ))}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl"
            >
              ✨
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to={createPageUrl("Discover")}>
          <button className="flex items-center gap-2 text-purple-200 hover:text-white mb-6 transition-colors select-none">
            <ArrowLeft className="w-5 h-5 select-none" />
            Back to Galaxy
          </button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-xl px-6 py-3 rounded-full mb-4 border border-white/20 select-none">
            <Sparkles className="w-5 h-5 text-purple-300 select-none" />
            <span className="text-sm font-medium text-purple-200">Planet Profile</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
            {user.full_name}'s Planet
          </h1>
          
          {/* Match Score Badge */}
          {matchScore && currentUser && currentUser.id !== userId && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`inline-flex items-center gap-2 px-6 py-3 rounded-full mb-4 font-bold text-white text-lg shadow-lg ${
                matchScore.percentage >= MESSAGE_UNLOCK_THRESHOLD
                  ? "bg-gradient-to-r from-green-500 to-emerald-600"
                  : "bg-gradient-to-r from-gray-500 to-gray-600"
              }`}
            >
              <span className="text-2xl">🔗</span>
              {matchScore.percentage}% Compatibility
            </motion.div>
          )}

          {matchExplanation && currentUser && currentUser.id !== userId && (
            <div className="max-w-2xl mx-auto mt-3 rounded-2xl border border-white/20 bg-white/10 backdrop-blur-xl p-4 text-left">
              <p className="text-sm font-semibold text-purple-100 mb-2">Matched because:</p>
              <ul className="space-y-1 text-sm text-purple-100/90">
                <li>• {matchExplanation.sharedInterests} shared interests across {matchExplanation.sharedCategories} categories</li>
                {matchExplanation.photoMatchesByCategory[0] && (
                  <li>
                    • {matchExplanation.photoMatchesByCategory[0].count} photos matched in{" "}
                    {CATEGORIES_LIST.find((c) => c.id === matchExplanation.photoMatchesByCategory[0].categoryId)?.label || "a category"}
                  </li>
                )}
                <li>• {matchExplanation.sharedValues} shared value entries</li>
                {matchExplanation.keyMatches.length > 0 && (
                  <li>• Key overlaps: {matchExplanation.keyMatches.join(", ")}</li>
                )}
              </ul>
            </div>
          )}

          {user.bio && (
            <p className="text-lg text-purple-200 max-w-2xl mx-auto">{user.bio}</p>
          )}
          
          {/* Action Buttons */}
          {currentUser && currentUser.id !== userId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 flex gap-4 justify-center flex-wrap"
            >
              <Button
                onClick={handleSendStardust}
                disabled={sending || (currentUser.coins || 0) < 10 || !canAccessProfile}
                className="bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white font-bold px-8 py-6 text-lg rounded-2xl shadow-2xl select-none relative overflow-hidden group"
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-orange-400 opacity-0 group-hover:opacity-50 transition-opacity"
                  animate={{
                    scale: [1, 1.5, 1],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                  }}
                />
                <span className="relative flex items-center gap-2">
                  {sending ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 select-none" />
                       Send Stardust
                       <span className="text-sm opacity-80">(10 coins)</span>
                    </>
                  )}
                </span>
              </Button>
              
              <SuperNovaButton
                currentUser={currentUser}
                targetUser={user}
                onSuccess={() => {
                  alert("Super Nova sent! They'll be notified of your special interest!");
                  setCurrentUser({ ...currentUser, coins: (currentUser.coins || 0) - 20 });
                }}
              />
              
              {(currentUser.coins || 0) < 10 && (
                 <p className="text-sm text-red-300 mt-2 w-full text-center">
                   Insufficient coins. You have: {currentUser.coins || 0} coins
                 </p>
               )}
              
              {/* Messages Button */}
              <div className="w-full flex justify-center">
                <motion.button
                  onClick={() => {
                    if (canAccessProfile) {
                      navigate(createPageUrl("Messages") + `?userId=${user.id}`);
                    } else {
                      navigate(createPageUrl("Premium"));
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-8 py-3 rounded-full font-bold text-white text-lg shadow-lg transition-all hover:shadow-xl hover:scale-105 active:scale-95 ${
                    canAccessProfile
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      : "bg-gradient-to-r from-gray-500 to-gray-600"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <MessageCircle className="w-5 h-5" />
                  {canAccessProfile ? "Messages" : "Unlock Chat"}
                </motion.button>
              </div>

              {!canAccessProfile && (
                <p className="w-full text-center text-sm text-orange-300">
                  Need {MESSAGE_UNLOCK_THRESHOLD}% match or Premium to message and view full profile details.
                </p>
              )}

              <div className="w-full text-center mt-4">
                <button 
                  onClick={handleBlockUser}
                  className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                >
                  Block User
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Match Lock or Mind Map */}
         {shouldLockProfile ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border border-white/20 text-center max-w-2xl mx-auto"
          >
            <div className="w-24 h-24 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Lock className="w-12 h-12 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              Unlock this planet
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6 text-lg">
              You need <strong>{MESSAGE_UNLOCK_THRESHOLD}%+ compatibility</strong> or Premium to view {user.full_name}'s interests
            </p>
            <p className="text-gray-500 dark:text-gray-400 mb-8">
              Current compatibility: <strong>{matchScore?.percentage ?? 0}%</strong>
            </p>
            <Link to={createPageUrl("MyProfile")}>
              <button className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all">
                Build Your Profile
              </button>
            </Link>
          </motion.div>
        ) : (
          <MindMapView
            user={user}
            interests={interests}
            categories={CATEGORIES_LIST}
            readonly
            onCategoryClick={(cat) => {
              const catInterests = interests.filter(i => i.category === cat.id);
              if (catInterests.length > 0) {
                if (currentUser?.id !== user?.id) {
                  mc.auth.recordProfileInteraction(user.id, cat.id).catch(() => {});
                }
                setSelectedCategory(cat);
              }
            }}
          />
        )}

        {/* Category Viewer Modal */}
        <AnimatePresence>
          {selectedCategory && (
            <CategoryViewer
              category={selectedCategory}
              interests={interests.filter(i => i.category === selectedCategory.id)}
              onClose={() => setSelectedCategory(null)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
