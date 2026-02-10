import React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { CATEGORY_SUGGESTIONS as FIXED_SUBCATEGORIES } from "./categorySuggestionsData";
import SubcategoryOrbit from "./SubcategoryOrbit";

function getSortKey(interest) {
  const v = Number(interest?.sort_index);
  if (Number.isFinite(v)) return v;
  const ts = Date.parse(String(interest?.created_date || ""));
  if (Number.isFinite(ts)) return ts;
  return 0;
}

function portal(node) {
  if (typeof document === "undefined") return node;
  return createPortal(node, document.body);
}

export default function CategoryViewerV3({ category, interests, onClose }) {
  const [view, setView] = React.useState("subcats"); // subcats | concepts
  const [selectedSubcat, setSelectedSubcat] = React.useState("");
  const modalRef = React.useRef(null);
  const [warpFx, setWarpFx] = React.useState(null);

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

  const openSubcat = (label, e) => {
    try {
      const rect = modalRef.current?.getBoundingClientRect?.();
      if (rect && e?.clientX != null && e?.clientY != null) {
        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
        const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
        const key = `${Date.now()}:${Math.random().toString(16).slice(2)}`;
        setWarpFx({ x, y, key });
        window.setTimeout(() => setWarpFx(null), 650);
      }
    } catch {
      // ignore
    }
    setSelectedSubcat(label);
    setView("concepts");
  };

  return portal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-[200] flex items-center justify-center p-4"
      onClick={onClose}
    >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 12 }}
          onClick={(e) => e.stopPropagation()}
          ref={modalRef}
          className="bg-white rounded-3xl p-6 md:p-8 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto relative"
        >
          <AnimatePresence initial={false}>
            {warpFx && (
              <motion.div
                key={warpFx.key}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
              >
                <motion.div
                  initial={{ scale: 0.35, opacity: 0.8 }}
                  animate={{ scale: 1.85, opacity: 0 }}
                  transition={{ duration: 0.65, ease: [0.2, 0.8, 0.2, 1] }}
                  className="absolute inset-0"
                  style={{
                    background: `radial-gradient(240px circle at ${warpFx.x}px ${warpFx.y}px, rgba(99,102,241,0.28), rgba(99,102,241,0.14) 35%, rgba(255,255,255,0) 70%)`,
                    transformOrigin: `${warpFx.x}px ${warpFx.y}px`,
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
              <div className="mt-2 flex items-center justify-center gap-2">
                <motion.div
                  layoutId={`subcat:${category?.id || ""}:${selectedSubcat}`}
                  className="w-10 h-10 rounded-full border border-white shadow-lg"
                  style={{
                    background:
                      "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.98), rgba(99,102,241,0.18) 60%, rgba(0,0,0,0.02) 100%)",
                  }}
                />
                <div className="text-sm font-semibold text-gray-700">{selectedSubcat}</div>
              </div>
            )}
          </div>

          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <LayoutGroup id={`cat-v3:${category?.id || "unknown"}:viewer`}>
          <AnimatePresence initial={false} mode="popLayout">
            {view === "subcats" ? (
              <motion.div
                key="subcats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-100 p-4">
                  <p className="text-sm font-semibold text-gray-900">Subcategories</p>
                  <p className="text-xs text-gray-600 mt-1">Tap a “planet” to see what’s inside.</p>
                </div>

                <SubcategoryOrbit
                  categoryId={category?.id}
                  categoryLabel={category?.label}
                  subcats={subcats}
                  getCount={(label) => getItemsForSubcat(label).length}
                  onPick={(label, e) => openSubcat(label, e)}
                  layoutIdPrefix="subcat"
                />
              </motion.div>
            ) : (
              <motion.div
                key="concepts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </LayoutGroup>
      </motion.div>
    </motion.div>
  );
}
