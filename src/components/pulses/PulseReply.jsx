import React, { useState } from "react";
import { motion } from "framer-motion";
import { X, Send, User as UserIcon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PulseReply({ pulse, pulseUser, currentUser, onClose }) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const navigate = useNavigate();

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      await base44.entities.Message.create({
        from_user_id: currentUser.id,
        to_user_id: pulse.user_id,
        text: `Re: "${pulse.text}"\n\n${message.trim()}`
      });

      await base44.entities.Notification.create({
        type: "message",
        from_user_id: currentUser.id,
        to_user_id: pulse.user_id,
        text: `${currentUser.full_name} replied to your pulse`
      });

      navigate(`${createPageUrl("Messages")}?userId=${pulse.user_id}`);
    } catch (error) {
      console.error("Error sending reply:", error);
      alert("Failed to send reply");
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

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Reply to Pulse</h2>

        {/* Original Pulse */}
        <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-4 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
              {pulseUser?.profile_photo ? (
                <img src={pulseUser.profile_photo} alt={pulseUser.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-gray-900 dark:text-white">{pulseUser?.full_name}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {new Date(pulse.created_date).toLocaleString()}
              </div>
            </div>
          </div>
          <p className="text-gray-800 dark:text-gray-200">{pulse.text}</p>
        </div>

        {/* Reply Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your reply..."
          className="w-full h-32 p-4 bg-gray-50 dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl resize-none focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 text-gray-900 dark:text-white placeholder-gray-400 mb-4"
        />

        <button
          onClick={handleSend}
          disabled={!message.trim() || sending}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <Send className="w-5 h-5" />
              Send Reply
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
