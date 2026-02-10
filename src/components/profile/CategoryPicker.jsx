import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { CATEGORIES_LIST } from "@/components/utils/matchingUtils";

const PRESET_IMAGES = {
  love_relationships: [
    "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80",
    "https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=400&q=80"
  ],
  lifestyle_values: [
    "https://images.unsplash.com/photo-1499209974431-9dddcece7f88?w=400&q=80",
    "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=400&q=80"
  ],
  cultural_taste: [
    "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80"
  ],
  hobbies_activities: [
    "https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80",
    "https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=400&q=80"
  ],
  food_everyday_life: [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&q=80",
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&q=80"
  ]
};

const DEFAULT_IMAGES = [
  "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=400&q=80",
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80"
];

export default function CategoryPicker({ onClose, onSelect, usedCategories = [] }) {
  const [step, setStep] = useState(1);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);

  const suggestions = CATEGORIES_LIST.filter((c) => !usedCategories.includes(c.id));

  const handleTypeSelect = (category) => {
    setSelectedType(category);
    setSelectedPhoto(null);
    setStep(2);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSelectedPhoto(file_url);
    } catch (error) {
      console.error("Upload error:", error);
    }
    setUploading(false);
  };

  const handleComplete = () => {
    if (!selectedType || !selectedPhoto) return;
    onSelect({
      ...selectedType,
      photo_url: selectedPhoto
    });
  };

  const getPhotoSuggestions = () => {
    if (!selectedType) return DEFAULT_IMAGES;
    return PRESET_IMAGES[selectedType.id] || DEFAULT_IMAGES;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {step === 1 ? "Choose category" : "Choose cover"}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="mb-6">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Core Domains</div>
                  <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto">
                    {suggestions.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleTypeSelect(cat)}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-gray-200 dark:border-gray-700 hover:border-purple-300 transition-all group"
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-purple-600 dark:group-hover:text-purple-300">
                          {cat.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
              >
                <div className="text-center mb-6">
                  <div className="inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm mb-4">
                    {selectedType.icon} {selectedType.label}
                  </div>
                  <p className="text-gray-500 text-sm">Choose an image for this domain</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                  <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-purple-500 flex flex-col items-center justify-center cursor-pointer bg-gray-50 dark:bg-gray-800/50 hover:bg-purple-50 transition-colors">
                    {uploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600" />
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-gray-400 mb-2" />
                        <span className="text-xs text-gray-500">Upload</span>
                      </>
                    )}
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                  </label>

                  {getPhotoSuggestions().map((url, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedPhoto(url)}
                      className={`aspect-square rounded-xl overflow-hidden cursor-pointer relative group border-2 ${
                        selectedPhoto === url ? "border-purple-500 ring-2 ring-purple-200" : "border-transparent"
                      }`}
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {selectedPhoto === url && (
                        <div className="absolute inset-0 bg-purple-500/20 flex items-center justify-center">
                          <div className="bg-white rounded-full p-1 shadow-lg">
                            <Check className="w-4 h-4 text-purple-600" />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                    Back
                  </Button>
                  <Button
                    onClick={handleComplete}
                    disabled={!selectedPhoto}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white"
                  >
                    Create
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
