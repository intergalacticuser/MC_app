import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { X, Upload, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const PRESET_BACKGROUNDS = [
  { id: "gradient1", url: null, style: "from-purple-50 via-pink-50 to-orange-50", label: "Sunset" },
  { id: "gradient2", url: null, style: "from-blue-50 via-purple-50 to-pink-50", label: "Ocean" },
  { id: "gradient3", url: null, style: "from-green-50 via-blue-50 to-purple-50", label: "Forest" },
  { id: "gradient4", url: null, style: "from-yellow-50 via-orange-50 to-red-50", label: "Fire" },
  { id: "gradient5", url: null, style: "from-gray-50 via-slate-50 to-zinc-50", label: "Minimal" },
  { id: "gradient6", url: null, style: "from-indigo-50 via-violet-50 to-purple-50", label: "Dream" },
];

const isImageBackground = (value = "") =>
  typeof value === "string" && /^(https?:\/\/|data:image\/|blob:)/i.test(value);

export default function BackgroundSelector({ user, onClose, onSave }) {
  const [uploading, setUploading] = useState(false);
  const [selectedBg, setSelectedBg] = useState(user?.background_url || null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setSelectedBg(file_url);
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    setUploading(false);
  };

  const handleSave = async () => {
    await base44.auth.updateMe({ background_url: selectedBg });
    await onSave();
    onClose();
  };

  const handleSelectPreset = (preset) => {
    setSelectedBg(preset.style);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl max-h-[calc(100dvh-8.5rem)] md:max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Select Background</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload Custom Background */}
        <div className="mb-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload your image</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="background-upload"
            disabled={uploading}
          />
          <label
            htmlFor="background-upload"
            className={`flex items-center justify-center gap-3 p-6 border-2 border-dashed rounded-2xl transition-all ${
              uploading 
                ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
                : 'border-purple-300 hover:border-purple-500 hover:bg-purple-50 cursor-pointer'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-gray-600">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-purple-600" />
                <span className="font-medium text-gray-700">Click to upload photo</span>
              </>
            )}
          </label>
          {selectedBg && isImageBackground(selectedBg) && (
            <div className="mt-3 relative">
              <img
                src={selectedBg}
                alt="Selected"
                className="w-full h-32 object-cover rounded-xl"
              />
              <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                <Check className="w-4 h-4" />
              </div>
            </div>
          )}
        </div>

        {/* Preset Backgrounds */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Preset Gradients</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {PRESET_BACKGROUNDS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectPreset(preset)}
                className={`relative aspect-square rounded-xl overflow-hidden transition-all ${
                  selectedBg === preset.style 
                    ? 'ring-4 ring-purple-500 scale-95' 
                    : 'hover:scale-105 ring-2 ring-gray-200'
                }`}
              >
                <div className={`w-full h-full bg-gradient-to-br ${preset.style}`}></div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm py-2 text-white text-xs font-medium">
                  {preset.label}
                </div>
                {selectedBg === preset.style && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                    <Check className="w-4 h-4" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="sticky bottom-0 mt-8 pt-3 bg-white/95">
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600"
            >
              Save
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
