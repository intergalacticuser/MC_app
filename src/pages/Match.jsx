import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import UserCarousel from "../components/match/UserCarousel";
import TutorialPopup from "@/components/tutorial/TutorialPopup";
import PerfectMatch from "../components/match/PerfectMatch";
import { CATEGORIES_LIST, isProfileDiscoverable } from "@/components/utils/matchingUtils";

const CATEGORIES = CATEGORIES_LIST;

export default function Match() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [users, setUsers] = useState([]);
  const [interests, setInterests] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const me = await base44.auth.me();
      setCurrentUser(me);
      
      if (me.tutorial_v2_step === "search_info_pending" || me.tutorial_v2_step === "search_highlight") {
         setShowTutorial("search_info");
      }
      
      const [allProfiles, allInterests] = await Promise.all([
        base44.entities.UserProfile.list().catch(() => []),
        base44.entities.Interest.list().catch(() => [])
      ]);

      const interestsList = allInterests || [];
      
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
      
      setUsers(otherUsers);
      setInterests(interestsList);
    } catch (error) {
      console.error("Error loading data:", error);
    }
    setLoading(false);
  };

  const getMatchedUsers = () => {
    if (!selectedCategory) return [];

    const usersWithCategory = users.filter(user => {
      const userInterests = interests.filter(i => i.user_id === user.id && i.category === selectedCategory.id);
      return userInterests.length > 0;
    });

    return usersWithCategory.sort((a, b) => {
      const aInterests = interests.filter(i => i.user_id === a.id).length;
      const bInterests = interests.filter(i => i.user_id === b.id).length;
      return bInterests - aInterests;
    });
  };

  const getUserInterests = (userId, categoryId = null) => {
    return interests.filter(i => i.user_id === userId && (!categoryId || i.category === categoryId));
  };



  const matchedUsers = getMatchedUsers();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      <div className="max-w-7xl mx-auto px-4">
        {/* USER CAROUSEL - ALWAYS SHOWN */}
        <div className="pt-6">
          {users.length > 0 ? (
            <UserCarousel users={users} />
          ) : (
            <div className="bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 py-8 rounded-3xl border-4 border-white shadow-2xl text-center">
              <p className="text-lg font-bold text-gray-700">No other users to show yet</p>
              <p className="text-sm text-gray-600 mt-2">Invite friends to see them here!</p>
            </div>
          )}
        </div>

        {showTutorial && (
          <TutorialPopup 
            step={showTutorial} 
            onClose={async () => {
               await base44.auth.updateMe({ tutorial_v2_step: "matching_highlight", tutorial_completed: false });
               setCurrentUser((prev) => (prev ? { ...prev, tutorial_v2_step: "matching_highlight" } : prev));
               setShowTutorial(null);
            }} 
          />
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12 mt-8"
        >
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full mb-6 shadow-lg">
            <Search className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-600">Find your circle</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent">
            Search by interests
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Select a category and find people with similar interests
          </p>
        </motion.div>

        {/* Category Selector */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-12"
        >
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Select a category to search
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {CATEGORIES.map((category, index) => {
                // isSelected is no longer used for rendering this component, as clicking navigates away
                // const isSelected = selectedCategory?.id === category.id;
                return (
                  <motion.button
                    key={category.id}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.3 + index * 0.05,
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    whileHover={{ 
                      scale: 1.05,
                      y: -5,
                      boxShadow: `0 20px 40px ${category.color}40`
                    }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate(`${createPageUrl("Matching")}?category=${category.id}`)}
                    className={`relative p-6 rounded-2xl border-4 transition-all duration-300 border-transparent bg-white/50 hover:bg-white/80`}
                    style={{
                      boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                    }}
                  >
                    {/* The isSelected block is removed as per the outline */}
                    {/* {isSelected && (
                      <motion.div
                        layoutId="selected-category"
                        className="absolute inset-0 rounded-2xl"
                        style={{ 
                          background: `linear-gradient(135deg, ${category.color}20, ${category.color}10)`,
                          border: `3px solid ${category.color}`
                        }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )} */}
                    <div className="relative z-10 flex flex-col items-center gap-3">
                      <div // Removed conditional animation as per outline
                        className="text-4xl"
                      >
                        {category.icon}
                      </div>
                      <span className="font-bold text-gray-900">{category.label}</span>
                      <span className="text-xs text-gray-500">
                        {interests.filter(i => i.category === category.id).length} interests
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* The entire Results section (AnimatePresence) is removed as per the outline */}

        {/* Perfect Match Section */}
        {currentUser && (
          <PerfectMatch 
            currentUser={currentUser}
            allUsers={users}
            interests={interests}
          />
        )}
      </div>
    </div>
  );
}
