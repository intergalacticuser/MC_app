import React from "react";
import { mc } from "@/api/mcClient";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Camera, Edit2, Plus, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import CoinRewardPopup from "@/components/rewards/CoinRewardPopup";

import { CATEGORY_SUGGESTIONS as FIXED_SUBCATEGORIES, IMAGE_SUGGESTIONS as FIXED_IMAGE_SUGGESTIONS, CONCEPT_SUGGESTIONS } from "./categorySuggestionsData";
import { cosmicCoachToast } from "@/components/assistant/cosmicCoachToast";
import { buildInterestNudgePrompt, buildInterestReflectionPrompt } from "@/lib/cosmicCoach";
import { isCoachDismissed } from "@/lib/coachDismissals";

function toSafeText(value) {
  return String(value || "").trim();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

function getSortKey(interest) {
  const v = Number(interest?.sort_index);
  if (Number.isFinite(v)) return v;
  // fallback stable-ish
  const ts = Date.parse(String(interest?.created_date || ""));
  if (Number.isFinite(ts)) return ts;
  return 0;
}

export default function CategoryEditorV3({ category, interests, userId, onClose, onSave }) {
  const [user, setUser] = React.useState(null);

  const [view, setView] = React.useState("subcats"); // subcats | concepts
  const [selectedSubcat, setSelectedSubcat] = React.useState("");

  const [wizardStep, setWizardStep] = React.useState(null); // concept | photo | description
  const [selectedConcept, setSelectedConcept] = React.useState("");
  const [customConcept, setCustomConcept] = React.useState("");
  const [photoSource, setPhotoSource] = React.useState("suggested"); // suggested | upload
  const [tempPhotoUrl, setTempPhotoUrl] = React.useState("");
  const [wizardDescription, setWizardDescription] = React.useState("");
  const [uploading, setUploading] = React.useState(false);

  const [editingInterest, setEditingInterest] = React.useState(null);
  const [editTitle, setEditTitle] = React.useState("");
  const [editDescription, setEditDescription] = React.useState("");
  const [showDescriptionReward, setShowDescriptionReward] = React.useState(false);

  const [showRewardPopup, setShowRewardPopup] = React.useState(false);
  const [rewardAmount, setRewardAmount] = React.useState(0);

  const lastCoachKeyRef = React.useRef("");

  React.useEffect(() => {
    mc.auth.me().then(setUser).catch(() => {});
  }, []);

  const subcats = FIXED_SUBCATEGORIES?.[category?.id] || [];

  const getItemsForSubcat = React.useCallback((subcatLabel) => {
    const label = String(subcatLabel || "").trim();
    if (!label) return [];
    const rows = Array.isArray(interests) ? interests : [];

    // Support new schema (interest.subcategory) + legacy schema (interest.title was the subcategory).
    return rows
      .filter((i) => String(i?.user_id || "") === String(userId || ""))
      .filter((i) => String(i?.category || "") === String(category?.id || ""))
      .filter((i) => String(i?.subcategory || "") === label || (!i?.subcategory && String(i?.title || "") === label))
      .sort((a, b) => getSortKey(a) - getSortKey(b));
  }, [category?.id, interests, userId]);

  const selectedItems = view === "concepts" && selectedSubcat ? getItemsForSubcat(selectedSubcat) : [];

  const runCoach = React.useCallback(async ({ key, prompt }) => {
    const safeKey = String(key || "").trim();
    if (!safeKey || !prompt) return;
    if (lastCoachKeyRef.current === safeKey) return;
    lastCoachKeyRef.current = safeKey;
    const coachUserId = user?.id || userId || "";
    if (coachUserId && isCoachDismissed(coachUserId, safeKey)) return;
    try {
      const res = await mc.integrations.Core.InvokeLLM({
        prompt,
        options: { temperature: 0.9, top_p: 0.9 }
      });
      if (typeof res === "string" && res.trim()) {
        cosmicCoachToast({ title: "MindCircle", text: res.trim(), coach_user_id: coachUserId, coach_dismiss_key: safeKey });
      }
    } catch {
      // ignore
    }
  }, []);

  const openSubcat = (label) => {
    setSelectedSubcat(label);
    setView("concepts");
  };

  const resetWizard = () => {
    setWizardStep(null);
    setSelectedConcept("");
    setCustomConcept("");
    setPhotoSource("suggested");
    setTempPhotoUrl("");
    setWizardDescription("");
  };

  const conceptSuggestions = React.useMemo(() => {
    const map = CONCEPT_SUGGESTIONS?.[category?.id] || {};
    const list = map?.[selectedSubcat] || [];
    return Array.isArray(list) ? list : [];
  }, [category?.id, selectedSubcat]);

  const startAddConcept = () => {
    setWizardStep("concept");
    setSelectedConcept("");
    setCustomConcept("");
    setPhotoSource("suggested");
    setTempPhotoUrl("");
    setWizardDescription("");
  };

  const handleConceptPick = (concept) => {
    const picked = toSafeText(concept);
    if (!picked) return;
    setSelectedConcept(picked);
    setWizardStep("photo");
    setPhotoSource("suggested");

    const key = `nudge:${category?.id || ""}:${selectedSubcat}:${picked.toLowerCase()}`;
    const prompt = buildInterestNudgePrompt({
      categoryId: category?.id,
      categoryLabel: category?.label,
      interestTitle: picked,
      existingTitles: selectedItems.map((i) => i?.title).filter(Boolean),
      userName: user?.full_name || user?.username || ""
    });
    void runCoach({ key, prompt });
  };

  const getPhotoSuggestions = () => {
    const byConcept = FIXED_IMAGE_SUGGESTIONS[selectedConcept] || [];
    const bySubcat = FIXED_IMAGE_SUGGESTIONS[selectedSubcat] || [];
    const byCategory = FIXED_IMAGE_SUGGESTIONS[category?.id] || [];
    const combined = uniq([...byConcept, ...bySubcat, ...byCategory]);
    return combined.length ? combined.slice(0, 9) : [
      "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=400&q=80",
      "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80",
      "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80"
    ];
  };

  const handleWizardFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPhotoSource("upload");
    try {
      const { file_url } = await mc.integrations.Core.UploadFile({ file });
      setTempPhotoUrl(file_url);
      setWizardStep("description");
    } catch (error) {
      console.error(error);
      alert("Upload failed. Please try again.");
    }
    setUploading(false);
  };

  const handleSelectSuggestion = (url) => {
    setTempPhotoUrl(url);
    setPhotoSource("suggested");
    setWizardStep("description");
  };

  const handleWizardComplete = async () => {
    const title = toSafeText(selectedConcept);
    if (!title) return;
    if (!toSafeText(tempPhotoUrl)) return;

    try {
      setUploading(true);
      const currentUser = await mc.auth.me();

      const nextSortIndex = Math.max(-1, ...selectedItems.map((i) => Number(i?.sort_index)).filter((n) => Number.isFinite(n))) + 1;

      const created = await mc.entities.Interest.create({
        user_id: userId,
        category: category.id,
        subcategory: selectedSubcat,
        title,
        photo_url: tempPhotoUrl,
        description: wizardDescription,
        sort_index: nextSortIndex
      });

      // Reflect if user wrote something.
      const initialDesc = toSafeText(wizardDescription);
      if (initialDesc) {
        const key = `reflect:${created?.id || "new"}:${initialDesc.length}`;
        const prompt = buildInterestReflectionPrompt({
          categoryId: category?.id,
          categoryLabel: category?.label,
          interestTitle: title,
          userDescription: initialDesc,
          userName: currentUser?.full_name || currentUser?.username || ""
        });
        void runCoach({ key, prompt });
      }

      // Coins logic (keep existing tutorial step names stable).
      const totalInCategory = (Array.isArray(interests) ? interests : [])
        .filter((i) => String(i?.user_id || "") === String(userId || ""))
        .filter((i) => String(i?.category || "") === String(category?.id || "")).length;

      let coinsToAdd = 0;
      let nextTutorialV2 = currentUser.tutorial_v2_step || "";
      let showReward = false;

      const isGuidedCenter = nextTutorialV2 === "category_center_photo" && totalInCategory === 0;
      const isGuidedAdditional = nextTutorialV2 === "category_additional_photo" && totalInCategory >= 1;

      if (isGuidedAdditional) {
        coinsToAdd = 50;
        nextTutorialV2 = "search_highlight";
        showReward = true;
      } else if (isGuidedCenter) {
        nextTutorialV2 = "category_additional_photo";
      } else {
        const isFirstEver = !currentUser.first_interest_added;
        coinsToAdd = isFirstEver ? 50 : 15;
        if (photoSource === "upload") coinsToAdd += 5;
        if (initialDesc) coinsToAdd += 10;
        showReward = coinsToAdd > 0;
      }

      const userUpdate = { first_interest_added: true };
      if (coinsToAdd > 0) userUpdate.coins = (currentUser.coins || 0) + coinsToAdd;
      if (nextTutorialV2 !== (currentUser.tutorial_v2_step || "")) userUpdate.tutorial_v2_step = nextTutorialV2;
      await mc.auth.updateMe(userUpdate).catch(() => {});

      if (showReward && coinsToAdd > 0) {
        setRewardAmount(coinsToAdd);
        setShowRewardPopup(true);
        window.dispatchEvent(new Event("coins-updated"));
      }

      await onSave();
      resetWizard();
    } catch (error) {
      console.error(error);
      alert("Create failed. Please try again.");
    }

    setUploading(false);
  };

  const handleDeleteInterest = async (id) => {
    if (!id) return;
    try {
      await mc.entities.Interest.delete(id);
      await onSave();
    } catch (e) {
      console.error(e);
      alert("Delete failed. Please try again.");
    }
  };

  const handleEditClick = (interest) => {
    setEditingInterest(interest);
    setEditTitle(String(interest?.title || ""));
    setEditDescription(String(interest?.description || ""));
  };

  const handleSaveEdit = async () => {
    if (!editingInterest?.id) return;
    try {
      const prevDesc = toSafeText(editingInterest.description);
      const nextDesc = toSafeText(editDescription);

      if (!prevDesc && nextDesc) {
        const currentUser = await mc.auth.me();
        await mc.auth.updateMe({ coins: (currentUser.coins || 0) + 20 }).catch(() => {});
        setShowDescriptionReward(true);
        window.setTimeout(() => setShowDescriptionReward(false), 2500);
        window.dispatchEvent(new Event("coins-updated"));
      }

      await mc.entities.Interest.update(editingInterest.id, {
        title: toSafeText(editTitle) || editingInterest.title,
        description: editDescription
      });
      await onSave();

      if (nextDesc && nextDesc !== prevDesc) {
        const key = `reflect:${editingInterest.id}:${nextDesc.length}`;
        const prompt = buildInterestReflectionPrompt({
          categoryId: category?.id,
          categoryLabel: category?.label,
          interestTitle: toSafeText(editTitle) || editingInterest.title,
          userDescription: nextDesc,
          userName: user?.full_name || user?.username || ""
        });
        void runCoach({ key, prompt });
      }

      setEditingInterest(null);
      setEditTitle("");
      setEditDescription("");
    } catch (e) {
      console.error(e);
      alert("Save failed. Please try again.");
    }
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
        >
          {showDescriptionReward && (
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-400 to-orange-500 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 z-50"
            >
              <span className="text-2xl font-bold">+20 coins</span>
            </motion.div>
          )}

          <div className="flex justify-between items-center mb-6 gap-2">
            {view === "concepts" ? (
              <Button
                variant="outline"
                onClick={() => {
                  setView("subcats");
                  setSelectedSubcat("");
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            ) : (
              <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            )}

            <div className="text-center flex-1">
              <div className="text-xs uppercase tracking-wider text-gray-500">Category</div>
              <div className="text-lg font-bold text-gray-900">{category?.label}</div>
              {view === "concepts" && selectedSubcat && (
                <div className="text-sm text-gray-600 mt-0.5">{selectedSubcat}</div>
              )}
            </div>

            <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {view === "subcats" ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 p-4">
                <p className="text-sm font-semibold text-gray-900">Choose a subcategory</p>
                <p className="text-xs text-gray-600 mt-1">Five fixed subcategories inside each main category.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {subcats.map((label) => {
                  const count = getItemsForSubcat(label).length;
                  return (
                    <button
                      key={label}
                      onClick={() => openSubcat(label)}
                      className="group text-left rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-base font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {label}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{count} items</div>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                          <ArrowLeft className="w-4 h-4 rotate-180" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-900">Your concepts</div>
                    <div className="text-xs text-gray-600 mt-1">Add items one by one. The plus stays at the end.</div>
                  </div>
                  <Button onClick={startAddConcept} className="bg-indigo-600 hover:bg-indigo-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </div>

              <motion.div
                layout
                className="flex gap-4 overflow-x-auto py-2 px-1"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                <AnimatePresence initial={false}>
                  {selectedItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 420, damping: 30 }}
                      className="shrink-0 w-[120px]"
                    >
                      <div className="relative group">
                        <button
                          type="button"
                          onClick={() => handleEditClick(item)}
                          className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200 relative"
                          style={{ boxShadow: "0 20px 40px rgba(0,0,0,0.18)" }}
                        >
                          {item.photo_url ? (
                            <>
                              <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                            </>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">No photo</div>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditClick(item);
                          }}
                          className="absolute bottom-1 left-1 w-9 h-9 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-blue-600 border-2 border-white"
                          aria-label="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInterest(item.id);
                          }}
                          className="absolute -top-1 -right-1 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl hover:bg-red-600 border-2 border-white"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                      <div className="mt-2 text-center">
                        <div className="text-xs font-bold text-gray-900 line-clamp-2">{item.title}</div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <motion.button
                  layout
                  type="button"
                  onClick={startAddConcept}
                  className="shrink-0 w-[120px] h-[120px] rounded-full border-4 border-dashed border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex flex-col items-center justify-center transition-colors"
                >
                  <Plus className="w-10 h-10" />
                  <div className="text-xs font-semibold mt-1">Add</div>
                </motion.button>
              </motion.div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {showRewardPopup && <CoinRewardPopup amount={rewardAmount} onClose={() => setShowRewardPopup(false)} />}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingInterest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
            onClick={() => setEditingInterest(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Edit</h3>
                <button onClick={() => setEditingInterest(null)} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {editingInterest.photo_url && (
                <div className="mb-4">
                  <img src={editingInterest.photo_url} alt="" className="w-full h-40 object-cover rounded-xl" />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Title</div>
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-700 mb-1">Description</div>
                  <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} className="min-h-[110px]" />
                </div>
              </div>

              <div className="flex gap-3 mt-5">
                <Button variant="outline" onClick={() => setEditingInterest(null)} className="flex-1">Cancel</Button>
                <Button onClick={handleSaveEdit} className="flex-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600">Save</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard Modal */}
      <AnimatePresence>
        {wizardStep && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"
            onClick={resetWizard}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              {wizardStep === "concept" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pick a concept</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Choose one, or add your own.</p>
                  </div>

                  <div className="flex flex-wrap gap-2 justify-center max-h-[300px] overflow-y-auto p-1">
                    {(conceptSuggestions.length ? conceptSuggestions : ["Favorite thing", "Memory", "Habit", "Style", "Goal", "Place", "Song", "Movie", "Book", "Food"]).map((c) => (
                      <button
                        key={c}
                        onClick={() => handleConceptPick(c)}
                        className="px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-gray-800 dark:text-gray-200 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-all transform hover:scale-105 border border-transparent hover:border-indigo-200"
                      >
                        {c}
                      </button>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">Custom concept</div>
                    <div className="flex gap-2 mt-2">
                      <Input value={customConcept} onChange={(e) => setCustomConcept(e.target.value)} placeholder="Type your own..." />
                      <Button
                        onClick={() => handleConceptPick(customConcept)}
                        disabled={!toSafeText(customConcept)}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        Use
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === "photo" && (
                <div className="space-y-7 text-center">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{selectedConcept}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Pick a photo or upload your own.</p>
                  </div>

                  <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                    <button
                      type="button"
                      onClick={() => setPhotoSource("suggested")}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        photoSource === "suggested" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      Suggested photos
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoSource("upload")}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                        photoSource === "upload" ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm" : "text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      Upload my photo
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1">
                    <input type="file" accept="image/*" onChange={handleWizardFileUpload} className="hidden" id="wizard-upload-v3" disabled={uploading} />

                    {photoSource === "upload" ? (
                      <label
                        htmlFor="wizard-upload-v3"
                        className="col-span-2 md:col-span-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group relative overflow-hidden py-10"
                      >
                        {uploading ? (
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                        ) : (
                          <>
                            <Camera className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload your photo</span>
                            <span className="text-xs text-gray-500 mt-1">Get +5 extra coins for custom photos</span>
                          </>
                        )}
                      </label>
                    ) : (
                      <>
                        {getPhotoSuggestions().map((url, idx) => (
                          <motion.button
                            key={url}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.04 }}
                            onClick={() => handleSelectSuggestion(url)}
                            className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-500 hover:scale-[1.02] transition-all relative group"
                          >
                            <img src={url} alt="suggestion" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                          </motion.button>
                        ))}
                        <label
                          htmlFor="wizard-upload-v3"
                          className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group relative overflow-hidden"
                        >
                          {uploading ? (
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                              <span className="text-xs font-medium text-gray-500 group-hover:text-indigo-500 text-center px-2">Upload my photo (+5)</span>
                            </>
                          )}
                        </label>
                      </>
                    )}
                  </div>

                  <div className="flex justify-between gap-3">
                    <Button variant="outline" onClick={() => setWizardStep("concept")}>Back</Button>
                    <Button
                      onClick={() => {
                        if (!toSafeText(tempPhotoUrl)) return;
                        setWizardStep("description");
                      }}
                      disabled={!toSafeText(tempPhotoUrl)}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === "description" && (
                <div className="space-y-6">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-indigo-200">
                      <img src={tempPhotoUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add meaning</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">What do you like about {selectedConcept}?</p>
                  </div>

                  <Textarea
                    placeholder={`For example: I love ${selectedConcept} because...`}
                    value={wizardDescription}
                    onChange={(e) => setWizardDescription(e.target.value)}
                    className="min-h-[110px] text-lg"
                    autoFocus
                  />

                  <div className="flex gap-3 pt-2">
                    <Button variant="outline" onClick={() => setWizardStep("photo")} className="flex-1">Back</Button>
                    <Button onClick={handleWizardComplete} disabled={uploading} className="flex-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white">
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
