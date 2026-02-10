import React from "react";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SuperNovaButton({ currentUser, targetUser, onSuccess }) {
  const [sending, setSending] = React.useState(false);

  const handleSuperNova = async () => {
    if ((currentUser.coins || 100) < 20) {
      alert("Not enough cosmic energy! You need 20 coins for a Super Nova.");
      return;
    }

    setSending(true);
    try {
      // Deduct coins
      await base44.auth.updateMe({
        coins: (currentUser.coins || 100) - 20
      });

      // Create super nova match
      await base44.entities.Match.create({
        from_user_id: currentUser.id,
        to_user_id: targetUser.id,
        is_super_nova: true
      });

      // Create premium notification
      await base44.entities.Notification.create({
        type: "match",
        from_user_id: currentUser.id,
        to_user_id: targetUser.id,
        text: `💥 ${currentUser.full_name} sent you a SUPER NOVA! This is a special match!`
      });

      onSuccess();
    } catch (error) {
      console.error("Error sending Super Nova:", error);
      alert("Failed to send Super Nova");
    }
    setSending(false);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleSuperNova}
      disabled={sending}
      className="relative px-6 py-3 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white rounded-xl font-bold shadow-2xl hover:shadow-3xl transition-all disabled:opacity-50 overflow-hidden"
    >
      <motion.div
        className="absolute inset-0 bg-white/20"
        animate={{
          scale: [1, 2, 2, 1],
          opacity: [0.5, 0, 0, 0.5]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <span className="relative flex items-center gap-2">
        {sending ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Super Nova (20 coins)
          </>
        )}
      </span>
    </motion.button>
  );
}