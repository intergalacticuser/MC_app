import React from "react";
import { motion } from "framer-motion";

const SPACE_THEMES = {
  default: {
    bg: "radial-gradient(1200px circle at 20% 20%, rgba(124, 58, 237, 0.35), transparent 55%)," +
      "radial-gradient(900px circle at 80% 30%, rgba(236, 72, 153, 0.20), transparent 60%)," +
      "linear-gradient(135deg, rgb(30, 27, 75) 0%, rgb(88, 28, 135) 50%, rgb(131, 24, 67) 100%)",
    planets: [
      { size: 160, color: "from-purple-500 to-pink-500", opacity: 0.18, blur: "blur-3xl" },
      { size: 120, color: "from-blue-500 to-cyan-500", opacity: 0.16, blur: "blur-3xl" },
      { size: 200, color: "from-orange-500 to-red-500", opacity: 0.12, blur: "blur-3xl" },
      { size: 140, color: "from-emerald-500 to-teal-500", opacity: 0.12, blur: "blur-3xl" }
    ]
  },
  nebula: {
    bg: "radial-gradient(1000px circle at 22% 18%, rgba(240, 147, 251, 0.30), transparent 55%)," +
      "radial-gradient(900px circle at 75% 28%, rgba(245, 87, 108, 0.22), transparent 60%)," +
      "radial-gradient(900px circle at 55% 88%, rgba(99, 102, 241, 0.16), transparent 65%)," +
      "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(59, 29, 79) 55%, rgb(17, 24, 39) 100%)",
    planets: [
      { size: 170, color: "from-fuchsia-500 to-rose-500", opacity: 0.18, blur: "blur-3xl" },
      { size: 125, color: "from-indigo-500 to-sky-500", opacity: 0.15, blur: "blur-3xl" },
      { size: 210, color: "from-purple-500 to-pink-500", opacity: 0.12, blur: "blur-3xl" },
      { size: 145, color: "from-cyan-500 to-blue-500", opacity: 0.12, blur: "blur-3xl" }
    ]
  },
  cyberpunk: {
    bg: "radial-gradient(900px circle at 20% 20%, rgba(250, 112, 154, 0.28), transparent 60%)," +
      "radial-gradient(900px circle at 78% 26%, rgba(254, 225, 64, 0.18), transparent 60%)," +
      "radial-gradient(900px circle at 52% 88%, rgba(34, 211, 238, 0.12), transparent 70%)," +
      "linear-gradient(135deg, rgb(7, 10, 18) 0%, rgb(63, 26, 77) 55%, rgb(7, 10, 18) 100%)",
    planets: [
      { size: 160, color: "from-pink-500 to-amber-400", opacity: 0.16, blur: "blur-3xl" },
      { size: 125, color: "from-cyan-400 to-sky-500", opacity: 0.14, blur: "blur-3xl" },
      { size: 210, color: "from-fuchsia-500 to-purple-500", opacity: 0.12, blur: "blur-3xl" },
      { size: 145, color: "from-yellow-400 to-orange-500", opacity: 0.11, blur: "blur-3xl" }
    ]
  },
  zen: {
    bg: "radial-gradient(1000px circle at 24% 20%, rgba(137, 247, 254, 0.22), transparent 58%)," +
      "radial-gradient(1000px circle at 76% 28%, rgba(102, 166, 255, 0.20), transparent 60%)," +
      "linear-gradient(135deg, rgb(7, 16, 36) 0%, rgb(29, 49, 93) 55%, rgb(9, 20, 46) 100%)",
    planets: [
      { size: 165, color: "from-sky-400 to-cyan-300", opacity: 0.16, blur: "blur-3xl" },
      { size: 120, color: "from-blue-500 to-indigo-500", opacity: 0.14, blur: "blur-3xl" },
      { size: 205, color: "from-cyan-500 to-emerald-500", opacity: 0.11, blur: "blur-3xl" },
      { size: 140, color: "from-teal-400 to-sky-500", opacity: 0.11, blur: "blur-3xl" }
    ]
  },
  sunset: {
    bg: "radial-gradient(1000px circle at 24% 18%, rgba(252, 182, 159, 0.22), transparent 60%)," +
      "radial-gradient(900px circle at 78% 26%, rgba(255, 236, 210, 0.14), transparent 60%)," +
      "radial-gradient(900px circle at 55% 90%, rgba(236, 72, 153, 0.10), transparent 70%)," +
      "linear-gradient(135deg, rgb(18, 11, 20) 0%, rgb(127, 61, 46) 55%, rgb(15, 23, 42) 100%)",
    planets: [
      { size: 170, color: "from-orange-400 to-rose-500", opacity: 0.16, blur: "blur-3xl" },
      { size: 120, color: "from-amber-300 to-orange-500", opacity: 0.13, blur: "blur-3xl" },
      { size: 215, color: "from-pink-500 to-red-500", opacity: 0.11, blur: "blur-3xl" },
      { size: 145, color: "from-purple-500 to-rose-500", opacity: 0.10, blur: "blur-3xl" }
    ]
  },
  aurora: {
    bg: "radial-gradient(1100px circle at 18% 20%, rgba(168, 237, 234, 0.22), transparent 60%)," +
      "radial-gradient(1100px circle at 78% 26%, rgba(254, 214, 227, 0.18), transparent 60%)," +
      "radial-gradient(900px circle at 56% 88%, rgba(34, 197, 94, 0.10), transparent 70%)," +
      "linear-gradient(135deg, rgb(7, 19, 34) 0%, rgb(65, 80, 99) 55%, rgb(15, 23, 42) 100%)",
    planets: [
      { size: 170, color: "from-emerald-400 to-cyan-400", opacity: 0.15, blur: "blur-3xl" },
      { size: 120, color: "from-cyan-300 to-sky-400", opacity: 0.13, blur: "blur-3xl" },
      { size: 215, color: "from-pink-400 to-rose-500", opacity: 0.11, blur: "blur-3xl" },
      { size: 145, color: "from-teal-400 to-emerald-500", opacity: 0.10, blur: "blur-3xl" }
    ]
  }
};

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export default function SpaceBackdrop({ density = "auth", themeId = "default" } = {}) {
  const counts = density === "auth"
    ? { stars: 48, sparks: 22, planets: 4 }
    : { stars: 60, sparks: 35, planets: 6 };

  const theme = SPACE_THEMES[themeId] || SPACE_THEMES.default;

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
    const base = (theme?.planets || SPACE_THEMES.default.planets).slice(0, counts.planets);
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
  }, [counts.planets, themeId]);

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
      <div className="absolute inset-0" style={{ backgroundImage: theme.bg }} />

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
