import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Camera, Plus, ZoomIn, ZoomOut, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

const haptics = {
  light: () => navigator.vibrate && navigator.vibrate(10)
};

const THEME_VISUALS = {
  default: {
    planetGradient: "radial-gradient(circle at 35% 35%, #6366f1 0%, #4c1d95 40%, #0f172a 100%)",
    planetGlow: "rgba(99, 102, 241, 0.15)"
  },
  nebula: {
    planetGradient: "radial-gradient(circle at 35% 35%, #f093fb 0%, #f5576c 45%, #3b1d4f 100%)",
    planetGlow: "rgba(240, 147, 251, 0.22)"
  },
  cyberpunk: {
    planetGradient: "radial-gradient(circle at 35% 35%, #fa709a 0%, #fee140 45%, #3f1a4d 100%)",
    planetGlow: "rgba(250, 112, 154, 0.2)"
  },
  zen: {
    planetGradient: "radial-gradient(circle at 35% 35%, #89f7fe 0%, #66a6ff 45%, #1d315d 100%)",
    planetGlow: "rgba(102, 166, 255, 0.2)"
  },
  sunset: {
    planetGradient: "radial-gradient(circle at 35% 35%, #ffecd2 0%, #fcb69f 45%, #7f3d2e 100%)",
    planetGlow: "rgba(252, 182, 159, 0.22)"
  },
  aurora: {
    planetGradient: "radial-gradient(circle at 35% 35%, #a8edea 0%, #fed6e3 45%, #415063 100%)",
    planetGlow: "rgba(168, 237, 234, 0.22)"
  }
};

const isImageBackground = (value = "") =>
  typeof value === "string" && /^(https?:\/\/|data:image\/|blob:)/i.test(value);

