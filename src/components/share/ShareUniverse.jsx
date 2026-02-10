import React, { useRef } from "react";
import { motion } from "framer-motion";
import { Share2, X, User as UserIcon } from "lucide-react";
import html2canvas from "html2canvas";
import SocialShareButtons from "./SocialShareButtons";
import { createPageUrl } from "@/utils";

export default function ShareUniverse({ user, interests, categories, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = React.useState(false);

  const shareUrl = `${window.location.origin}${createPageUrl("UserProfile")}?userId=${user.id}`;
  const shareText = `Check out ${user.full_name}'s planet on MindCircle! 🪐`;

  const handleNativeShare = async () => {
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2
      });
      
      canvas.toBlob(async (blob) => {
        const file = new File([blob], "my-planet.png", { type: "image/png" });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: `${user.full_name}'s Planet`,
            text: shareText,
            url: shareUrl,
            files: [file]
          });
        } else {
          // If native share with files not supported, try text only or download
          if (navigator.share) {
             await navigator.share({
                title: `${user.full_name}'s Planet`,
                text: shareText,
                url: shareUrl
             });
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "my-planet.png";
          a.click();
        }
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
    setGenerating(false);
  };

  const getCategoryInterests = (categoryId) => {
    return interests.filter(i => i.category === categoryId).slice(0, 3);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 relative my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Share Your Planet</h2>

        {/* Preview Card - Planet Style */}
        <div 
          ref={cardRef}
          className="relative aspect-square rounded-full p-8 mb-6 overflow-hidden"
          style={{
            background: 'radial-gradient(circle at 30% 30%, #60A5FA 0%, #3B82F6 40%, #1E40AF 100%)',
            boxShadow: '0 25px 60px rgba(59, 130, 246, 0.5), inset -20px -20px 60px rgba(0, 0, 0, 0.3), inset 20px 20px 60px rgba(255, 255, 255, 0.15)'
          }}
        >
          {/* Planet surface texture */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-[20%] left-[10%] w-16 h-16 rounded-full bg-white/30 blur-xl"></div>
            <div className="absolute top-[60%] right-[15%] w-24 h-24 rounded-full bg-white/20 blur-2xl"></div>
            <div className="absolute bottom-[30%] left-[40%] w-20 h-20 rounded-full bg-black/20 blur-xl"></div>
          </div>

          <div className="relative z-10 flex flex-col items-center justify-center h-full">
            <div className="text-center mb-4">
              <div className="w-20 h-20 mx-auto rounded-full overflow-hidden border-4 border-white shadow-2xl mb-3">
                {user.profile_photo ? (
                  <img src={user.profile_photo} alt={user.full_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-white/20 flex items-center justify-center">
                    <UserIcon className="w-10 h-10 text-white" />
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{user.full_name}</h3>
              <p className="text-sm text-white/80 font-medium">My Planet</p>
            </div>

            <div className="grid grid-cols-3 gap-2 max-w-[200px] mb-4">
              {categories.slice(0, 6).map(category => {
                const catInterests = getCategoryInterests(category.id);
                const firstInterest = catInterests[0];
                return firstInterest ? (
                  <div key={category.id} className="aspect-square rounded-full overflow-hidden border-2 border-white/40 shadow-lg">
                    <img src={firstInterest.photo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : null;
              }).filter(Boolean)}
            </div>

            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xl px-3 py-1.5 rounded-full">
                <span className="text-white font-bold text-xs">MindCircle</span>
              </div>
            </div>
          </div>

          {/* Planet shine effect */}
          <div 
            className="absolute inset-0 pointer-events-none" 
            style={{
              background: 'radial-gradient(circle at 25% 25%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)'
            }}
          ></div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={handleNativeShare}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
          >
            {generating ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <>
                <Share2 className="w-5 h-5" />
                Share Planet Image
              </>
            )}
          </button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">Or share link</span>
            </div>
          </div>

          <SocialShareButtons 
            text={shareText}
            url={shareUrl}
          />
        </div>
      </motion.div>
    </motion.div>
  );
}
