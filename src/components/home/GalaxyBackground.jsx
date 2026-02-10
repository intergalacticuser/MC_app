import React from "react";
import { motion } from "framer-motion";

const planets = [
  { size: 80, color: "from-purple-500 to-pink-500", delay: 0, duration: 20 },
  { size: 60, color: "from-blue-500 to-cyan-500", delay: 2, duration: 25 },
  { size: 100, color: "from-orange-500 to-red-500", delay: 4, duration: 18 },
  { size: 70, color: "from-green-500 to-emerald-500", delay: 1, duration: 22 },
  { size: 90, color: "from-yellow-500 to-orange-500", delay: 3, duration: 24 },
  { size: 50, color: "from-pink-500 to-purple-500", delay: 5, duration: 20 },
];

const GalaxyBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-[#0B0C15] to-[#0B0C15]" />
      
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
};

export default GalaxyBackground;