export default function MindMapView({
  user,
  interests,
  categories,
  readonly = false,
  onCategoryClick,
  onPhotoUpload,
  uploadingPhoto,
  categoryRefs
}) {
  const [zoom, setZoom] = useState(1);
  const isMobile = useIsMobile();
  const mapRadius = isMobile ? 41 : 38;
  const centerCircleSizeClass = isMobile ? "w-48 h-48" : "w-32 h-32 md:w-40 md:h-40";
  const categoryCircleSizeClass = isMobile ? "w-16 h-16" : "w-24 h-24 md:w-28 md:h-28";

  const getCategoryInterests = (categoryId) => {
    return interests.filter(i => i.category === categoryId);
  };

  const getPositionForIndex = (index, total) => {
    // Distribute 8 items in a circle
    // 0 is top (angle -90)
    // index 0 -> angle -90
    // total usually 8
    const angle = (index * 360) / total - 90;
    const radius = mapRadius; // percentage
    const x = 50 + radius * Math.cos(angle * Math.PI / 180);
    const y = 50 + radius * Math.sin(angle * Math.PI / 180);
    return { x, y };
  };

  const activeThemeId = user?.is_premium ? (user?.premium_theme || "default") : "default";
  const activeTheme = THEME_VISUALS[activeThemeId] || THEME_VISUALS.default;
  const hasCustomBackground = Boolean(user?.background_url);
  const customBackgroundIsImage = isImageBackground(user?.background_url || "");
  const customBackgroundIsGradientPreset = hasCustomBackground && !customBackgroundIsImage;

  const backgroundStyle = customBackgroundIsImage
    ? { backgroundImage: `url(${user.background_url})`, backgroundSize: "cover", backgroundPosition: "center" }
    : {};

  const backgroundClass = customBackgroundIsGradientPreset ? `bg-gradient-to-br ${user.background_url}` : "";

  // Planet style if no background image
  const planetStyle = !hasCustomBackground
    ? {
        background: activeTheme.planetGradient,
        boxShadow: `inset -30px -30px 80px rgba(0,0,0,0.8), inset 10px 10px 40px rgba(255,255,255,0.15), 0 0 80px ${activeTheme.planetGlow}`
      }
    : {};

  return (
    <div className="relative">
      {/* Zoom Controls */}
      {!readonly && (
        <div className="absolute top-4 right-4 z-50 flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setZoom(Math.min(zoom + 0.2, 2))}
                  className="w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 select-none"
                >
                  <ZoomIn className="w-5 h-5 text-purple-600 dark:text-purple-400 select-none" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom In</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setZoom(Math.max(zoom - 0.2, 0.6))}
                  className="w-10 h-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transition-all hover:scale-110 select-none"
                >
                  <ZoomOut className="w-5 h-5 text-purple-600 dark:text-purple-400 select-none" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Zoom Out</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      <div className="rounded-full p-1" style={{ boxShadow: `0 0 100px ${activeTheme.planetGlow}` }}>
        <motion.div
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`relative w-full aspect-square max-w-none md:max-w-4xl mx-auto rounded-full overflow-visible ${backgroundClass}`}
          style={{ 
            perspective: '2000px', 
            transformOrigin: 'center center',
            ...backgroundStyle,
            ...planetStyle
          }}
        >
          {/* Planet Atmospheric Glow */}
          {!hasCustomBackground && (
            <div className="absolute inset-0 rounded-full pointer-events-none opacity-50 mix-blend-overlay bg-gradient-to-tr from-white/10 to-transparent"></div>
          )}

          {/* Decorative Background & Connecting Lines */}
          <div className="absolute inset-0 pointer-events-none">
            <svg width="100%" height="100%" className="absolute inset-0">
              {categories.map((_, index) => {
                const { x, y } = getPositionForIndex(index, categories.length);
                return (
                  <motion.line
                    key={`line-${index}`}
                    x1="50%"
                    y1="50%"
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke="rgba(255, 255, 255, 0.2)"
                    strokeWidth="2"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.1 * index, duration: 0.8, ease: "easeInOut" }}
                  />
                );
              })}
            </svg>

            {/* Orbit lines */}
            {Array.from({ length: 3 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/10"
                style={{
                  width: `${30 + i * 25}%`,
                  height: `${30 + i * 25}%`,
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)'
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 40 + i * 15, repeat: Infinity, ease: "linear" }}
              />
            ))}
          </div>

          {/* Center Profile - ENHANCED 3D */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <motion.div
              style={{ transformStyle: "preserve-3d" }}
              initial={{ scale: 0, rotateY: -180 }}
              animate={{ scale: 1, rotateY: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20, duration: 1 }}
              whileHover={{
                scale: 1.1,
                rotateY: 15,
                rotateX: 5,
                transition: { duration: 0.4, type: "spring", stiffness: 300 }
              }}
              whileTap={{ scale: 0.95 }}
              className="pointer-events-auto"
            >
              <div className="relative group" style={{ transformStyle: "preserve-3d" }}>
                {/* Multiple Glow Layers for 3D depth */}
                <motion.div
                  className="absolute inset-0 rounded-full bg-white opacity-20 blur-2xl pointer-events-none"
                  style={{ width: '180px', height: '180px', left: '50%', top: '50%', transform: 'translate(-50%, -50%) translateZ(-30px)' }}
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                />

                {/* Main circle with enhanced 3D effect */}
                <motion.div
                  className={`relative rounded-full overflow-hidden border-4 border-white/50 bg-gradient-to-br from-purple-400 to-pink-400 ${centerCircleSizeClass} backdrop-blur-sm`}
                  style={{
                    boxShadow: `
                      0 20px 50px rgba(0,0,0,0.3),
                      inset 0 2px 10px rgba(255,255,255,0.5),
                      inset 0 -10px 20px rgba(0,0,0,0.2)
                    `,
                    transformStyle: "preserve-3d"
                  }}
                  whileHover={{
                    boxShadow: `
                      0 30px 60px rgba(0,0,0,0.4),
                      inset 0 2px 10px rgba(255,255,255,0.6),
                      inset 0 -10px 20px rgba(0,0,0,0.3)
                    `
                  }}
                >
                  {user?.profile_photo ? (
                    <img
                      src={user.profile_photo}
                      alt={user.full_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-16 h-16 md:w-20 md:h-20 text-white drop-shadow-lg" />
                    </div>
                  )}
                  {/* Inner shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none" />
                </motion.div>

                {!readonly && (
                  <>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onPhotoUpload}
                      className="hidden"
                      id="profile-photo-upload"
                    />
                    <motion.label
                      htmlFor="profile-photo-upload"
                      className="absolute bottom-0 right-0 w-11 h-11 bg-white rounded-full flex items-center justify-center shadow-2xl cursor-pointer border-2 border-purple-200 z-10"
                      whileHover={{
                        scale: 1.2,
                        rotate: 10,
                        boxShadow: "0 10px 20px rgba(0,0,0,0.2)"
                      }}
                      whileTap={{ scale: 0.9, rotate: -10 }}
                    >
                      {uploadingPhoto ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                      ) : (
                        <Camera className="w-5 h-5 text-purple-600" />
                      )}
                    </motion.label>
                  </>
                )}

                {/* Name tag + Quote - stacked below photo */}
                <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2" style={{ top: '100%', marginTop: isMobile ? "8px" : "12px" }}>
                  <motion.div
                    className={`whitespace-nowrap bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl ${isMobile ? "px-3 py-2" : "px-5 py-2.5"} shadow-2xl border border-white/50`}
                    style={{ transformStyle: "preserve-3d" }}
                  >
                    <div className="flex items-center gap-2">
                      <h3 className={`${isMobile ? "text-sm" : ""} font-bold text-gray-900 dark:text-white`}>{user?.full_name}</h3>
                      {user?.mood && (
                        <span className={isMobile ? "text-lg" : "text-xl"}>{user.mood}</span>
                      )}
                    </div>
                  </motion.div>
                  
                  {user?.quote && !isMobile && (
                    <motion.div
                      className="max-w-xs bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-2xl px-4 py-2 shadow-xl border border-white/50"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                    >
                      <p className="text-sm text-gray-700 dark:text-gray-200 italic text-center">
                        "{user.quote}"
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Category Circles - ENHANCED 3D */}
          {categories.map((category, index) => {
            const { x, y } = getPositionForIndex(index, categories.length);
            const isPlaceholder = category.isPlaceholder;
            
            // If placeholder, we don't have ID yet
            const categoryInterests = !isPlaceholder ? getCategoryInterests(category.id) : [];
            const hasInterests = categoryInterests.length > 0;
            const centerInterest = categoryInterests.find(i => i.position === 0);
            const firstInterest = centerInterest || categoryInterests[0];
            const isLocked = category.price && (!user?.unlocked_categories || !user.unlocked_categories.includes(category.id));

            return (
              <TooltipProvider key={category.id || `slot-${index}`}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div
                      ref={el => {
                        if (categoryRefs && categoryRefs.current && category.id) {
                          categoryRefs.current[category.id] = el;
                        }
                      }}
                      className="absolute z-30"
                      style={{
                        left: `${x}%`,
                        top: `${y}%`,
                        transformStyle: "preserve-3d"
                      }}
                      initial={{ scale: 0, opacity: 0, rotateY: -180 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      transition={{
                        delay: 0.15 * index,
                        type: "spring",
                        stiffness: 200,
                        damping: 15
                      }}
                      whileHover={{
                        scale: 1.2,
                        z: 50,
                        rotateY: 15,
                        rotateX: 10,
                        transition: { duration: 0.3, type: "spring", stiffness: 400 }
                      }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <div className="relative -translate-x-1/2 -translate-y-1/2" style={{ transformStyle: "preserve-3d" }}>
                        {/* Multi-layer glow for depth */}
                        {!isPlaceholder && (
                          <motion.div
                            className="absolute inset-0 rounded-full blur-xl opacity-0 pointer-events-none"
                            style={{
                              backgroundColor: category.color,
                              transform: 'scale(1.5) translateZ(-20px)'
                            }}
                            whileHover={{ opacity: 0.6 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}

                        <motion.button
                          onClick={() => {
                            if (onCategoryClick) {
                              haptics.light();
                              onCategoryClick(category, index);
                            }
                          }}
                          disabled={readonly && isPlaceholder && !hasInterests}
                          className={`relative ${categoryCircleSizeClass} rounded-full border-4 border-white/80 transition-all duration-300 overflow-hidden ${
                            readonly && isPlaceholder ? 'cursor-default opacity-50' : 'cursor-pointer'
                          }`}
                          style={{
                            backgroundColor: hasInterests || category.photo_url ? (category.color || '#ccc') : 'rgba(255,255,255,0.2)',
                            backdropFilter: 'blur(10px)',
                            borderColor: isPlaceholder ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.8)',
                            borderStyle: isPlaceholder ? 'dashed' : 'solid',
                            boxShadow: `
                              0 15px 35px rgba(0,0,0,0.25),
                              inset 0 2px 8px rgba(255,255,255,0.5),
                              inset 0 -2px 8px rgba(0,0,0,0.2)
                            `,
                            transformStyle: "preserve-3d"
                          }}
                        >
                          {isLocked ? (
                            <div className="w-full h-full flex items-center justify-center bg-gray-900/20 backdrop-blur-md">
                              <Lock className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-white drop-shadow-lg`} />
                            </div>
                          ) : (category.photo_url || hasInterests) ? (
                            <div className="w-full h-full rounded-full overflow-hidden">
                              <img
                                src={category.photo_url || firstInterest?.photo_url}
                                alt={category.label}
                                className="w-full h-full object-cover"
                              />
                              {/* Shine overlay */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                            </div>
                          ) : !readonly ? (
                            <motion.div
                              whileHover={{ rotate: 90 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Plus className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-white mx-auto drop-shadow-md`} />
                            </motion.div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/60 text-xs">
                              Empty
                            </div>
                          )}
                        </motion.button>

                        {/* Category Label */}
                        {!isPlaceholder && (
                          <motion.div
                            className={`absolute ${isMobile ? "-bottom-7" : "-bottom-8"} left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-[90]`}
                            whileHover={{ y: -2 }}
                          >
                            <span
                              className={`${isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-sm"} bg-white/90 backdrop-blur-sm rounded-full font-bold shadow-lg border border-white/50 block`}
                              style={{
                                color: category.color,
                              }}
                            >
                              {category.label}
                            </span>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="bg-gray-900/95 text-white border-gray-700">
                    <div className="text-center">
                      {isPlaceholder ? (
                         <p className="text-sm">Tap to add</p>
                      ) : (
                        <>
                          <div className="text-lg mb-1">{category.icon}</div>
                          <p className="font-semibold">{category.label}</p>
                          {hasInterests ? (
                            <p className="text-xs text-gray-300 mt-1">{categoryInterests.length} фото</p>
                          ) : (
                            <p className="text-xs text-gray-400 mt-1">Нажмите для просмотра</p>
                          )}
                        </>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
