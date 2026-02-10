import React from "react";
import { motion } from "framer-motion";
import { CATEGORIES_LIST } from "@/components/utils/matchingUtils";

function hexToRgba(hex, alpha) {
  const h = String(hex || "").replace("#", "").trim();
  if (h.length !== 6) return `rgba(99, 102, 241, ${alpha})`; // indigo-ish fallback
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getCategoryMeta(categoryId) {
  const id = String(categoryId || "");
  return CATEGORIES_LIST.find((c) => c.id === id) || null;
}

export default function SubcategoryOrbit({
  categoryId,
  categoryLabel,
  subcats,
  getCount,
  onPick,
  layoutIdPrefix = "subcat",
}) {
  const meta = getCategoryMeta(categoryId);
  const color = meta?.color || "#6366F1";

  const nodes = (Array.isArray(subcats) ? subcats : []).slice(0, 5);
  const angleStartDeg = -90;
  const stepDeg = nodes.length ? 360 / nodes.length : 72;

  return (
    <div className="w-full flex items-center justify-center">
      <div className="relative w-full max-w-[560px] aspect-square">
        {/* Orbit rings */}
        <div className="absolute inset-0 rounded-full border border-black/5" />
        <div className="absolute inset-[10%] rounded-full border border-black/5" />
        <div className="absolute inset-[20%] rounded-full border border-black/5" />

        {/* Center "planet" */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div
            className="rounded-full border border-white shadow-2xl flex items-center justify-center text-center px-4"
            style={{
              width: "clamp(132px, 34vw, 190px)",
              height: "clamp(132px, 34vw, 190px)",
              background: `radial-gradient(circle at 30% 30%, ${hexToRgba(color, 0.35)}, rgba(255,255,255,0.95) 55%)`,
              boxShadow: `0 30px 70px ${hexToRgba(color, 0.28)}, 0 16px 40px rgba(0,0,0,0.15)`,
            }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-widest text-black/55">Level 2</div>
              <div className="mt-1 text-sm sm:text-base font-extrabold text-black/85 leading-tight">
                {categoryLabel}
              </div>
              <div className="mt-2 text-xs text-black/55">Pick a circle</div>
            </div>
          </div>
        </div>

        {/* Orbiting subcategories */}
        {nodes.map((label, idx) => {
          const angle = (angleStartDeg + idx * stepDeg) * (Math.PI / 180);
          const radiusPct = 37; // visually nice across sizes
          const x = 50 + radiusPct * Math.cos(angle);
          const y = 50 + radiusPct * Math.sin(angle);
          const count = typeof getCount === "function" ? Number(getCount(label) || 0) : 0;
          const layoutId = `${layoutIdPrefix}:${categoryId}:${label}`;

          return (
            <motion.button
              key={label}
              type="button"
              layoutId={layoutId}
              onClick={(e) => onPick?.(label, e)}
              whileHover={{ scale: 1.06 }}
              whileTap={{ scale: 0.98 }}
              className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 shadow-xl text-left focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                width: "clamp(82px, 20vw, 112px)",
                height: "clamp(82px, 20vw, 112px)",
                background: `radial-gradient(circle at 30% 25%, rgba(255,255,255,0.98), ${hexToRgba(color, 0.22)} 60%, rgba(0,0,0,0.02) 100%)`,
                boxShadow: `0 24px 60px ${hexToRgba(color, 0.22)}, 0 10px 24px rgba(0,0,0,0.16)`,
              }}
              aria-label={label}
            >
              <div className="w-full h-full flex flex-col items-center justify-center px-3">
                <div className="text-[12px] font-extrabold text-black/80 leading-tight line-clamp-2 text-center">
                  {label}
                </div>
                <div className="mt-2 text-[11px] font-semibold text-black/55">
                  {count} items
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
