import React, { useState, useEffect } from "react";
import { mc } from "@/api/mcClient";
import { motion } from "framer-motion";
import { Sparkles, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { calculateMatchScore } from "@/components/utils/matchingUtils";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10)
};

export default function DailyAlignment({ currentUser, allUsers, interests }) {
  const [alignedUsers, setAlignedUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && allUsers.length > 0) {
      findDailyAlignment();
    }
  }, [currentUser, allUsers]);

  const findDailyAlignment = async () => {
    try {
      const messages = await mc.entities.Message.list();
      const otherUsers = allUsers.filter(u => u.id !== currentUser.id);

      // Score users using the unified matching system
      const scoredUsers = otherUsers.map(user => {
        const matchInfo = calculateMatchScore(currentUser, user, interests, messages);
        return { ...user, alignmentScore: matchInfo.percentage };
      });

      // Get top 3
      const top3 = scoredUsers
        .sort((a, b) => b.alignmentScore - a.alignmentScore)
        .slice(0, 3);

      setAlignedUsers(top3);
    } catch (error) {
      console.error("Error finding daily alignment:", error);
    }
    setLoading(false);
  };

  if (loading || alignedUsers.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-12"
    >
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 backdrop-blur-xl rounded-3xl p-8 border border-white/20 shadow-2xl">
        <div className="text-center mb-6">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block mb-3"
          >
            <Sparkles className="w-8 h-8 text-yellow-400 select-none" />
          </motion.div>
          <h2 className="text-3xl font-bold text-white mb-2">Daily Cosmic Alignment</h2>
          <p className="text-purple-200">These 3 planets are perfectly aligned with you today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {alignedUsers.map((user, index) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              onClick={() => haptics.light()}
            >
              <Link to={`${createPageUrl("UserProfile")}?userId=${user.id}`}>
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 hover:border-white/40 transition-all cursor-pointer select-none relative overflow-hidden">
                   <div className="text-center">
                    <div className="relative inline-block mb-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-white/30 shadow-lg">
                        {user.profile_photo ? (
                          <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                            <UserIcon className="w-12 h-12 text-white select-none" />
                          </div>
                        )}
                      </div>
                      {user.mood && (
                        <div className="absolute -bottom-1 -right-1 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/30">
                          <span className="text-2xl">{user.mood}</span>
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-bold text-white mb-1">{user.full_name}</h3>
                    <p className="text-sm text-purple-200 mb-2 line-clamp-2">{user.bio}</p>
                    
                    <div className="inline-flex items-center gap-1 bg-white/20 px-3 py-1 rounded-full">
                      <Sparkles className="w-3 h-3 text-yellow-400 select-none" />
                      <span className="text-xs text-white font-semibold">{user.alignmentScore}% Match</span>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}