import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { User as UserIcon, Sparkles } from "lucide-react";
import { normalizeCategoryId } from "@/components/utils/matchingUtils";

export default function FloatingUserCard({ user, interests, index, matchPercentage }) {
  const hobbiesOnly = interests.filter((interest) => normalizeCategoryId(interest.category) === "hobbies_activities");
  const hobbyLabels = Array.from(
    new Set(
      hobbiesOnly
        .map((interest) => String(interest.title || interest.category || "").trim())
        .filter(Boolean)
    )
  );
  const previewLabels = hobbyLabels.slice(0, 3);
  const hobbyCount = hobbyLabels.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, rotateY: -30 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        rotateY: 0,
      }}
      whileHover={{ 
        y: -20,
        rotateY: 10,
        rotateX: 5,
        scale: 1.05,
        transition: { duration: 0.3 }
      }}
      transition={{ 
        delay: index * 0.1,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      style={{ transformStyle: "preserve-3d" }}
    >
      <Link to={`${createPageUrl("UserProfile")}?userId=${user.id}`}>
        <div className="relative group cursor-pointer select-none" style={{ transformStyle: "preserve-3d" }}>
          {/* Floating glow effect */}
          <motion.div
            className="absolute inset-0 rounded-3xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 blur-2xl"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 0.8, 0.5],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{ transform: "translateZ(-30px)" }}
          />

          {/* Main card */}
          <div 
            className="relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.15), inset 0 1px 2px rgba(255,255,255,0.5)"
            }}
          >
            {/* Animated particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {Array.from({ length: 8 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-purple-400/50"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -20, 0],
                    opacity: [0, 1, 0],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    repeat: Infinity,
                    delay: Math.random() * 2,
                  }}
                />
              ))}
            </div>

            {/* Profile section */}
            <div className="relative z-10 text-center mb-6">
              <motion.div
                className="relative inline-block"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-2xl">
                  {user.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                      <UserIcon className="w-16 h-16 text-white select-none" />
                    </div>
                  )}
                </div>
                {matchPercentage !== undefined ? (
                   <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-700">
                     <span className="text-white font-bold text-sm">{matchPercentage}%</span>
                   </div>
                 ) : user.mood ? (
                   <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-700">
                     <span className="text-2xl">{user.mood}</span>
                   </div>
                 ) : null}
              </motion.div>

              <h3 className="text-2xl font-bold mt-4 mb-2 text-gray-900 dark:text-white">
                {user.full_name}
              </h3>
              {user.bio && (
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                  {user.bio}
                </p>
              )}
              {user.quote && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 mb-4">
                  <p className="text-xs text-purple-700 dark:text-purple-300 italic line-clamp-2">
                    "{user.quote}"
                  </p>
                </div>
              )}
            </div>

            {/* Interests preview */}
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-500 select-none" />
                  Интересы
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {hobbyCount} {hobbyCount === 1 ? "хобби" : "хобби"}
                </span>
              </div>
              
              {previewLabels.length > 0 ? (
                <div className="flex gap-2 flex-wrap justify-center">
                  {previewLabels.map((label, idx) => (
                    <motion.div
                      key={`${label}-${idx}`}
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ 
                        delay: 0.3 + idx * 0.05,
                        type: "spring",
                        stiffness: 200
                      }}
                      whileHover={{ scale: 1.15, rotate: 5, zIndex: 10 }}
                      className="px-3 py-1.5 rounded-full border border-white/70 dark:border-gray-700 shadow-lg bg-white/80 dark:bg-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-200"
                    >
                      {label}
                    </motion.div>
                  ))}
                  {hobbyLabels.length > 3 && (
                    <div className="px-3 py-1.5 rounded-full bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/50 dark:to-pink-900/50 flex items-center justify-center border border-white dark:border-gray-700 shadow-lg">
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-300">
                        +{hobbyLabels.length - 3}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-center text-gray-400 dark:text-gray-600 text-sm py-4">
                  Нет интересов
                </p>
              )}
            </div>

            {/* Hover overlay */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/10 group-hover:to-pink-500/10 rounded-3xl transition-all duration-300 pointer-events-none"
            />
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
