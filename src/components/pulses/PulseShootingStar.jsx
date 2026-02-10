import React from "react";
import { motion } from "framer-motion";
import { User as UserIcon, MessageCircle, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10)
};

export default function PulseShootingStar({ pulse, user, index, onReply }) {
  const startX = Math.random() * 100;
  const startY = -10;
  const endX = startX + (Math.random() * 40 - 20);
  const endY = 110;
  const duration = 15 + Math.random() * 10;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${startX}%`,
        top: `${startY}%`,
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        x: [`0%`, `${endX - startX}vw`],
        y: [`0%`, `${endY - startY}vh`],
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0],
      }}
      transition={{
        duration: duration,
        delay: index * 2,
        repeat: Infinity,
        repeatDelay: Math.random() * 5,
        ease: "linear"
      }}
    >
      <motion.div
        className="relative pointer-events-auto cursor-pointer"
        whileHover={{ scale: 1.1 }}
        onClick={() => {
          haptics.light();
          onReply(pulse);
        }}
      >
        {/* Trailing glow */}
        <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-20 h-1 bg-gradient-to-r from-transparent via-purple-500/50 to-purple-500/80 blur-sm" />
        
        {/* Pulse card */}
        <div className="bg-gradient-to-br from-purple-600/90 to-pink-600/90 backdrop-blur-xl rounded-2xl p-4 min-w-[280px] max-w-[320px] shadow-2xl border border-white/20">
          <div className="flex items-start gap-3 mb-2">
            <Link to={`${createPageUrl("UserProfile")}?userId=${pulse.user_id}`}>
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/50 flex-shrink-0">
                {user?.profile_photo ? (
                  <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <Link to={`${createPageUrl("UserProfile")}?userId=${pulse.user_id}`}>
                  <span className="font-bold text-white text-sm truncate hover:underline">
                    {user?.full_name}
                  </span>
                </Link>
                {user?.mood && <span className="text-lg">{user.mood}</span>}
              </div>
              <p className="text-white text-sm leading-snug">{pulse.text}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.light();
                onReply(pulse);
              }}
              className="flex items-center gap-1 text-white/80 hover:text-white text-xs bg-white/10 px-2 py-1 rounded-full transition-colors"
            >
              <MessageCircle className="w-3 h-3" />
              Reply
            </button>
            
            <button
              onClick={(e) => {
                e.stopPropagation();
                haptics.light();
                const shareText = `Check out this pulse from ${user?.full_name}: "${pulse.text}" - MindCircle`;
                const shareUrl = `${window.location.origin}${createPageUrl("UserProfile")}?userId=${pulse.user_id}`;
                
                if (navigator.share) {
                  navigator.share({
                    title: 'MindCircle Pulse',
                    text: shareText,
                    url: shareUrl
                  }).catch(console.error);
                } else {
                  navigator.clipboard.writeText(`${shareText} ${shareUrl}`);
                  toast.success("Link copied to clipboard!");
                }
              }}
              className="flex items-center gap-1 text-white/80 hover:text-white text-xs p-1 rounded-full hover:bg-white/10 transition-colors"
            >
              <Share2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}