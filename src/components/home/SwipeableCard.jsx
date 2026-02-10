import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { MESSAGE_UNLOCK_THRESHOLD, normalizeCategoryId } from "@/components/utils/matchingUtils";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10),
  success: () => navigator.vibrate && navigator.vibrate([20, 10, 20, 10, 40])
};
import { motion, useMotionValue, useTransform } from "framer-motion";
import { User as UserIcon, X, Heart, Eye } from "lucide-react";

export default function SwipeableCard({ user, interests, onSwipeLeft, onSwipeRight, index }) {
  const [exitX, setExitX] = useState(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);
  const hobbyLabels = Array.from(
    new Set(
      interests
        .filter((interest) => normalizeCategoryId(interest.category) === "hobbies_activities")
        .map((interest) => String(interest.title || interest.category || "").trim())
        .filter(Boolean)
    )
  );
  const previewLabels = hobbyLabels.slice(0, 3);

  const handleDragEnd = (event, info) => {
    if (Math.abs(info.offset.x) > 100) {
      setExitX(info.offset.x > 0 ? 1000 : -1000);
      if (info.offset.x > 0) {
        haptics.success();
        setTimeout(() => onSwipeRight(user), 200);
      } else {
        haptics.light();
        setTimeout(() => onSwipeLeft(user), 200);
      }
    }
  };

  const handleOrbit = () => {
    haptics.success();
    setExitX(1000);
    setTimeout(() => onSwipeRight(user), 200);
  };

  const handlePass = () => {
    haptics.light();
    setExitX(-1000);
    setTimeout(() => onSwipeLeft(user), 200);
  };

  return (
    <motion.div
      style={{
        x,
        rotate,
        opacity,
        position: "absolute",
        width: "100%",
        cursor: "grab"
      }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX ? { x: exitX } : {}}
      transition={exitX ? { duration: 0.3 } : { type: "spring", stiffness: 300, damping: 30 }}
      whileTap={{ cursor: "grabbing" }}
      initial={{ scale: 0.95, opacity: 0, y: 50 }}
      whileInView={{ scale: 1, opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <div className="relative bg-gradient-to-br from-white/90 to-white/70 dark:from-gray-800/90 dark:to-gray-900/70 backdrop-blur-xl rounded-3xl p-6 shadow-2xl border border-white/50 dark:border-gray-700/50 overflow-hidden select-none">
        {/* Swipe indicators */}
        <motion.div
          className="absolute top-8 right-8 bg-red-500 text-white p-4 rounded-full rotate-12"
          style={{ opacity: useTransform(x, [-200, -50, 0], [1, 0.5, 0]) }}
        >
          <X className="w-8 h-8 select-none" />
        </motion.div>
        <motion.div
          className="absolute top-8 left-8 bg-green-500 text-white p-4 rounded-full -rotate-12"
          style={{ opacity: useTransform(x, [0, 50, 200], [0, 0.5, 1]) }}
        >
          <Heart className="w-8 h-8 select-none" />
        </motion.div>

        <Link to={`${createPageUrl("UserProfile")}?userId=${user.id}`}>
          <div className="text-center mb-6 pointer-events-none">
            <div className="relative inline-block mb-4">
              <div className="w-40 h-40 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-2xl">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                    <UserIcon className="w-20 h-20 text-white select-none" />
                  </div>
                )}
              </div>
              {user.mood && (
                <div className="absolute -bottom-2 -right-2 w-14 h-14 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-gray-700">
                  <span className="text-3xl">{user.mood}</span>
                </div>
              )}
            </div>

            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{user.full_name}</h3>
            
            {/* Match Percentage */}
            {user.matchPercentage !== undefined && (
              <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-bold text-sm mb-2 ${
                user.matchPercentage >= MESSAGE_UNLOCK_THRESHOLD
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white"
                  : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
              }`}>
                <span>🔗</span>
                {user.matchPercentage}% Compatibility
              </div>
            )}
            {user.bio && <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">{user.bio}</p>}
            {user.quote && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-3 mb-4">
                <p className="text-xs text-purple-700 dark:text-purple-300 italic line-clamp-2">"{user.quote}"</p>
              </div>
            )}
          </div>
        </Link>

        {previewLabels.length > 0 && (
          <div className="flex gap-2 flex-wrap justify-center mb-6">
            {previewLabels.map((label, idx) => (
              <div
                key={`${label}-${idx}`}
                className="px-3 py-1.5 rounded-full border border-white/70 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 text-xs font-semibold text-gray-700 dark:text-gray-200 shadow-lg"
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-4 justify-center items-center pointer-events-auto">
          <button
            onClick={handlePass}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-400 to-red-600 text-white shadow-xl hover:scale-110 transition-transform flex items-center justify-center"
          >
            <X className="w-8 h-8 select-none" />
          </button>
          <Link to={`${createPageUrl("UserProfile")}?userId=${user.id}`}>
            <button className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-xl hover:scale-110 transition-transform flex items-center justify-center">
              <Eye className="w-7 h-7 select-none" />
            </button>
          </Link>
          <button
            onClick={handleOrbit}
            className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-green-600 text-white shadow-xl hover:scale-110 transition-transform flex items-center justify-center"
          >
            <Heart className="w-10 h-10 select-none" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
