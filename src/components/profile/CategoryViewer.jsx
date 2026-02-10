import React from "react";
import { motion } from "framer-motion";
import { X, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export default function CategoryViewer({ category, interests, onClose }) {
  const isMobile = useIsMobile();

  const getPositionForIndex = (index, total) => {
    const angle = index * 360 / total;
    const radius = isMobile ? 40 : 42;
    const x = 50 + radius * Math.cos((angle - 90) * Math.PI / 180);
    const y = 50 + radius * Math.sin((angle - 90) * Math.PI / 180);
    return { x, y };
  };

  const maxSurrounding = 8;
  const positionedInterests = Array(9).fill(null);
  interests.forEach((interest) => {
    const pos = interest.position ?? 0;
    if (pos >= 0 && pos < 9) {
      positionedInterests[pos] = interest;
    }
  });

  const centerPhoto = positionedInterests[0];
  const surroundingPhotos = positionedInterests.slice(1, 9);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mind Map View */}
        <div className="overflow-visible rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
          <div className="relative w-full aspect-square max-w-none md:max-w-3xl mx-auto overflow-visible pb-24">
            {/* Background lines */}
            <div className="absolute inset-0 pointer-events-none">
              <svg width="100%" height="100%" className="absolute inset-0">
                {Array.from({ length: maxSurrounding }).map((_, index) => {
                  const { x, y } = getPositionForIndex(index, maxSurrounding);
                  return (
                    <motion.line
                      key={`line-${index}`}
                      x1="50%" y1="50%"
                      x2={`${x}%`} y2={`${y}%`}
                      stroke={category.color}
                      strokeWidth="3"
                      strokeOpacity="0.3"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.3 + 0.05 * index, duration: 0.8 }}
                    />
                  );
                })}
              </svg>
              {Array.from({ length: 3 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: `${30 + i * 25}%`,
                    height: `${30 + i * 25}%`,
                    left: '50%', top: '50%',
                    transform: 'translate(-50%, -50%)',
                    border: `2px solid ${category.color}`,
                    opacity: 0.2
                  }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }}
                />
              ))}
            </div>

            {/* Center Photo */}
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="relative">
                {centerPhoto ? (
                  <div
                    className={`${isMobile ? "w-40 h-40" : "w-32 h-32 md:w-40 md:h-40"} rounded-full border-4 border-white shadow-2xl overflow-hidden`}
                    style={{ boxShadow: `0 30px 60px rgba(0,0,0,0.3), 0 15px 30px ${category.color}60` }}
                  >
                    <img src={centerPhoto.photo_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div
                    className={`${isMobile ? "w-40 h-40" : "w-32 h-32 md:w-40 md:h-40"} rounded-full border-4 border-dashed flex items-center justify-center`}
                    style={{ borderColor: category.color, backgroundColor: `${category.color}15` }}
                  >
                    <span className="text-4xl">{category.icon}</span>
                  </div>
                )}
                <div className={`absolute ${isMobile ? "-bottom-12" : "-bottom-16"} left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-md rounded-xl ${isMobile ? "px-3 py-2" : "px-5 py-2.5"} shadow-2xl border border-gray-100 z-[90]`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{category.icon}</span>
                    <h3 className={`${isMobile ? "text-sm" : ""} font-bold text-gray-900 leading-tight`}>{category.label}</h3>
                  </div>
                </div>
              </div>
            </div>

            {/* Surrounding Photos */}
            {Array.from({ length: maxSurrounding }).map((_, slotIndex) => {
              const { x, y } = getPositionForIndex(slotIndex, maxSurrounding);
              const photo = surroundingPhotos[slotIndex];

              return (
                <motion.div
                  key={`s-${slotIndex}`}
                  className="absolute z-40"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.5 + 0.08 * slotIndex, type: "spring" }}
                >
                  <div className="relative -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                    {photo ? (
                      <>
                        <div
                          className={`${isMobile ? "w-16 h-16" : "w-20 h-20 md:w-24 md:h-24"} rounded-full border-4 border-white shadow-xl overflow-hidden`}
                          style={{ boxShadow: `0 15px 35px rgba(0,0,0,0.25), 0 8px 15px ${category.color}30` }}
                        >
                          <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                        </div>
                        {(photo.description || photo.title) && (
                          <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`${isMobile ? "w-20 mt-1 px-1.5 py-0.5" : "w-28 mt-2 px-2 py-1"} bg-gray-800/95 backdrop-blur-sm rounded-lg text-white shadow-xl text-center`}
                          >
                            {photo.title && <p className="text-[10px] font-bold text-purple-200 mb-0.5 uppercase tracking-wider">{photo.title}</p>}
                            {photo.description && <p className="text-[10px] line-clamp-2 break-words leading-tight">{photo.description}</p>}
                          </motion.div>
                        )}
                      </>
                    ) : (
                      <div
                        className={`${isMobile ? "w-16 h-16" : "w-20 h-20 md:w-24 md:h-24"} rounded-full border-2 border-dashed flex items-center justify-center opacity-30`}
                        style={{ borderColor: category.color }}
                      >
                        <span className="text-xs text-gray-400">Empty</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Info */}
        <div className="text-center mt-8 text-sm text-gray-600">
          <p className="font-medium">{interests.length} photos in {category.label}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
