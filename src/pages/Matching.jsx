import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { ArrowLeft, Heart, User as UserIcon, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { triggerHaptic } from "@/components/utils/haptics";
import { calculateMatchScore, CATEGORIES_LIST, isProfileDiscoverable } from "@/components/utils/matchingUtils";

export default function Matching() {
  const [searchParams] = useSearchParams();
  const categoryId = searchParams.get("category");
  
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserInterests, setCurrentUserInterests] = useState([]);
  const [matchedUsers, setMatchedUsers] = useState([]);
  const [allInterests, setAllInterests] = useState([]);
  const [loading, setLoading] = useState(true);

  const selectedCategory = categoryId ? CATEGORIES_LIST.find(c => c.id === categoryId) : null;

  useEffect(() => {
    loadData();
  }, [categoryId]);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      if (me.tutorial_v2_step === "matching_highlight") {
        await base44.auth.updateMe({ tutorial_v2_step: "completed", tutorial_completed: true }).catch(() => {});
      }

      const [allProfiles, interests, messages] = await Promise.all([
        base44.entities.UserProfile.list().catch(() => []),
        base44.entities.Interest.list().catch(() => []),
        base44.entities.Message.list().catch(() => [])
      ]);
      
      const interestsList = interests || [];

      setAllInterests(interestsList);
      
      const myInterests = interestsList.filter(i => i.user_id === me.id);
      setCurrentUserInterests(myInterests);

      const otherUsers = (allProfiles || [])
        .filter(p => p.user_id !== me.id)
        .filter((p) => isProfileDiscoverable(p, interestsList))
        .filter(p => !me.blocked_users?.includes(p.user_id))
        .filter(p => !(p.blocked_users || []).includes(me.id))
        .map(p => ({
          id: p.user_id,
          full_name: p.full_name,
          profile_photo: p.profile_photo,
          bio: p.bio,
          quote: p.quote,
          mood: p.mood,
          key_interest_categories: p.key_interest_categories || [],
          onboarding_completed: p.onboarding_completed,
          is_premium: p.is_premium,
          blocked_users: p.blocked_users
        }));

      const usersWithScores = otherUsers.map(user => {
        const matchInfo = calculateMatchScore(me, user, interestsList, messages || []);

        return {
          ...user,
          score: matchInfo.percentage,
          percentage: matchInfo.percentage,
          matchedCategories: matchInfo.matchedCategories,
          hasInteracted: matchInfo.interactionScore > 0,
          canMessage: matchInfo.canMessage
        };
      });

      const categoryFilteredUsers = selectedCategory
        ? usersWithScores.filter((user) =>
            interestsList.some((item) => item.user_id === user.id && item.category === selectedCategory.id)
          )
        : usersWithScores;

      const topMatches = categoryFilteredUsers
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      setMatchedUsers(topMatches);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getUserCategoryInterests = (userId, catId) => {
    return allInterests.filter(i => i.user_id === userId && i.category === catId);
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
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <Link to={createPageUrl("Match")}>
          <button className="flex items-center gap-2 text-purple-200 hover:text-white mb-6 transition-colors">
            <ArrowLeft className="w-5 h-5" />
            Back to search
          </button>
        </Link>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full mb-4 shadow-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">
              {selectedCategory ? `Matching by category ${selectedCategory.label}` : 'General matching'}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
            {selectedCategory ? (
              <span className="flex items-center justify-center gap-3">
                <span className="text-5xl">{selectedCategory.icon}</span>
                {selectedCategory.label}
              </span>
            ) : (
              'Your matches'
            )}
          </h1>
          <p className="text-lg text-purple-200">
            {matchedUsers.length > 0 
              ? `Found ${matchedUsers.length} match${matchedUsers.length === 1 ? '' : 'es'}`
              : 'No matches yet'
            }
          </p>
        </motion.div>

        {/* Matching Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Side - Current User */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-4"
          >
            <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-4 border-white sticky top-8">
              <div className="text-center mb-6">
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="relative inline-block"
                >
                  <div
                    className="w-40 h-40 mx-auto rounded-full border-4 border-white shadow-2xl overflow-hidden"
                    style={{
                      boxShadow: `0 20px 50px rgba(0,0,0,0.2), 0 10px 25px ${selectedCategory?.color || '#8B5CF6'}60`
                    }}
                  >
                    {currentUser?.profile_photo ? (
                      <img
                        src={currentUser.profile_photo}
                        alt={currentUser.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: selectedCategory?.color || '#8B5CF6' }}
                      >
                        <UserIcon className="w-20 h-20 text-white" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-xl">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                </motion.div>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
                {currentUser?.full_name}
              </h2>
              {currentUser?.bio && (
                <p className="text-sm text-gray-600 text-center mb-6">
                  {currentUser.bio}
                </p>
              )}

              <div className="space-y-3">
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {currentUserInterests.length}
                    </div>
                    <div className="text-xs text-gray-600">Total interests</div>
                  </div>
                </div>

                {selectedCategory && (
                  <div 
                    className="rounded-xl p-4"
                    style={{ backgroundColor: `${selectedCategory.color}15` }}
                  >
                    <div className="text-center">
                      <div className="text-2xl mb-2">{selectedCategory.icon}</div>
                      <div 
                        className="text-2xl font-bold mb-1"
                        style={{ color: selectedCategory.color }}
                      >
                        {currentUserInterests.filter(i => i.category === categoryId).length}
                      </div>
                      <div className="text-xs text-gray-600">
                        {selectedCategory.label}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Side - Matched Users */}
          <div className="lg:col-span-8">
            {matchedUsers.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl p-12 shadow-2xl border-4 border-white text-center"
              >
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Heart className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No matches yet
                </h3>
                <p className="text-gray-600 mb-6">
                  {selectedCategory 
                    ? `No users with matches in category ${selectedCategory.label}`
                    : 'No users with common interests yet'
                  }
                </p>
                <Link to={createPageUrl("Match")}>
                  <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all">
                    Back to search
                  </button>
                </Link>
              </motion.div>
            ) : (
              <div className="space-y-6">
                {matchedUsers.map((user, index) => {
                  const categoryInterests = selectedCategory 
                    ? getUserCategoryInterests(user.id, categoryId)
                    : [];

                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ x: -10, scale: 1.02 }}
                    >
                      <Link 
                        to={`${createPageUrl("UserProfile")}?userId=${user.id}`}
                        onClick={() => triggerHaptic('medium')}
                      >
                        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-6 shadow-xl hover:shadow-2xl border-4 border-white transition-all group">
                          <div className="flex items-center gap-6">
                            {/* User Photo */}
                            <div className="relative flex-shrink-0">
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden"
                                style={{
                                  boxShadow: `0 10px 30px ${selectedCategory?.color || '#8B5CF6'}40`
                                }}
                              >
                                {user.profile_photo ? (
                                  <img
                                    src={user.profile_photo}
                                    alt={user.full_name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-full h-full flex items-center justify-center"
                                    style={{ backgroundColor: selectedCategory?.color || '#8B5CF6' }}
                                  >
                                    <UserIcon className="w-12 h-12 text-white" />
                                  </div>
                                )}
                              </motion.div>
                              
                              {/* Match Badge */}
                               <div className="absolute -top-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                                 <span className="text-white font-bold text-sm">{user.score}%</span>
                               </div>
                            </div>

                            {/* User Info */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-xl font-bold text-gray-900">
                                  {user.full_name}
                                </h3>
                                {user.mood && (
                                  <span className="text-2xl">{user.mood}</span>
                                )}
                                {user.hasInteracted && (
                                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-semibold select-none">
                                    Connected
                                  </span>
                                )}
                              </div>
                              {user.bio && (
                                <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                                  {user.bio}
                                </p>
                              )}
                              {user.quote && (
                                <p className="text-xs text-purple-600 italic mb-3 line-clamp-1">
                                  "{user.quote}"
                                </p>
                              )}

                              <div className="flex flex-wrap gap-2 mb-3">
                                {user.matchedCategories.map(catId => {
                                  const cat = CATEGORIES_LIST.find(c => c.id === catId);
                                  return (
                                    <div
                                      key={catId}
                                      className="px-3 py-1 rounded-full text-xs font-bold text-white"
                                      style={{ backgroundColor: cat.color }}
                                    >
                                      {cat.icon} {cat.label}
                                    </div>
                                  );
                                })}
                              </div>

                              {selectedCategory && categoryInterests.length > 0 && (
                                <div className="flex gap-2">
                                  {categoryInterests.slice(0, 4).map((interest, idx) => (
                                    <motion.div
                                      key={interest.id}
                                      initial={{ scale: 0, rotate: -180 }}
                                      animate={{ scale: 1, rotate: 0 }}
                                      transition={{ delay: 0.2 + idx * 0.05 }}
                                      className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white shadow-md"
                                    >
                                      <img
                                        src={interest.photo_url}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    </motion.div>
                                  ))}
                                  {categoryInterests.length > 4 && (
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 border-2 border-white shadow-md flex items-center justify-center">
                                      <span className="text-xs font-bold text-gray-600">
                                        +{categoryInterests.length - 4}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Arrow */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                <ArrowLeft className="w-5 h-5 text-white rotate-180" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}

                {/* Placeholder slots for up to 5 users */}
                {matchedUsers.length < 5 && Array.from({ length: 5 - matchedUsers.length }).map((_, index) => (
                  <motion.div
                    key={`placeholder-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: (matchedUsers.length + index) * 0.1 }}
                    className="bg-white/40 backdrop-blur-sm rounded-3xl p-6 border-4 border-dashed border-gray-200 flex items-center justify-center min-h-[140px]"
                  >
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                        <UserIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-400 font-medium">Slot for a match</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
