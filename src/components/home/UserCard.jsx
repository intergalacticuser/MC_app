import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import { User, Image } from "lucide-react";
import { normalizeCategoryId } from "@/components/utils/matchingUtils";

export default function UserCard({ user, interests, index, matchPercentage }) {
  const hobbiesOnly = interests.filter((interest) => normalizeCategoryId(interest.category) === "hobbies_activities");
  const hobbyLabels = Array.from(
    new Set(
      hobbiesOnly
        .map((interest) => String(interest.title || interest.category || "").trim())
        .filter(Boolean)
    )
  );
  const previewLabels = hobbyLabels.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Link to={`${createPageUrl("UserProfile")}?userId=${user.id}`}>
        <div className="group bg-white rounded-3xl p-6 hover:shadow-2xl transition-all duration-300 border border-gray-100 cursor-pointer">
          {/* Profile Photo */}
           <div className="relative mb-4">
             <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300">
               {user.profile_photo ? (
                 <img
                   src={user.profile_photo}
                   alt={user.full_name}
                   className="w-full h-full object-cover"
                 />
               ) : (
                 <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                   <User className="w-12 h-12 text-white" />
                 </div>
               )}
             </div>
             {matchPercentage !== undefined && (
               <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                 <span className="text-white font-bold text-xs">{matchPercentage}%</span>
               </div>
             )}
           </div>

          {/* User Info */}
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-900 mb-1">{user.full_name}</h3>
            {user.bio && (
              <p className="text-sm text-gray-600 line-clamp-2">{user.bio}</p>
            )}
          </div>

          {/* Interest Preview */}
          {previewLabels.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-center gap-2 flex-wrap">
                {previewLabels.map((label, idx) => (
                  <div
                    key={`${label}-${idx}`}
                    className="px-3 py-1.5 rounded-full border border-purple-100 bg-purple-50 text-purple-700 text-xs font-semibold"
                  >
                    {label}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2 text-xs">
                <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium">
                  {previewLabels.length} {previewLabels.length === 1 ? 'preview' : 'previews'}
                </span>
                <span className="px-3 py-1 bg-pink-50 text-pink-700 rounded-full font-medium">
                  {hobbyLabels.length} {hobbyLabels.length === 1 ? 'hobby' : 'hobbies'}
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400">
              <Image className="w-8 h-8 mx-auto mb-2" />
              <p className="text-xs">No interests yet</p>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
