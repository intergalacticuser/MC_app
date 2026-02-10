import React, { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { base44 } from "@/api/base44Client";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10),
  success: () => navigator.vibrate && navigator.vibrate([20, 10, 20, 10, 40])
};

export default function CreatePulse({ user, onClose, onSuccess }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    setSending(true);
    haptics.success();
    
    try {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      await base44.entities.Pulse.create({
        user_id: user.id,
        text: text.trim(),
        expires_at: expiresAt.toISOString()
      });
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error creating pulse:", error);
      alert("Failed to create pulse");
    }
    setSending(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Send a Pulse</h2>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Share what's on your mind right now. Pulses disappear after 24 hours.
        </p>

        <form onSubmit={handleSubmit}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's your vibe right now? 🌟"
            maxLength={140}
            className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl resize-none focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {text.length}/140
            </span>
            <button
              type="submit"
              disabled={!text.trim() || sending}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? "Sending..." : "Send Pulse"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}