import React from "react";
import { toast } from "@/components/ui/use-toast";

export function cosmicCoachToast({ title = "MindCircle", text = "", ms = 12000 } = {}) {
  const safeText = String(text || "").trim();
  if (!safeText) return;

  const t = toast({
    title,
    description: <div className="leading-snug">{safeText}</div>,
    className:
      "rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950/95 via-indigo-950/85 to-fuchsia-950/80 text-white shadow-2xl backdrop-blur-md"
  });

  // Our toast system doesn't have duration; dismiss manually.
  if (Number.isFinite(ms) && ms > 0) {
    window.setTimeout(() => {
      try {
        t.dismiss();
      } catch {
        // ignore
      }
    }, ms);
  }
}

