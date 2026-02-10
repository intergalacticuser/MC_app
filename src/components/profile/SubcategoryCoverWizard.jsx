import React from "react";
import { mc } from "@/api/mcClient";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IMAGE_SUGGESTIONS } from "./categorySuggestionsData";
import ImageCropModal from "@/components/ui/image-crop-modal";

function toSafeText(value) {
  return String(value || "").trim();
}

function uniq(arr) {
  return Array.from(new Set((arr || []).filter(Boolean)));
}

export default function SubcategoryCoverWizard({
  userId,
  category,
  subcategoryLabel,
  existingCover,
  onClose,
  onSaved
}) {
  const [step, setStep] = React.useState("photo"); // photo | description
  const [photoSource, setPhotoSource] = React.useState("suggested"); // suggested | upload
  const [tempPhotoUrl, setTempPhotoUrl] = React.useState(String(existingCover?.photo_url || ""));
  const [description, setDescription] = React.useState(String(existingCover?.description || ""));
  const [uploading, setUploading] = React.useState(false);
  const [cropOpen, setCropOpen] = React.useState(false);
  const [cropFile, setCropFile] = React.useState(null);

  const categoryId = String(category?.id || "").trim();
  const label = String(subcategoryLabel || "").trim();

  const photoSuggestions = React.useMemo(() => {
    const byLabel = IMAGE_SUGGESTIONS[label] || [];
    const byCategory = IMAGE_SUGGESTIONS[categoryId] || [];
    const combined = uniq([...byLabel, ...byCategory]);
    return combined.length
      ? combined.slice(0, 18)
      : [
          "https://images.unsplash.com/photo-1516961642265-531546e84af2?w=400&q=80",
          "https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400&q=80",
          "https://images.unsplash.com/photo-1529333166437-7750a6dd5a70?w=400&q=80"
        ];
  }, [categoryId, label]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { e.target.value = ""; } catch {}
    setCropFile(file);
    setCropOpen(true);
  };

  const handlePickSuggestion = (url) => {
    setPhotoSource("suggested");
    setTempPhotoUrl(url);
    setStep("description");
  };

  const handleSave = async () => {
    const uid = String(userId || "").trim();
    if (!uid || !categoryId || !label) return;
    const photoUrl = toSafeText(tempPhotoUrl);
    if (!photoUrl) return;

    setUploading(true);
    try {
      const previousSource = String(existingCover?.photo_source || "").trim();
      const nextSource = photoSource;

      if (photoSource === "upload" && previousSource !== "upload") {
        // Award +5 coins once per subcategory cover when user switches to an uploaded photo.
        try {
          const me = await mc.auth.me();
          await mc.auth.updateMe({ coins: (me.coins || 0) + 5 }).catch(() => {});
          window.dispatchEvent(new Event("coins-updated"));
        } catch {
          // ignore
        }
      }

      if (existingCover?.id) {
        await mc.entities.Interest.update(existingCover.id, {
          photo_url: photoUrl,
          description,
          is_subcategory_cover: true,
          photo_source: nextSource
        });
      } else {
        await mc.entities.Interest.create({
          user_id: uid,
          category: categoryId,
          subcategory: label,
          title: label,
          photo_url: photoUrl,
          description,
          is_subcategory_cover: true,
          photo_source: nextSource,
          sort_index: -999
        });
      }

      if (typeof onSaved === "function") await onSaved();
      if (typeof onClose === "function") onClose();
    } catch (err) {
      console.error(err);
      alert("Save failed. Please try again.");
    }
    setUploading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl border border-gray-100 dark:border-gray-800 relative"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
          </button>

          {step === "photo" && (
            <div className="space-y-7 text-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{label}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Add a photo for this fixed subcategory.</p>
              </div>

              <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-800">
                <button
                  type="button"
                  onClick={() => setPhotoSource("suggested")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    photoSource === "suggested"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Suggested photos
                </button>
                <button
                  type="button"
                  onClick={() => setPhotoSource("upload")}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    photoSource === "upload"
                      ? "bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm"
                      : "text-gray-600 dark:text-gray-300"
                  }`}
                >
                  Upload my photo
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-[320px] overflow-y-auto p-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="subcat-cover-upload"
                  disabled={uploading}
                />

                {photoSource === "upload" ? (
                  <label
                    htmlFor="subcat-cover-upload"
                    className="col-span-2 md:col-span-3 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group relative overflow-hidden py-10"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                    ) : (
                      <>
                        <Camera className="w-10 h-10 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upload your photo</span>
                        <span className="text-xs text-gray-500 mt-1">Get +5 coins for a custom photo</span>
                      </>
                    )}
                  </label>
                ) : (
                  <>
                    {photoSuggestions.map((url, idx) => (
                      <motion.button
                        key={url}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.04 }}
                        onClick={() => handlePickSuggestion(url)}
                        className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent hover:border-indigo-500 hover:scale-[1.02] transition-all relative group"
                      >
                        <img src={url} alt="suggestion" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </motion.button>
                    ))}
                    <label
                      htmlFor="subcat-cover-upload"
                      className="aspect-square rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-500 bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center cursor-pointer transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group relative overflow-hidden"
                    >
                      {uploading ? (
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 text-gray-400 group-hover:text-indigo-500 mb-2 transition-colors" />
                          <span className="text-xs font-medium text-gray-500 group-hover:text-indigo-500 text-center px-2">
                            Upload my photo (+5)
                          </span>
                        </>
                      )}
                    </label>
                  </>
                )}
              </div>
            </div>
          )}

          {step === "description" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto rounded-full overflow-hidden mb-4 border-2 border-indigo-200">
                  <img src={tempPhotoUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Add meaning</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">What does this subcategory mean to you?</p>
              </div>

              <Textarea
                placeholder="A short description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="min-h-[110px] text-lg"
                autoFocus
              />

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("photo")} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={uploading || !toSafeText(tempPhotoUrl)}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600 text-white"
                >
                  {uploading ? "Saving..." : "Done"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>

      <ImageCropModal
        open={cropOpen}
        file={cropFile}
        title="Center your photo"
        onCancel={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onConfirm={async (croppedFile) => {
          if (!croppedFile) return;
          setUploading(true);
          setPhotoSource("upload");
          try {
            const { file_url } = await mc.integrations.Core.UploadFile({ file: croppedFile });
            setTempPhotoUrl(file_url);
            setStep("description");
          } catch (err) {
            console.error(err);
            alert("Upload failed. Please try again.");
          }
          setUploading(false);
          setCropOpen(false);
          setCropFile(null);
        }}
      />
    </AnimatePresence>
  );
}
