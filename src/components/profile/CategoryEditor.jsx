import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Camera, ArrowLeft, Edit2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import Spotlight from "@/components/tutorial/Spotlight";
import CoinRewardPopup from "@/components/rewards/CoinRewardPopup";
import { useIsMobile } from "@/hooks/use-mobile";
import { CATEGORY_SUGGESTIONS as FIXED_SUBCATEGORIES, IMAGE_SUGGESTIONS as FIXED_IMAGE_SUGGESTIONS } from "./categorySuggestionsData";

export default function CategoryEditor({ category, interests, userId, onClose, onSave, isFirstInterest = false }) {
  const [uploading, setUploading] = useState(false);
  const [editingInterest, setEditingInterest] = useState(null);
  const [showDescriptionReward, setShowDescriptionReward] = useState(false);
  const [editDescription, setEditDescription] = useState("");
  const [zoom, setZoom] = useState(1);
  const [showPhotoAddAnimation, setShowPhotoAddAnimation] = useState(null);
  const [showRewardPopup, setShowRewardPopup] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);
  const [isGuidedReward, setIsGuidedReward] = useState(false);
  const [showAdditionalPhotoHint, setShowAdditionalPhotoHint] = useState(false);
  const [user, setUser] = useState(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const u = await base44.auth.me();
    setUser(u);
  };

  // Wizard state
  const [wizardStep, setWizardStep] = useState(null);
  const [activePosition, setActivePosition] = useState(null);
  const [selectedType, setSelectedType] = useState("");
  const [tempPhotoUrl, setTempPhotoUrl] = useState("");
  const [wizardDescription, setWizardDescription] = useState("");

  const startAdding = (position) => {
    setActivePosition(position);
    setTempPhotoUrl("");
    setWizardDescription("");
    if (position === 0) {
      setSelectedType(category.label);
      setWizardStep('photo');
    } else {
      setSelectedType("");
      setWizardStep('type');
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setWizardStep('photo');
  };

  const handleWizardFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setTempPhotoUrl(file_url);
      setWizardStep('description');
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const handleSelectSuggestion = (url) => {
    setTempPhotoUrl(url);
    setWizardStep('description');
  };

  const getSuggestions = () => {
    const exactMatches = FIXED_IMAGE_SUGGESTIONS[selectedType] || [];
    const categoryMatches = FIXED_IMAGE_SUGGESTIONS[category.id] || [];
    const combined = [...new Set([...exactMatches, ...categoryMatches])];
    if (combined.length) return combined.slice(0, 6);
    return [
      "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=400&q=80",
      "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80",
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80"
    ];
  };

  const handleWizardComplete = async () => {
    try {
      setUploading(true);
      const currentUser = await base44.auth.me();

      await base44.entities.Interest.create({
        user_id: userId,
        category: category.id,
        title: selectedType,
        photo_url: tempPhotoUrl,
        description: wizardDescription,
        position: activePosition
      });

      let coinsToAdd = 0;
      let nextTutorialV2 = currentUser.tutorial_v2_step || "";
      let showReward = false;
      const isGuidedCenterPhoto = nextTutorialV2 === "category_center_photo" && activePosition === 0;
      const isGuidedAdditionalPhoto = nextTutorialV2 === "category_additional_photo" && activePosition > 0;

      if (isGuidedAdditionalPhoto) {
        coinsToAdd = 50;
        nextTutorialV2 = "search_highlight";
        showReward = true;
        setIsGuidedReward(true);
      } else if (isGuidedCenterPhoto) {
        nextTutorialV2 = "category_additional_photo";
        setShowAdditionalPhotoHint(true);
        setIsGuidedReward(false);
      } else {
        const isFirstEver = !currentUser.first_interest_added;
        coinsToAdd = isFirstEver ? 50 : 15;
        if (wizardDescription && wizardDescription.trim()) {
          coinsToAdd += 10;
        }
        showReward = coinsToAdd > 0;
        setIsGuidedReward(false);
      }

      const userUpdate = {
        first_interest_added: true
      };
      if (coinsToAdd > 0) {
        userUpdate.coins = (currentUser.coins || 0) + coinsToAdd;
      }
      if (nextTutorialV2 !== (currentUser.tutorial_v2_step || "")) {
        userUpdate.tutorial_v2_step = nextTutorialV2;
      }
      await base44.auth.updateMe(userUpdate);
      await loadUser();

      if (showReward) {
        setRewardAmount(coinsToAdd);
        setShowRewardPopup(true);
        window.dispatchEvent(new Event("coins-updated"));
      }

      setShowPhotoAddAnimation(activePosition);
      setTimeout(() => setShowPhotoAddAnimation(null), 1000);

      await onSave();

      setWizardStep(null);
      setActivePosition(null);
      setSelectedType("");
      setTempPhotoUrl("");
      setWizardDescription("");
    } catch (error) {
      console.error("Error creating interest:", error);
      alert("Create failed. Please try again.");
    }
    setUploading(false);
  };

  const handleDeleteInterest = async (interestId) => {
    try {
      await base44.entities.Interest.delete(interestId);
      await onSave();
    } catch (error) {
      console.error("Error deleting:", error);
      alert("Delete failed. Please try again.");
    }
  };

  const handleEditClick = (interest) => {
    setEditingInterest(interest);
    setEditDescription(interest.description || "");
  };

  const handleSaveDescription = async () => {
    if (!editingInterest) return;
    try {
      if (!editingInterest.description && editDescription) {
        const currentUser = await base44.auth.me();
        await base44.auth.updateMe({
          coins: (currentUser.coins || 0) + 20
        });
        setShowDescriptionReward(true);
        setTimeout(() => setShowDescriptionReward(false), 3000);
        window.dispatchEvent(new Event("coins-updated"));
      }
      await base44.entities.Interest.update(editingInterest.id, {
        description: editDescription
      });
      await onSave();
      setEditingInterest(null);
      setEditDescription("");
    } catch (error) {
      console.error("Error saving description:", error);
      alert("Save failed. Please try again.");
    }
  };

  const getPositionForIndex = (index, total) => {
    const angle = index * 360 / total;
    const radius = isMobile ? 40 : 42;
    const x = 50 + radius * Math.cos((angle - 90) * Math.PI / 180);
    const y = 50 + radius * Math.sin((angle - 90) * Math.PI / 180);
    return { x, y };
  };

  const positionedInterests = Array(9).fill(null);
  interests.forEach((interest) => {
    const pos = interest.position ?? 0;
    if (pos >= 0 && pos < 9) {
      positionedInterests[pos] = interest;
    }
  });

  const centerPhoto = positionedInterests[0];
  const surroundingPhotos = positionedInterests.slice(1, 9);
  const maxSurrounding = 8;

  React.useEffect(() => {
    const hasAnyAdditionalPhoto = surroundingPhotos.some(Boolean);
    if (user?.tutorial_v2_step === "category_additional_photo" && centerPhoto && !hasAnyAdditionalPhoto) {
      setShowAdditionalPhotoHint(true);
    } else {
      setShowAdditionalPhotoHint(false);
    }
  }, [user?.tutorial_v2_step, centerPhoto, surroundingPhotos]);

  const handleRewardClose = async () => {
    setShowRewardPopup(false);
    setIsGuidedReward(false);
    window.dispatchEvent(new Event("coins-updated"));
    if (isGuidedReward) {
      onClose();
    }
  };

  const centerRef = React.useRef(null);

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative">

          {showDescriptionReward &&
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50">
              <span className="text-2xl font-bold">+20 coins</span>
            </motion.div>
          }

          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setZoom(Math.min(zoom + 0.2, 2))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all select-none">
                      <ZoomIn className="w-5 h-5 text-gray-700 select-none" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>Zoom in</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={() => setZoom(Math.max(zoom - 0.2, 0.6))} className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-all select-none">
                      <ZoomOut className="w-5 h-5 text-gray-700 select-none" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent><p>Zoom out</p></TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mind Map */}
          <div className="overflow-visible rounded-3xl bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
            <motion.div
              animate={{ scale: zoom }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full aspect-square max-w-none md:max-w-3xl mx-auto overflow-visible pb-24"
              style={{ transformOrigin: 'center center' }}>

              <div className="absolute inset-0 pointer-events-none">
                <svg width="100%" height="100%" className="absolute inset-0">
                  {Array.from({ length: maxSurrounding }).map((_, index) => {
                    const { x, y } = getPositionForIndex(index, maxSurrounding);
                    return (
                      <motion.line key={`line-${index}`} x1="50%" y1="50%" x2={`${x}%`} y2={`${y}%`}
                        stroke={category.color} strokeWidth="3" strokeOpacity="0.3"
                        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                        transition={{ delay: 0.3 + 0.05 * index, duration: 0.8 }} />
                    );
                  })}
                </svg>
                {Array.from({ length: 3 }).map((_, i) =>
                  <motion.div key={i} className="absolute rounded-full"
                    style={{ width: `${30 + i * 25}%`, height: `${30 + i * 25}%`, left: '50%', top: '50%', transform: 'translate(-50%, -50%)', border: `2px solid ${category.color}`, opacity: 0.2 }}
                    animate={{ rotate: 360 }} transition={{ duration: 30 + i * 10, repeat: Infinity, ease: "linear" }} />
                )}
              </div>

              {/* CENTER PHOTO */}
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="relative group">
                        <motion.div whileHover={{ scale: 1.1 }} className="relative"
                          animate={showPhotoAddAnimation === 0 ? { scale: [1, 1.3, 1], rotate: [0, 360, 360] } : {}}
                          transition={{ duration: 0.6 }}>
                          {centerPhoto ? (
                            <div className="relative">
                              <div className={`${isMobile ? "w-40 h-40" : "w-32 h-32 md:w-40 md:h-40"} rounded-full border-4 border-white shadow-2xl overflow-hidden`}
                                style={{ boxShadow: `0 30px 60px rgba(0,0,0,0.3), 0 15px 30px ${category.color}60` }}>
                                <img src={centerPhoto.photo_url} alt="" className="w-full h-full object-cover" />
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); handleEditClick(centerPhoto); }}
                                className="absolute bottom-2 left-2 w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-blue-600 border-2 border-white">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteInterest(centerPhoto.id); }}
                                className="absolute -top-2 -right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-red-600 border-2 border-white">
                                <Trash2 className="w-5 h-5" />
                              </button>
                              {centerPhoto.description && (
                                <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">✓</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div ref={centerRef}>
                              <div onClick={() => startAdding(0)}
                                className={`${isMobile ? "w-40 h-40" : "w-32 h-32 md:w-40 md:h-40"} block rounded-full border-4 border-dashed shadow-2xl flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 hover:bg-white/50`}
                                style={{ borderColor: category.color, backgroundColor: `${category.color}15` }}>
                                <Plus className={`${isMobile ? "w-10 h-10" : "w-12 h-12"} mb-2`} style={{ color: category.color }} />
                                <span className={`${isMobile ? "text-[11px]" : "text-xs"} font-bold`} style={{ color: category.color }}>Add</span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                        
                        {user?.tutorial_v2_step === "category_center_photo" && !centerPhoto && centerRef.current && (
                          <Spotlight targetRef={centerRef.current} text="Choose a central photo" position="bottom" />
                        )}

                        <div className={`absolute ${isMobile ? "-bottom-12" : "-bottom-16"} left-1/2 -translate-x-1/2 whitespace-nowrap bg-white/90 backdrop-blur-md rounded-xl ${isMobile ? "px-3 py-2" : "px-5 py-2.5"} shadow-2xl border border-gray-100 z-[90]`}>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{category.icon}</span>
                            <div className="text-center">
                              <h3 className={`${isMobile ? "text-sm" : ""} font-bold text-gray-900 leading-tight`}>{category.label}</h3>
                              {centerPhoto && centerPhoto.title && (
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider block">{centerPhoto.title}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="bg-gray-900/95 text-white border-gray-700">
                      <p className="font-semibold">Central photo</p>
                      <p className="text-xs text-gray-300 mt-1">{centerPhoto ? "Tap to edit" : "Tap to add"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              {/* SURROUNDING PHOTOS */}
              {Array.from({ length: maxSurrounding }).map((_, slotIndex) => {
                const { x, y } = getPositionForIndex(slotIndex, maxSurrounding);
                const photo = surroundingPhotos[slotIndex];
                const position = slotIndex + 1;
                const hasPhoto = !!photo;

                return (
                  <TooltipProvider key={`surrounding-${slotIndex}`}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div className="absolute z-40" style={{ left: `${x}%`, top: `${y}%` }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={showPhotoAddAnimation === position ? { scale: [0, 1.5, 1], opacity: [0, 1, 1], rotate: [0, 360, 360] } : { scale: 1, opacity: 1 }}
                          transition={{ delay: showPhotoAddAnimation === position ? 0 : 0.5 + 0.08 * slotIndex, duration: showPhotoAddAnimation === position ? 0.6 : 0.5, type: "spring" }}
                          whileHover={{ scale: 1.25 }}>
                          <div className="relative -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
                            {hasPhoto ? (
                              <>
                                <div className="relative group">
                                  <div className={`${isMobile ? "w-16 h-16" : "w-20 h-20 md:w-24 md:h-24"} rounded-full border-4 border-white shadow-xl overflow-hidden`}
                                    style={{ boxShadow: `0 15px 35px rgba(0,0,0,0.25), 0 8px 15px ${category.color}30` }}>
                                    <img src={photo.photo_url} alt="" className="w-full h-full object-cover" />
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleEditClick(photo); }}
                                    className="absolute bottom-1 left-1 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-blue-600 border-2 border-white">
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteInterest(photo.id); }}
                                    className="absolute -top-1 -right-1 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-red-600 border-2 border-white">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                  {photo.description && (
                                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                                      <span className="text-white text-xs font-bold">✓</span>
                                    </div>
                                  )}
                                </div>
                                {(photo.description || photo.title) && (
                                  <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                                    className={`${isMobile ? "w-20 mt-1 px-1.5 py-0.5" : "w-28 mt-2 px-2 py-1"} bg-gray-800/95 backdrop-blur-sm rounded-lg text-white shadow-xl text-center`}>
                                    {photo.title && <p className="text-[10px] font-bold text-purple-200 mb-0.5 uppercase tracking-wider">{photo.title}</p>}
                                    {photo.description && <p className="text-[10px] line-clamp-2 break-words leading-tight">{photo.description}</p>}
                                  </motion.div>
                                )}
                              </>
                            ) : (
                              <div>
                                <div onClick={() => startAdding(position)}
                                  className={`${isMobile ? "w-16 h-16" : "w-20 h-20 md:w-24 md:h-24"} block rounded-full border-4 border-dashed bg-white shadow-xl flex items-center justify-center transition-all cursor-pointer hover:border-opacity-100 hover:scale-105`}
                                  style={{ borderColor: category.color }}>
                                  <Plus className={`${isMobile ? "w-7 h-7" : "w-10 h-10"}`} style={{ color: category.color }} />
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="bg-gray-900/95 text-white border-gray-700">
                        {photo ? (
                          <div>
                            <p className="font-semibold text-sm">Photo #{position}</p>
                            {photo.description && <p className="text-xs text-gray-300 mt-1 max-w-[200px]">{photo.description}</p>}
                            <p className="text-xs text-gray-400 mt-1">Tap to edit</p>
                          </div>
                        ) : (
                          <p className="text-sm">Add photo #{position}</p>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                );
              })}
            </motion.div>
          </div>

          <div className="text-center mt-8 text-sm text-gray-600">
            <p className="font-medium">{interests.length} of 9 photos uploaded</p>
            <p className="text-xs mt-1 text-gray-500">
              {centerPhoto ? "Add up to 8 more photos around the center" : "Upload a central photo to continue"}
            </p>
          </div>
        </motion.div>
      </motion.div>

      {/* Description Edit Modal */}
      <AnimatePresence>
        {editingInterest && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setEditingInterest(null)}>
            <motion.div initial={{ scale: 0.8, opacity: 0, y: 50 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.8, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Add description</h3>
                <button onClick={() => setEditingInterest(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mb-4">
                <img src={editingInterest.photo_url} alt="" className="w-full h-48 object-cover rounded-xl" />
              </div>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe this photo..." className="mb-4 min-h-[100px]" autoFocus />
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setEditingInterest(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveDescription} className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600">Save</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reward Popup with confetti */}
      <AnimatePresence>
        {showRewardPopup && (
          <CoinRewardPopup amount={rewardAmount} onClose={handleRewardClose} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showAdditionalPhotoHint && user?.tutorial_v2_step === "category_additional_photo" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[120] w-[calc(100%-2rem)] max-w-sm rounded-2xl bg-white shadow-2xl border border-gray-200 p-4"
          >
            <p className="text-sm font-semibold text-gray-900 leading-relaxed">
              Now you can add more photos to this category
            </p>
            <div className="mt-3 flex justify-end">
              <Button
                size="sm"
                onClick={() => setShowAdditionalPhotoHint(false)}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                OK
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Adding Wizard Modal */}
      <AnimatePresence>
        {wizardStep && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={() => setWizardStep(null)}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800">

              {wizardStep === 'type' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">What should we add?</h3>
                    <p className="text-gray-500 dark:text-gray-400">Choose one of the fixed subcategories</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center max-h-[300px] overflow-y-auto p-1">
                    {(FIXED_SUBCATEGORIES[category.id] || []).map((type) => (
                      <button key={type} onClick={() => handleTypeSelect(type)}
                        className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-purple-100 dark:hover:bg-purple-900/30 text-gray-700 dark:text-gray-200 hover:text-purple-600 dark:hover:text-purple-400 font-medium transition-all transform hover:scale-105 border border-transparent hover:border-purple-200">
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {wizardStep === 'photo' && (
                <div className="space-y-8 text-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      {activePosition === 0 ? `Central: ${selectedType}` : selectedType}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">
                      {activePosition === 0 ? "Upload a central photo for this category" : "Upload a photo that reflects this"}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1">
                    <input type="file" accept="image/*" onChange={handleWizardFileUpload} className="hidden" id="wizard-upload" disabled={uploading} />
                    <label htmlFor="wizard-upload"
                      className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-purple-50 dark:hover:bg-purple-900/20 group relative overflow-hidden">
                      {uploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-gray-400 group-hover:text-purple-500 mb-2 transition-colors" />
                          <span className="text-xs font-medium text-gray-500 group-hover:text-purple-500 text-center px-2">Upload your own</span>
                        </>
                      )}
                    </label>
                    {getSuggestions().map((url, idx) => (
                      <motion.button key={idx} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.05 }} onClick={() => handleSelectSuggestion(url)}
                        className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-purple-500 hover:scale-[1.02] transition-all relative group">
                        <img src={url} alt="suggestion" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </motion.button>
                    ))}
                  </div>
                  {activePosition !== 0 && (
                    <Button variant="ghost" onClick={() => setWizardStep('type')}>Back</Button>
                  )}
                </div>
              )}

              {wizardStep === 'description' && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-purple-200">
                      <img src={tempPhotoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">What does this mean to you?</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Tell us more about {selectedType}</p>
                  </div>
                  <Textarea placeholder={`For example: I value ${selectedType} because...`}
                    value={wizardDescription} onChange={(e) => setWizardDescription(e.target.value)}
                    className="min-h-[100px] text-lg" autoFocus />
                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setWizardStep('photo')} className="flex-1">Back</Button>
                    <Button onClick={handleWizardComplete} disabled={uploading}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all">
                      {uploading ? "Saving..." : "Done"}
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
