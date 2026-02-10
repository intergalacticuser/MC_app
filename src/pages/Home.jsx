import React from "react";
import { motion } from "framer-motion";
import { Sparkles, Compass, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const planets = [
  { size: 80, color: "from-purple-500 to-pink-500", delay: 0, duration: 20 },
  { size: 60, color: "from-blue-500 to-cyan-500", delay: 2, duration: 25 },
  { size: 100, color: "from-orange-500 to-red-500", delay: 4, duration: 18 },
  { size: 70, color: "from-green-500 to-emerald-500", delay: 1, duration: 22 },
  { size: 90, color: "from-yellow-500 to-orange-500", delay: 3, duration: 24 },
  { size: 50, color: "from-pink-500 to-purple-500", delay: 5, duration: 20 },
];

export default function Home() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Stars Background */}
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 1, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 2 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          />
        ))}
      </div>

      {/* Floating Planets */}
      {planets.map((planet, index) => (
        <motion.div
          key={index}
          className={`absolute rounded-full bg-gradient-to-br ${planet.color} opacity-20 blur-xl`}
          style={{
            width: planet.size,
            height: planet.size,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [0, Math.random() * 200 - 100, 0],
            y: [0, Math.random() * 200 - 100, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: planet.duration,
            repeat: Infinity,
            delay: planet.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center pb-20">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 1 }}
          className="mb-8"
        >
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl">
            <Compass className="w-16 h-16 text-white" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-6xl md:text-8xl font-bold text-white mb-6"
        >
          MindCircle
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-xl md:text-2xl text-purple-200 mb-12 max-w-2xl"
        >
          Connect through what truly matters
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link to={createPageUrl("Discover")}>
            <button className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-2xl font-bold text-lg shadow-2xl hover:shadow-purple-500/50 transition-all flex items-center gap-2">
              Explore Galaxy
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </Link>
          
          <Link to={createPageUrl("MyProfile")}>
            <button className="px-8 py-4 bg-white/10 backdrop-blur-xl text-white rounded-2xl font-bold text-lg border-2 border-white/20 hover:bg-white/20 transition-all">
              My Universe
            </button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-16 flex items-center gap-2 text-purple-300"
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-sm">Discover connections through visual interests</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-8"
        >
          <Link 
            to={createPageUrl("PrivacyPolicy")} 
            className="text-xs text-white/30 hover:text-white/60 transition-colors"
          >
            Privacy Policy
          </Link>
        </motion.div>
      </div>

      {/* Floating particles - Chaotic Orbits */}
      {Array.from({ length: 35 }).map((_, i) => (
        <motion.div
          key={`particle-${i}`}
          className="absolute w-1.5 h-1.5 bg-purple-400 rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            x: [
              0,
              Math.random() * 600 - 300,
              Math.random() * 600 - 300,
              Math.random() * 600 - 300,
              0
            ],
            y: [
              0,
              Math.random() * 600 - 300,
              Math.random() * 600 - 300,
              Math.random() * 600 - 300,
              0
            ],
            opacity: [0.2, 0.8, 0.2, 0.8, 0.2],
            scale: [1, 1.5, 0.5, 1.2, 1],
          }}
          transition={{
            duration: 15 + Math.random() * 25,
            repeat: Infinity,
            ease: "easeInOut",
            delay: Math.random() * 5,
          }}
        />
      ))}
    </div>
  );
}