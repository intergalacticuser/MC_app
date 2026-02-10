import React from "react";
import { toast } from "@/components/ui/use-toast";

function cleanCoachText(value) {
  let text = String(value || "").trim();
  if (!text) return "";
  // Strip wrapping quotes some models add despite instructions.
  text = text.replace(/^[\s"'“”]+/, "").replace(/[\s"'“”]+$/, "").trim();
  // Collapse whitespace.
  text = text.replace(/\s+/g, " ").trim();
  return text;
}

export function cosmicCoachToast({ title = "MindCircle", text = "", ms = 45000 } = {}) {
  const safeText = cleanCoachText(text);
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
