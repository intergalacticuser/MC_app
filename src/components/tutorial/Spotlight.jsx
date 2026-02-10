import React from "react";
import { motion } from "framer-motion";

export default function Spotlight({ text, targetRef, position = "bottom" }) {
  if (!targetRef?.current) return null;

  const rect = targetRef.current.getBoundingClientRect();
  
  const positions = {
    bottom: { top: rect.bottom + 10, left: rect.left + rect.width / 2 },
    top: { top: rect.top - 60, left: rect.left + rect.width / 2 },
    left: { top: rect.top + rect.height / 2, left: rect.left - 10 },
    right: { top: rect.top + rect.height / 2, left: rect.right + 10 }
  };

  const pos = positions[position];

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-[90]"
        style={{ background: "rgba(0, 0, 0, 0.7)" }}
      />
      
      {/* Spotlight circle */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="fixed z-[91] rounded-full"
        style={{
          top: rect.top - 10,
          left: rect.left - 10,
          width: rect.width + 20,
          height: rect.height + 20,
          boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.7), 0 0 30px rgba(139, 92, 246, 0.5)",
          pointerEvents: "none"
        }}
      />

      {/* Hint text */}
      <motion.div
        initial={{ opacity: 0, y: position === "bottom" ? -10 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="fixed z-[92] bg-white dark:bg-gray-900 px-4 py-2 rounded-xl shadow-2xl -translate-x-1/2"
        style={{
          top: pos.top,
          left: pos.left,
          pointerEvents: "none"
        }}
      >
        <div className="text-sm font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
          {text}
        </div>
        <div className="absolute top-1/2 -translate-y-1/2 w-0 h-0 border-8 border-transparent"
          style={{
            [position === "bottom" ? "bottom" : position === "top" ? "top" : position]: "100%",
            [position === "left" ? "right" : position === "right" ? "left" : "left"]: "50%",
            transform: position === "left" || position === "right" ? "translateY(-50%)" : "translateX(-50%)",
            borderBottomColor: position === "top" ? "white" : "transparent",
            borderTopColor: position === "bottom" ? "white" : "transparent",
            borderRightColor: position === "left" ? "white" : "transparent",
            borderLeftColor: position === "right" ? "white" : "transparent"
          }}
        />
      </motion.div>
    </>
  );
}