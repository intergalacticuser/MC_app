import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { User as UserIcon } from "lucide-react";

export default function UserCarousel({ users }) {
  // Дублируем массив для бесконечной прокрутки
  const duplicatedUsers = [...users, ...users, ...users];

  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-purple-100 via-pink-100 to-orange-100 py-6 mb-8 rounded-3xl border-4 border-white shadow-2xl">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-white/30"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <motion.div
        className="flex gap-6"
        animate={{
          x: [0, "-33.33%"],
        }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 40,
            ease: "linear",
          },
        }}
      >
        {duplicatedUsers.map((user, index) => (
          <Link
            key={`${user.id}-${index}`}
            to={`${createPageUrl("UserProfile")}?userId=${user.id}`}
            className="flex-shrink-0"
          >
            <motion.div
              whileHover={{ scale: 1.2, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="relative group cursor-pointer"
            >
              {/* Glow effect */}
              <div
                className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 blur-xl opacity-0 group-hover:opacity-70 transition-opacity duration-300"
                style={{ width: '110px', height: '110px', transform: 'translate(-50%, -50%)', left: '50%', top: '50%' }}
              />
              
              <div className="relative w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-xl bg-gradient-to-br from-purple-400 to-pink-400 group-hover:border-purple-300 transition-all duration-300">
                {user.profile_photo ? (
                  <img
                    src={user.profile_photo}
                    alt={user.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              
              {/* Name Tooltip */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300 whitespace-nowrap pointer-events-none z-30">
                <div className="bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-2xl border-2 border-purple-200">
                  <span className="text-xs font-bold text-gray-900">{user.full_name}</span>
                </div>
              </div>

              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-purple-400 pointer-events-none"
                animate={{
                  scale: [1, 1.4, 1.4],
                  opacity: [0.6, 0, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatDelay: 1,
                }}
              />
            </motion.div>
          </Link>
        ))}
      </motion.div>
      
      {/* Edge gradients for smooth fade */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-purple-100 to-transparent pointer-events-none z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-orange-100 to-transparent pointer-events-none z-10" />
    </div>
  );
}