import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Heart, User as UserIcon, Crown, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";

export default function PerfectMatch({ currentUser, allUsers, interests }) {
  const [loading, setLoading] = useState(false);
  const [matchedUser, setMatchedUser] = useState(null);
  const [matchDetails, setMatchDetails] = useState(null);

  const findPerfectMatch = async () => {
    setLoading(true);
    setMatchedUser(null);
    setMatchDetails(null);

    try {
      // Get all necessary data
      const myInterests = interests.filter(i => i.user_id === currentUser.id);
      const messages = await base44.entities.Message.list();
      
      // Create user interests description for AI
      const myInterestsDesc = myInterests.map(i => ({
        category: i.category,
        photo_url: i.photo_url
      }));

      // Create extended description of other users
      const otherUsersDesc = allUsers
        .filter(u => u.id !== currentUser.id)
        .map(user => {
          const userInterests = interests.filter(i => i.user_id === user.id);
          const interactionCount = messages.filter(msg => 
            (msg.from_user_id === currentUser.id && msg.to_user_id === user.id) ||
            (msg.from_user_id === user.id && msg.to_user_id === currentUser.id)
          ).length;
          
          return {
            user_id: user.id,
            user_name: user.full_name,
            mood: user.mood || null,
            quote: user.quote || null,
            bio: user.bio || null,
            interaction_count: interactionCount,
            interests: userInterests.map(i => ({
              category: i.category,
              photo_url: i.photo_url
            }))
          };
        })
        .filter(u => u.interests.length > 0);

      // Use AI for advanced analysis
      const prompt = `You are an expert at finding perfect matches based on comprehensive compatibility analysis.

MY PROFILE:
- Interests: ${myInterests.length} photos by categories
${JSON.stringify(myInterestsDesc, null, 2)}
- Mood: ${currentUser.mood || 'not specified'}
- Quote/motto: "${currentUser.quote || 'not specified'}"
- Bio: "${currentUser.bio || 'not specified'}"

AVAILABLE USERS:
${JSON.stringify(otherUsersDesc, null, 2)}

Analyze multi-factor compatibility and find ONE user with maximum match.
Analysis criteria (in order of importance):
1. INTERESTS (40%): Quantity and visual similarity in matching categories
2. MOOD (20%): Compatibility of current emotional states (energetic vs calm)
3. VALUES (20%): Similarity in quotes, life mottos, and biographies
4. INTERACTION (20%): Communication history (interaction_count) - users with interaction history get bonus

Return JSON with:
- user_id: ID of found user
- match_score: compatibility score 0-100
- matching_categories: array of matching categories
- compatibility_factors: object with scores {interests: 0-100, mood: 0-100, values: 0-100, interaction: 0-100}
- reason: detailed compatibility explanation in English (2-3 sentences, mention all factors)`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            user_id: { type: "string" },
            match_score: { type: "number" },
            matching_categories: { type: "array", items: { type: "string" } },
            compatibility_factors: {
              type: "object",
              properties: {
                interests: { type: "number" },
                mood: { type: "number" },
                values: { type: "number" },
                interaction: { type: "number" }
              }
            },
            reason: { type: "string" }
          }
        }
      });

      // Find the user
      const foundUser = allUsers.find(u => u.id === result.user_id);
      
      if (foundUser) {
        setMatchedUser(foundUser);
        setMatchDetails(result);
      }
    } catch (error) {
      console.error("Error finding match:", error);
    }

    setLoading(false);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      love_relationships: "💞",
      lifestyle_values: "🧭",
      cultural_taste: "🎭",
      hobbies_activities: "🏃",
      food_everyday_life: "🍽️"
    };
    return icons[category] || "✨";
  };

  if (!currentUser?.is_premium) {
    return (
      <div className="mt-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border-4 border-white text-center"
        >
          <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Perfect Match is Premium</h3>
          <p className="text-gray-600 mb-6">
            Upgrade to Premium to unlock AI-based deep compatibility analysis.
          </p>
          <Link to={createPageUrl("Premium")}>
            <button className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:shadow-lg transition-all">
              Unlock Premium
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="mt-16">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-br from-pink-100 via-purple-100 to-indigo-100 rounded-3xl p-8 shadow-2xl border-4 border-white overflow-hidden"
      >
        {/* Animated Background */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 30 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-full"
              style={{
                background: `linear-gradient(135deg, #FF1493, #8B5CF6)`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -30, 0],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-6 py-3 rounded-full mb-4 shadow-xl"
            >
              <Crown className="w-5 h-5" />
              <span className="font-bold">Premium Feature</span>
            </motion.div>
            
            <h2 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Perfect Match
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              AI will find the perfect person based on deep analysis of all your interests and photos
            </p>
          </div>

          {/* Button */}
          {!matchedUser && !loading && (
            <div className="flex justify-center">
              <motion.button
                onClick={findPerfectMatch}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 rounded-2xl blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white px-12 py-6 rounded-2xl font-bold text-xl shadow-2xl flex items-center gap-3">
                  <Sparkles className="w-6 h-6" />
                  Find Perfect Match
                  <Heart className="w-6 h-6" />
                </div>
              </motion.button>
            </div>
          )}

          {/* Loading */}
          <AnimatePresence>
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="inline-block mb-6"
                >
                  <Sparkles className="w-16 h-16 text-purple-600" />
                </motion.div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  AI is analyzing matches...
                </h3>
                <p className="text-gray-600">
                  Searching for the perfect match among {allUsers.length - 1} users
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {matchedUser && matchDetails && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
                className="mt-8"
              >
                <Link to={`${createPageUrl("UserProfile")}?userId=${matchedUser.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="bg-white rounded-3xl p-8 shadow-2xl border-4 border-pink-200 cursor-pointer"
                  >
                    {/* Match Score */}
                    <div className="text-center mb-6">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.3, type: "spring" }}
                        className="inline-block relative"
                      >
                        <div className="text-6xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">
                          {matchDetails.match_score}%
                        </div>
                        <div className="text-sm text-gray-600 font-semibold mt-1">Match</div>
                      </motion.div>
                    </div>

                    {/* User Info */}
                    <div className="flex flex-col items-center mb-6">
                      <motion.div
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-xl mb-4"
                        style={{
                          boxShadow: "0 20px 40px rgba(219, 39, 119, 0.3)"
                        }}
                      >
                        {matchedUser.profile_photo ? (
                          <img
                            src={matchedUser.profile_photo}
                            alt={matchedUser.full_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-pink-400 to-purple-400 flex items-center justify-center">
                            <UserIcon className="w-16 h-16 text-white" />
                          </div>
                        )}
                      </motion.div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-3xl font-bold text-gray-900">
                          {matchedUser.full_name}
                        </h3>
                        {matchedUser.mood && (
                          <span className="text-3xl">{matchedUser.mood}</span>
                        )}
                      </div>
                      
                      {matchedUser.bio && (
                        <p className="text-gray-600 text-center max-w-md mb-2">
                          {matchedUser.bio}
                        </p>
                      )}
                      
                      {matchedUser.quote && (
                        <p className="text-sm text-purple-600 italic text-center max-w-md">
                          "{matchedUser.quote}"
                        </p>
                      )}
                    </div>

                    {/* Compatibility Factors */}
                    {matchDetails.compatibility_factors && (
                      <div className="mb-6">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                          Compatibility Factors
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-purple-50 dark:bg-purple-900/30 rounded-xl p-3">
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                              {matchDetails.compatibility_factors.interests}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Interests</div>
                          </div>
                          <div className="bg-pink-50 dark:bg-pink-900/30 rounded-xl p-3">
                            <div className="text-2xl font-bold text-pink-600 dark:text-pink-400">
                              {matchDetails.compatibility_factors.mood}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Mood</div>
                          </div>
                          <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-xl p-3">
                            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                              {matchDetails.compatibility_factors.values}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Values</div>
                          </div>
                          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3">
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                              {matchDetails.compatibility_factors.interaction}%
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">Interaction</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Matching Categories */}
                    <div className="mb-6">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3 text-center">
                        Matching Interests
                      </h4>
                      <div className="flex flex-wrap justify-center gap-2">
                        {matchDetails.matching_categories.map((category, idx) => (
                          <motion.div
                            key={category}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ delay: 0.5 + idx * 0.1, type: "spring" }}
                            className="bg-gradient-to-r from-pink-100 to-purple-100 px-4 py-2 rounded-full border-2 border-pink-200 select-none"
                          >
                            <span className="text-lg mr-1">{getCategoryIcon(category)}</span>
                            <span className="font-semibold text-gray-800 capitalize">{category}</span>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 border-2 border-pink-100">
                      <div className="flex items-start gap-3">
                        <Heart className="w-6 h-6 text-pink-500 flex-shrink-0 mt-1" />
                        <p className="text-gray-700 leading-relaxed">
                          {matchDetails.reason}
                        </p>
                      </div>
                    </div>

                    {/* CTA */}
                    <div className="text-center mt-6">
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 text-white px-8 py-4 rounded-xl font-bold shadow-lg"
                      >
                        View Profile
                      </motion.div>
                    </div>
                  </motion.div>
                </Link>

                {/* Try Again Button */}
                <div className="text-center mt-6">
                  <motion.button
                    onClick={findPerfectMatch}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="text-purple-600 hover:text-purple-700 font-semibold underline"
                  >
                    Find Another Match
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
