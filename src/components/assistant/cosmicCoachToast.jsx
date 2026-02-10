import React from "react";
import { toast } from "@/components/ui/use-toast";
import { isCoachDismissed } from "@/lib/coachDismissals";

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

  const coachUserId = arguments?.[0]?.coach_user_id ?? arguments?.[0]?.coachUserId ?? "";
  const coachDismissKey = arguments?.[0]?.coach_dismiss_key ?? arguments?.[0]?.coachDismissKey ?? "";
  if (coachUserId && coachDismissKey && isCoachDismissed(coachUserId, coachDismissKey)) {
    return;
  }

  const t = toast({
    title,
    description: <div className="leading-snug">{safeText}</div>,
    className:
      "rounded-2xl border border-white/20 bg-gradient-to-br from-slate-950/95 via-indigo-950/85 to-fuchsia-950/80 text-white shadow-2xl backdrop-blur-md",
    coach_user_id: coachUserId || undefined,
    coach_dismiss_key: coachDismissKey || undefined
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
