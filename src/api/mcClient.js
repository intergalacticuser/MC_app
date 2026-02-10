import { mc as localMc } from "@/api/localMcClient";
import { mc as remoteMc } from "@/api/remoteMcClient";

function isLoopbackHost() {
  if (typeof window === "undefined") return true;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function getBackendMode() {
  const forced = String(import.meta.env?.VITE_BACKEND_MODE || "").trim().toLowerCase();
  if (forced === "local" || forced === "remote") return forced;
  return isLoopbackHost() ? "local" : "remote";
}

export const mc = getBackendMode() === "remote" ? remoteMc : localMc;

