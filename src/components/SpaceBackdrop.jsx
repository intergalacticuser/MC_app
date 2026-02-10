import React from "react";
import { motion } from "framer-motion";

const PLANET_PRESETS = [
  { size: 160, color: "from-purple-500 to-pink-500", opacity: 0.18, blur: "blur-3xl" },
  { size: 120, color: "from-blue-500 to-cyan-500", opacity: 0.16, blur: "blur-3xl" },
  { size: 200, color: "from-orange-500 to-red-500", opacity: 0.12, blur: "blur-3xl" },
  { size: 140, color: "from-emerald-500 to-teal-500", opacity: 0.12, blur: "blur-3xl" }
];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function SpaceBackdrop({ density = "auth" } = {}) {
  const counts = density === "auth"
    ? { stars: 48, sparks: 22, planets: 4 }
    : { stars: 60, sparks: 35, planets: 6 };

  const stars = React.useMemo(() => {
    return Array.from({ length: counts.stars }).map((_, i) => ({
      key: `star-${i}`,
      left: `${rand(0, 100)}%`,
      top: `${rand(0, 100)}%`,
      size: rand(1, 2.2),
      duration: rand(2.2, 5.2),
      delay: rand(0, 5)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planets = React.useMemo(() => {
    const base = PLANET_PRESETS.slice(0, counts.planets);
    return base.map((p, i) => ({
      key: `planet-${i}`,
      ...p,
      left: `${rand(-10, 90)}%`,
      top: `${rand(-10, 90)}%`,
      dx1: rand(-120, 120),
      dy1: rand(-120, 120),
      dx2: rand(-120, 120),
      dy2: rand(-120, 120),
      duration: rand(18, 28),
      delay: rand(0, 4)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sparks = React.useMemo(() => {
    const colors = ["bg-purple-300", "bg-fuchsia-300", "bg-cyan-300", "bg-indigo-300"];
    return Array.from({ length: counts.sparks }).map((_, i) => ({
      key: `spark-${i}`,
      left: `${rand(0, 100)}%`,
      top: `${rand(0, 100)}%`,
      size: rand(1.5, 3.2),
      color: colors[i % colors.length],
      duration: rand(14, 28),
      delay: rand(0, 5),
      x1: rand(-280, 280),
      y1: rand(-220, 220),
      x2: rand(-280, 280),
      y2: rand(-220, 220)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-950" />

      {/* Stars */}
      <div className="absolute inset-0">
        {stars.map((s) => (
          <motion.div
            key={s.key}
            className="absolute rounded-full bg-white"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              opacity: 0.6
            }}
            animate={{
              opacity: [0.15, 1, 0.2],
              scale: [1, 1.7, 1]
            }}
            transition={{
              duration: s.duration,
              repeat: Infinity,
              delay: s.delay
            }}
          />
        ))}
      </div>

      {/* Planets */}
      {planets.map((p) => (
        <motion.div
          key={p.key}
          className={`absolute rounded-full bg-gradient-to-br ${p.color} ${p.blur}`}
          style={{
            width: p.size,
            height: p.size,
            left: p.left,
            top: p.top,
            opacity: p.opacity
          }}
          animate={{
            x: [0, p.dx1, p.dx2, 0],
            y: [0, p.dy1, p.dy2, 0],
            scale: [1, 1.15, 0.95, 1]
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut"
          }}
        />
      ))}

      {/* Flying sparks */}
      <div className="absolute inset-0">
        {sparks.map((p) => (
          <motion.div
            key={p.key}
            className={`absolute rounded-full ${p.color}`}
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: 0.35,
              filter: "blur(0.2px)"
            }}
            animate={{
              x: [0, p.x1, p.x2, 0],
              y: [0, p.y1, p.y2, 0],
              opacity: [0.15, 0.7, 0.2, 0.45],
              scale: [1, 1.6, 0.9, 1.2]
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: p.delay
            }}
          />
        ))}
      </div>

      {/* Vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/55" />
    </div>
  );
}

