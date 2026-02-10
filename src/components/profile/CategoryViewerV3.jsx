import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { CATEGORY_SUGGESTIONS as FIXED_SUBCATEGORIES } from "./categorySuggestionsData";

function getSortKey(interest) {
  const v = Number(interest?.sort_index);
  if (Number.isFinite(v)) return v;
  const ts = Date.parse(String(interest?.created_date || ""));
  if (Number.isFinite(ts)) return ts;
  return 0;
}

export default function CategoryViewerV3({ category, interests, onClose }) {
  const [view, setView] = React.useState("subcats"); // subcats | concepts
  const [selectedSubcat, setSelectedSubcat] = React.useState("");

  const subcats = FIXED_SUBCATEGORIES?.[category?.id] || [];

  const getItemsForSubcat = React.useCallback((label) => {
    const rows = Array.isArray(interests) ? interests : [];
    const sub = String(label || "").trim();
    if (!sub) return [];
    return rows
      .filter((i) => String(i?.category || "") === String(category?.id || ""))
      .filter((i) => String(i?.subcategory || "") === sub || (!i?.subcategory && String(i?.title || "") === sub))
      .sort((a, b) => getSortKey(a) - getSortKey(b));
  }, [category?.id, interests]);

  const selectedItems = view === "concepts" && selectedSubcat ? getItemsForSubcat(selectedSubcat) : [];

  return (
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
        <div className="flex justify-between items-center mb-6 gap-2">
          {view === "concepts" ? (
            <button
              onClick={() => {
                setView("subcats");
                setSelectedSubcat("");
              }}
              className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {subcats.map((label) => {
              const count = getItemsForSubcat(label).length;
              return (
                <button
                  key={label}
                  onClick={() => {
                    setSelectedSubcat(label);
                    setView("concepts");
                  }}
                  className="text-left rounded-2xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-lg transition-all p-4"
                >
                  <div className="text-base font-bold text-gray-900">{label}</div>
                  <div className="text-xs text-gray-600 mt-1">{count} items</div>
                </button>
              );
            })}
          </div>
        ) : (
          <motion.div layout className="flex gap-4 overflow-x-auto py-2 px-1">
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
                  <div className="w-[120px] h-[120px] rounded-full overflow-hidden border-4 border-white shadow-xl bg-gray-200 relative">
                    {item.photo_url ? (
                      <>
                        <img src={item.photo_url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">No photo</div>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-xs font-bold text-gray-900 line-clamp-2">{item.title}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

