import React, { useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { User, Camera, Plus, ZoomIn, ZoomOut, Lock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import CategoryEditor from "@/components/profile/CategoryEditorV3";
import { SUBCATEGORIES_BY_DOMAIN } from "@/components/utils/matchingUtils";
import SubcategoryCoverWizard from "@/components/profile/SubcategoryCoverWizard";

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
  categoryRefs,
  enableDrilldown = false,
  onInterestsChanged
}) {
  const [zoom, setZoom] = useState(1);
  const isMobile = useIsMobile();
  const mapRadius = isMobile ? 41 : 38;
  const centerCircleSizeClass = isMobile ? "w-48 h-48" : "w-32 h-32 md:w-40 md:h-40";
  const categoryCircleSizeClass = isMobile ? "w-16 h-16" : "w-24 h-24 md:w-28 md:h-28";
  const [drillPath, setDrillPath] = useState([]); // [] | [{category}] | [{category},{subcat}]
  const [showAddWizard, setShowAddWizard] = useState(false);
  const [lastCreatedId, setLastCreatedId] = useState("");
  const [coverWizardSubcat, setCoverWizardSubcat] = useState("");
  const planetRef = React.useRef(null);

  const flySpring = React.useMemo(() => ({ type: "spring", stiffness: 170, damping: 20, mass: 0.9 }), []);
  const fadeIn = React.useMemo(() => ({ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }), []);

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

  const getPositionForAngle = (angleDeg, radiusPct = mapRadius) => {
    const x = 50 + radiusPct * Math.cos(angleDeg * Math.PI / 180);
    const y = 50 + radiusPct * Math.sin(angleDeg * Math.PI / 180);
    return { x, y };
  };

  const getSortKey = (interest) => {
    const v = Number(interest?.sort_index);
    if (Number.isFinite(v)) return v;
    const ts = Date.parse(String(interest?.created_date || ""));
    if (Number.isFinite(ts)) return ts;
    return 0;
  };

  const activeCategory = drillPath?.[0]?.category || null;
  const activeSubcat = drillPath?.[1]?.subcat || "";
  const atRoot = !enableDrilldown || drillPath.length === 0;
  const atSubcats = enableDrilldown && drillPath.length === 1;
  const atConcepts = enableDrilldown && drillPath.length === 2;

  const goBack = () => {
    setShowAddWizard(false);
    setDrillPath((prev) => (Array.isArray(prev) ? prev.slice(0, -1) : []));
  };

  const openCategory = (category, index) => {
    if (!category || !category.id) return;
    try { haptics.light(); } catch {}
    if (typeof onCategoryClick === "function") onCategoryClick(category, index);
    if (!enableDrilldown) return;
    setDrillPath([{ category }]);
  };

  const openSubcat = (subcatLabel) => {
    const label = String(subcatLabel || "").trim();
    if (!label || !activeCategory?.id) return;
    setDrillPath([{ category: activeCategory }, { subcat: label }]);
  };

  const getCoverForSubcat = (subcatLabel) => {
    const label = String(subcatLabel || "").trim();
    if (!activeCategory?.id || !label) return null;
    return (interests || [])
      .filter((i) => String(i?.category || "") === String(activeCategory.id))
      .filter((i) => String(i?.subcategory || "") === label)
      .find((i) => i?.is_subcategory_cover === true) || null;
  };

  const conceptsForActive = () => {
    if (!activeCategory?.id || !activeSubcat) return [];
    return (interests || [])
      .filter((i) => String(i?.category || "") === String(activeCategory.id))
      .filter((i) => String(i?.subcategory || "") === String(activeSubcat))
      .filter((i) => i?.is_subcategory_cover !== true)
      .sort((a, b) => getSortKey(a) - getSortKey(b));
  };

  const getFirstPhotoForSubcat = (subcatLabel) => {
    if (!activeCategory?.id) return "";
    const label = String(subcatLabel || "").trim();
    if (!label) return "";
    const cover = getCoverForSubcat(label);
    if (cover?.photo_url) return cover.photo_url;
    const rows = (interests || [])
      .filter((i) => String(i?.category || "") === String(activeCategory.id))
      .filter((i) => String(i?.subcategory || "") === label)
      .filter((i) => i?.is_subcategory_cover !== true)
      .sort((a, b) => getSortKey(a) - getSortKey(b));
    return rows?.[0]?.photo_url || "";
  };

  const getSlotPositions = (count) => {
    // Reserve a "plus" node at 13:00 (angle -60). Items fill clockwise, then inner ring.
    const ring1Angles = [-90, -120, -150, -180, -210, -240, 0, 30, 60, 90, 120, 150, 180, 210, 240];
    const ring2Angles = [-110, -140, -170, -200, -230, -260, 10, 40, 70, 100, 130, 160, 190, 220, 250];
    const ring1 = ring1Angles.map((a) => ({ ...getPositionForAngle(a, mapRadius), key: `r1:${a}` }));
    const ring2 = ring2Angles.map((a) => ({ ...getPositionForAngle(a, Math.max(18, mapRadius - 14)), key: `r2:${a}` }));
    const all = [...ring1, ...ring2];
    return all.slice(0, Math.max(0, count));
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

  const subcats = activeCategory?.id ? (SUBCATEGORIES_BY_DOMAIN?.[activeCategory.id] || []) : [];
  const conceptItems = atConcepts ? conceptsForActive() : [];
  const slotPositions = atConcepts ? getSlotPositions(conceptItems.length) : [];

  return (
    <div
      className="relative"
      onClick={(e) => {
        if (!enableDrilldown) return;
        if (drillPath.length === 0) return;
        if (showAddWizard) return;
        if (coverWizardSubcat) return;
        // Don't treat clicks on UI controls as "empty space".
        if (e.target?.closest?.('[data-mindmap-block-back="1"]')) return;

        const rect = planetRef.current?.getBoundingClientRect?.();
        if (!rect) return;
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = (e.clientX ?? 0) - cx;
        const dy = (e.clientY ?? 0) - cy;
        const r = Math.min(rect.width, rect.height) / 2;
        // Click is outside the circle (planet) => go back.
        if (dx * dx + dy * dy > r * r) {
          goBack();
        }
      }}
    >
      {/* Zoom Controls */}
      {!readonly && (
        <div className="absolute top-4 right-4 z-50 flex gap-2" data-mindmap-block-back="1">
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

      {/* Keep only the planet + background; remove the extra silhouette/underlay layer behind the circle. */}
      <div className="relative isolate rounded-full p-1" style={{ boxShadow: `0 0 100px ${activeTheme.planetGlow}` }}>
        <LayoutGroup id="mindmap">
        <motion.div
          ref={planetRef}
          animate={{ scale: zoom }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`relative z-10 w-full aspect-square max-w-none md:max-w-4xl mx-auto rounded-full overflow-visible ${backgroundClass}`}
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
              {(atRoot ? categories : atSubcats ? subcats : atConcepts ? conceptItems : []).map((_, index, arr) => {
                const total = Array.isArray(arr) ? arr.length : 0;
                let pos = null;
                if (atRoot) pos = getPositionForIndex(index, total);
                if (atSubcats) pos = getPositionForIndex(index, total);
                if (atConcepts) pos = slotPositions[index] || getPositionForIndex(index, Math.max(1, total));
                const { x, y } = pos || { x: 50, y: 50 };
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

              {/* Plus node line at 13:00 */}
              {atConcepts && !readonly && !lastCreatedId && (
                (() => {
                  const { x, y } = getPositionForAngle(-60, mapRadius);
                  return (
                    <motion.line
                      key="line-plus"
                      x1="50%"
                      y1="50%"
                      x2={`${x}%`}
                      y2={`${y}%`}
                      stroke="rgba(255, 255, 255, 0.2)"
                      strokeWidth="2"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ delay: 0.05, duration: 0.6, ease: "easeInOut" }}
                    />
                  );
                })()
              )}
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

          {/* Center Node (profile OR selected circle morphs here) */}
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
            <AnimatePresence initial={false} mode="wait">
              {atRoot ? (
                <motion.div
                  key="center-profile"
                  layoutId="planet-center:user"
                  style={{ transformStyle: "preserve-3d" }}
                  initial={{ scale: 0, rotateY: -180 }}
                  animate={{ scale: 1, rotateY: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
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
              ) : (
                <motion.div
                  key="center-selected"
                  layoutId={
                    atSubcats
                      ? `planet-node:cat:${activeCategory?.id}`
                      : `planet-node:sub:${activeCategory?.id}:${activeSubcat}`
                  }
                  style={{ transformStyle: "preserve-3d" }}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={flySpring}
                  className="pointer-events-auto"
                >
                  <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <motion.div
                      className={`relative rounded-full overflow-hidden border-4 border-white/80 ${centerCircleSizeClass} backdrop-blur-sm`}
                      style={{
                        backgroundColor: activeCategory?.color || "rgba(255,255,255,0.2)",
                        boxShadow: `
                          0 20px 55px rgba(0,0,0,0.35),
                          inset 0 2px 10px rgba(255,255,255,0.55),
                          inset 0 -10px 20px rgba(0,0,0,0.25)
                        `
                      }}
                    >
                      {(() => {
                        if (atSubcats) {
                          const catInterests = getCategoryInterests(activeCategory?.id);
                          const firstInterest = catInterests?.find((i) => i?.position === 0) || catInterests?.[0];
                          const img = activeCategory?.photo_url || firstInterest?.photo_url;
                          if (img) return <img src={img} alt={activeCategory?.label} className="w-full h-full object-cover" />;
                          return (
                            <div className="w-full h-full flex items-center justify-center text-white/90 font-extrabold text-sm">
                              {activeCategory?.icon || "🪐"}
                            </div>
                          );
                        }
                        const img = getFirstPhotoForSubcat(activeSubcat);
                        if (img) return <img src={img} alt={activeSubcat} className="w-full h-full object-cover" />;
                        return (
                          <div className="w-full h-full flex items-center justify-center text-white/90 font-extrabold text-sm px-4 text-center">
                            {activeSubcat}
                          </div>
                        );
                      })()}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                    </motion.div>

                    {/* Center caption */}
                    <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none flex flex-col items-center gap-2" style={{ top: "100%", marginTop: isMobile ? "10px" : "14px" }}>
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={fadeIn}
                        className={`whitespace-nowrap bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-xl ${isMobile ? "px-3 py-2" : "px-5 py-2.5"} shadow-2xl border border-white/50`}
                      >
                        <div className={`${isMobile ? "text-sm" : ""} font-bold text-gray-900 dark:text-white`}>
                          {atSubcats ? (activeCategory?.label || "") : (activeSubcat || "")}
                        </div>
                        {!atSubcats && activeCategory?.label && (
                          <div className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 text-center mt-0.5">
                            {activeCategory.label}
                          </div>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Orbit Nodes (root categories OR subcats OR concepts) */}
          <AnimatePresence initial={false}>
          {atRoot && categories.map((category, index) => {
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
                      layoutId={!isPlaceholder && category.id ? `planet-node:cat:${category.id}` : undefined}
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
                      // On first entry to My Planet, don't "slide into place".
                      // Pop-in from a tiny point at the final position feels cleaner.
                      initial={{ scale: 0.12, opacity: 0, filter: "blur(6px)" }}
                      animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                      transition={{
                        ...flySpring,
                        delay: Math.min(0.09 * index, 0.6)
                      }}
                      whileHover={{
                        scale: 1.2,
                        z: 50,
                        rotateY: 15,
                        rotateX: 10,
                        transition: { duration: 0.3, type: "spring", stiffness: 400 }
                      }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => e.stopPropagation()}
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
                          onClick={(e) => {
                            e.stopPropagation();
                            openCategory(category, index);
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
          </AnimatePresence>

          {/* Subcategory nodes */}
          <AnimatePresence initial={false}>
          {atSubcats && subcats.map((label, index) => {
            const { x, y } = getPositionForIndex(index, subcats.length);
            const cover = getCoverForSubcat(label);
            const photo = cover?.photo_url || "";
            const count = (interests || [])
              .filter((i) => String(i?.category || "") === String(activeCategory?.id || ""))
              .filter((i) => String(i?.subcategory || "") === String(label)).length;
            return (
              <motion.div
                key={label}
                layoutId={`planet-node:sub:${activeCategory?.id}:${label}`}
                className="absolute z-30"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  transformStyle: "preserve-3d"
                }}
                initial={{ scale: 0.12, opacity: 0, filter: "blur(6px)" }}
                animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ ...flySpring, delay: Math.min(0.08 * index, 0.55) }}
                whileHover={{ scale: 1.15, rotateY: 10, rotateX: 8 }}
                whileTap={{ scale: 0.92 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="relative -translate-x-1/2 -translate-y-1/2">
                  <div className="relative">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (photo) openSubcat(label);
                        else setCoverWizardSubcat(label);
                      }}
                      className={`relative ${categoryCircleSizeClass} rounded-full border-4 border-white/80 transition-all duration-300 overflow-hidden cursor-pointer`}
                      style={{
                        backgroundColor: activeCategory?.color || "rgba(255,255,255,0.2)",
                        backdropFilter: "blur(10px)",
                        boxShadow: `
                          0 15px 35px rgba(0,0,0,0.25),
                          inset 0 2px 8px rgba(255,255,255,0.5),
                          inset 0 -2px 8px rgba(0,0,0,0.2)
                        `
                      }}
                    >
                      {photo ? (
                        <div className="w-full h-full rounded-full overflow-hidden">
                          <img src={photo} alt={label} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Plus className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-white mx-auto drop-shadow-md`} />
                        </div>
                      )}
                    </motion.button>

                    {!readonly && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCoverWizardSubcat(label);
                        }}
                        className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border border-white/60 shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
                        aria-label="Edit photo"
                        title="Edit photo"
                      >
                        <Camera className="w-5 h-5 text-purple-600 dark:text-purple-300" />
                      </button>
                    )}
                  </div>

                  <motion.div className={`absolute ${isMobile ? "-bottom-7" : "-bottom-8"} left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-[90]`}>
                    <span className={`${isMobile ? "px-2 py-1 text-[10px]" : "px-3 py-1.5 text-sm"} bg-white/90 backdrop-blur-sm rounded-full font-bold shadow-lg border border-white/50 block`} style={{ color: activeCategory?.color || "#7c3aed" }}>
                      {label} {count ? `(${count})` : ""}
                    </span>
                  </motion.div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>

          {/* Concept nodes + plus node */}
          <AnimatePresence initial={false}>
          {atConcepts && (
            <>
              {conceptItems.map((item, index) => {
                const slot = slotPositions[index] || getPositionForIndex(index, Math.max(1, conceptItems.length));
                const shouldFromPlus = String(item?.id || "") && String(item?.id || "") === String(lastCreatedId || "");
                const plusPos = getPositionForAngle(-60, mapRadius);
                const title = String(item?.title || "").trim();
                const desc = String(item?.description || "").trim();
                return (
                  <motion.div
                    key={item.id}
                    className="absolute z-30"
                    style={{ transformStyle: "preserve-3d" }}
                    initial={shouldFromPlus ? { left: `${plusPos.x}%`, top: `${plusPos.y}%`, opacity: 0.6, scale: 0.95 } : { left: `${slot.x}%`, top: `${slot.y}%`, opacity: 0, scale: 0.9 }}
                    animate={{ left: `${slot.x}%`, top: `${slot.y}%`, opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ ...flySpring, delay: shouldFromPlus ? 0 : Math.min(0.06 * index, 0.45) }}
                    onAnimationComplete={() => {
                      if (shouldFromPlus) setLastCreatedId("");
                    }}
                  >
                    <div className="relative -translate-x-1/2 -translate-y-1/2">
                      <motion.button
                        type="button"
                        className={`relative ${categoryCircleSizeClass} rounded-full border-4 border-white/80 transition-all duration-300 overflow-hidden cursor-default`}
                        style={{
                          backgroundColor: activeCategory?.color || "rgba(255,255,255,0.2)",
                          backdropFilter: "blur(10px)",
                          boxShadow: `
                            0 15px 35px rgba(0,0,0,0.25),
                            inset 0 2px 8px rgba(255,255,255,0.5),
                            inset 0 -2px 8px rgba(0,0,0,0.2)
                          `
                        }}
                        title={item.title}
                      >
                        {item.photo_url ? (
                          <div className="w-full h-full rounded-full overflow-hidden">
                            <img src={item.photo_url} alt={item.title} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent pointer-events-none" />
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/80 text-xs font-extrabold px-2 text-center">
                            {item.title}
                          </div>
                        )}
                      </motion.button>

                      {/* Caption under photo */}
                      {(title || desc) && (
                        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-none" style={{ top: "100%", marginTop: isMobile ? "8px" : "10px", width: "170px" }}>
                          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl px-3 py-2 shadow-xl border border-white/50 text-center">
                            {title && (
                              <div className="text-[12px] font-extrabold text-gray-900 dark:text-white leading-tight line-clamp-2">
                                {title}
                              </div>
                            )}
                            {desc && (
                              <div className="mt-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 leading-snug line-clamp-2">
                                {desc}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {!readonly && !lastCreatedId && (
                (() => {
                  const { x, y } = getPositionForAngle(-60, mapRadius);
                  return (
                    <motion.div
                      key="concept-plus"
                      className="absolute z-30"
                      style={{ left: `${x}%`, top: `${y}%`, transformStyle: "preserve-3d" }}
                      initial={{ scale: 0, opacity: 0, rotateY: -180 }}
                      animate={{ scale: 1, opacity: 1, rotateY: 0 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={flySpring}
                      whileHover={{ scale: 1.2, rotateY: 10, rotateX: 8 }}
                      whileTap={{ scale: 0.92 }}
                    >
                      <div className="relative -translate-x-1/2 -translate-y-1/2">
                        <motion.button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowAddWizard(true);
                          }}
                          className={`relative ${categoryCircleSizeClass} rounded-full border-4 border-white/80 transition-all duration-300 overflow-hidden cursor-pointer`}
                          style={{
                            backgroundColor: "rgba(255,255,255,0.18)",
                            backdropFilter: "blur(10px)",
                            borderStyle: "dashed",
                            boxShadow: `
                              0 15px 35px rgba(0,0,0,0.25),
                              inset 0 2px 8px rgba(255,255,255,0.5),
                              inset 0 -2px 8px rgba(0,0,0,0.2)
                            `
                          }}
                          aria-label="Add"
                        >
                          <Plus className={`${isMobile ? "w-6 h-6" : "w-8 h-8"} text-white mx-auto drop-shadow-md`} />
                        </motion.button>
                      </div>
                    </motion.div>
                  );
                })()
              )}
            </>
          )}
          </AnimatePresence>
        </motion.div>
        </LayoutGroup>
      </div>

      {/* Add concept wizard (opens the existing CategoryEditor wizard for the active subcategory) */}
      <AnimatePresence>
        {showAddWizard && !readonly && activeCategory?.id && activeSubcat && (
          <CategoryEditor
            category={activeCategory}
            interests={getCategoryInterests(activeCategory.id)}
            userId={user?.id}
            onClose={() => setShowAddWizard(false)}
            onSave={async () => {
              if (typeof onInterestsChanged === "function") {
                await onInterestsChanged();
              }
            }}
            initialView="concepts"
            initialSubcat={activeSubcat}
            startWizard
            onInterestCreated={(created) => {
              const id = String(created?.id || "");
              if (id) setLastCreatedId(id);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {coverWizardSubcat && !readonly && activeCategory?.id && (
          <SubcategoryCoverWizard
            userId={user?.id}
            category={activeCategory}
            subcategoryLabel={coverWizardSubcat}
            existingCover={getCoverForSubcat(coverWizardSubcat)}
            onClose={() => setCoverWizardSubcat("")}
            onSaved={async () => {
              if (typeof onInterestsChanged === "function") {
                await onInterestsChanged();
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
