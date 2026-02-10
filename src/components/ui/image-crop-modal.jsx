import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function fileToObjectUrl(file) {
  try {
    return URL.createObjectURL(file);
  } catch {
    return "";
  }
}

function toJpegFile(blob, filename = "photo.jpg") {
  return new File([blob], filename, { type: "image/jpeg" });
}

export default function ImageCropModal({
  open,
  file,
  title = "Adjust photo",
  onCancel,
  onConfirm,
  outputSize = 768,
}) {
  const isMobile = useIsMobile();
  const boxPx = isMobile ? 260 : 320;

  const [imgEl, setImgEl] = React.useState(null);
  const [imgUrl, setImgUrl] = React.useState("");

  const [zoom, setZoom] = React.useState(1.1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });

  const dragRef = React.useRef(null); // { startX, startY, startOffsetX, startOffsetY }

  React.useEffect(() => {
    if (!open || !file) return;
    const url = fileToObjectUrl(file);
    setImgUrl(url);
    return () => {
      try {
        if (url) URL.revokeObjectURL(url);
      } catch {
        // ignore
      }
    };
  }, [open, file]);

  React.useEffect(() => {
    if (!imgUrl) return;
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = imgUrl;
  }, [imgUrl]);

  React.useEffect(() => {
    // reset when opened
    if (!open) return;
    setZoom(1.1);
    setOffset({ x: 0, y: 0 });
  }, [open, imgUrl]);

  const baseScale = React.useMemo(() => {
    if (!imgEl) return 1;
    return Math.max(boxPx / imgEl.naturalWidth, boxPx / imgEl.naturalHeight);
  }, [imgEl, boxPx]);

  const displayScale = baseScale * zoom;

  const clampOffset = React.useCallback(
    (next) => {
      if (!imgEl) return next;
      const scaledW = imgEl.naturalWidth * displayScale;
      const scaledH = imgEl.naturalHeight * displayScale;
      const maxX = Math.max(0, (scaledW - boxPx) / 2);
      const maxY = Math.max(0, (scaledH - boxPx) / 2);
      return {
        x: clamp(next.x, -maxX, maxX),
        y: clamp(next.y, -maxY, maxY),
      };
    },
    [imgEl, displayScale, boxPx]
  );

  React.useEffect(() => {
    setOffset((prev) => clampOffset(prev));
  }, [zoom, imgEl]);

  const onPointerDown = (e) => {
    if (!imgEl) return;
    const p = { x: e.clientX, y: e.clientY };
    dragRef.current = { startX: p.x, startY: p.y, startOffsetX: offset.x, startOffsetY: offset.y };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const next = clampOffset({ x: dragRef.current.startOffsetX + dx, y: dragRef.current.startOffsetY + dy });
    setOffset(next);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const doConfirm = async () => {
    if (!imgEl || !file) return;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Map container crop (0..boxPx) to source image coords.
    const cx = boxPx / 2;
    const cy = boxPx / 2;
    const srcX = (0 - cx - offset.x) / displayScale + imgEl.naturalWidth / 2;
    const srcY = (0 - cy - offset.y) / displayScale + imgEl.naturalHeight / 2;
    const srcW = boxPx / displayScale;
    const srcH = boxPx / displayScale;

    // Clamp source rect.
    const safeW = Math.min(imgEl.naturalWidth, Math.max(1, srcW));
    const safeH = Math.min(imgEl.naturalHeight, Math.max(1, srcH));
    const safeX = clamp(srcX, 0, imgEl.naturalWidth - safeW);
    const safeY = clamp(srcY, 0, imgEl.naturalHeight - safeH);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, outputSize, outputSize);
    ctx.drawImage(imgEl, safeX, safeY, safeW, safeH, 0, 0, outputSize, outputSize);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const cropped = toJpegFile(blob, file.name?.replace(/\.[^.]+$/, "") + "_crop.jpg");
    if (typeof onConfirm === "function") await onConfirm(cropped);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[80] flex items-center justify-center p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 220, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-7 max-w-lg w-full shadow-2xl border border-white/10 relative"
          >
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-700 dark:text-gray-200" />
            </button>

            <div className="text-center">
              <div className="text-xl font-extrabold text-gray-900 dark:text-white">{title}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Drag to center, use the slider to zoom.</div>
            </div>

            <div className="mt-5 flex items-center justify-center">
              <div
                className="relative rounded-2xl overflow-hidden bg-black select-none touch-none"
                style={{ width: boxPx, height: boxPx }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
              >
                {imgUrl && (
                  <img
                    src={imgUrl}
                    alt=""
                    draggable={false}
                    className="absolute left-1/2 top-1/2 will-change-transform"
                    style={{
                      transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${displayScale})`,
                      transformOrigin: "center center",
                      userSelect: "none",
                      pointerEvents: "none",
                      maxWidth: "none",
                      maxHeight: "none",
                    }}
                  />
                )}

                {/* Circle preview mask */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black/35" />
                  <div
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]"
                    style={{ width: Math.round(boxPx * 0.78), height: Math.round(boxPx * 0.78) }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between text-sm font-semibold text-gray-700 dark:text-gray-200">
                <span>Zoom</span>
                <span className="tabular-nums">{zoom.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.01"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="outline" onClick={onCancel} className="flex-1">
                Cancel
              </Button>
              <Button onClick={doConfirm} className="flex-1 bg-gradient-to-r from-indigo-600 to-fuchsia-600">
                Use photo
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

