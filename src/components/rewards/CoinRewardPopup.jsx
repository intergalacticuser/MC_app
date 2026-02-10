import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

export default function CoinRewardPopup({ amount, onClose }) {
  const [showCoins, setShowCoins] = useState(false);

  useEffect(() => {
    // Show confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FFFFFF'],
      shapes: ['circle'],
      ticks: 200,
      gravity: 0.8,
      scalar: 1.2
    });
  }, []);

  const handleClose = () => {
    setShowCoins(true);
    setTimeout(() => {
      onClose();
    }, 100);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0, rotateY: -180 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.5, opacity: 0, rotateY: 180 }}
          transition={{ type: "spring", stiffness: 200, damping: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl max-w-md w-full p-8 relative shadow-2xl border-4 border-amber-400"
        >
          {/* Animated Background Stars */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-amber-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 text-center">
            {/* Icon */}
            <motion.div
              animate={{
                rotate: [0, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1],
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                repeatDelay: 1,
              }}
              className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full mb-6 shadow-2xl"
            >
              <Coins className="w-12 h-12 text-white" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-bold text-gray-900 mb-3"
            >
              Congratulations!
            </motion.h2>

            {/* Amount */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 rounded-full mb-4 shadow-lg"
            >
              <Sparkles className="w-6 h-6 text-white" />
              <span className="text-2xl font-bold text-white">+{amount}</span>
              <Coins className="w-6 h-6 text-white" />
            </motion.div>

            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-600 mb-6 whitespace-pre-line"
            >
              {`You've earned ${amount} coins\nfor completing this category.`}
            </motion.p>

            {/* Button */}
            <Button
              onClick={handleClose}
              className="w-full py-6 bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold text-lg rounded-xl shadow-lg"
            >
              OK
            </Button>
          </div>
        </motion.div>
      </motion.div>

      {/* Flying Coins Animation */}
      <AnimatePresence>
        {showCoins && (
          <>
            {Array.from({ length: 15 }).map((_, i) => (
              <FlyingCoin key={i} delay={i * 0.05} />
            ))}
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function FlyingCoin({ delay }) {
  // Get coins counter position (top right in navbar)
  const targetX = window.innerWidth - 100;
  const targetY = 20;

  // Start from center of screen
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight / 2;

  // Add some randomness to the path
  const randomOffsetX = (Math.random() - 0.5) * 200;
  const randomOffsetY = (Math.random() - 0.5) * 200;

  return (
    <motion.div
      initial={{
        position: "fixed",
        left: startX,
        top: startY,
        scale: 0,
        opacity: 0,
        rotate: 0,
      }}
      animate={{
        left: [startX, startX + randomOffsetX, targetX],
        top: [startY, startY + randomOffsetY, targetY],
        scale: [0, 1.5, 0.5],
        opacity: [0, 1, 0],
        rotate: [0, 360, 720],
      }}
      transition={{
        duration: 1.5,
        delay: delay,
        ease: "easeInOut",
      }}
      className="pointer-events-none z-[300]"
    >
      <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
        <Coins className="w-5 h-5 text-white" />
      </div>
    </motion.div>
  );
}
