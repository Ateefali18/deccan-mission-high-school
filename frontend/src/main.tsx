import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

export const APP_BUILD_VERSION = "v2.5.0-2026.11.14";

// Phase 1: Self-healing browser cache & service worker cleanup for Google Chrome & Edge
if (typeof window !== "undefined") {
  // 1. Unregister any obsolete service workers to prevent serving stale JS bundles
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().then((unregistered) => {
          if (unregistered) {
            console.info("[DMHS Cache] Obsolete service worker unregistered successfully.");
          }
        });
      }
    }).catch(() => {});
  }

  // 2. Clear outdated browser CacheStorage
  if ("caches" in window) {
    caches.keys().then((keys) => {
      for (const key of keys) {
        caches.delete(key);
      }
    }).catch(() => {});
  }

  // 3. Detect version upgrade and prune stale localStorage mock caches
  try {
    const currentStoredVer = localStorage.getItem("dmhs_app_build_version");
    if (currentStoredVer && currentStoredVer !== APP_BUILD_VERSION) {
      console.info(`[DMHS Sync] Upgrading from ${currentStoredVer} to ${APP_BUILD_VERSION}. Cleared stale client caches.`);
      // Purge old mock lists so live Supabase records take precedence
      localStorage.removeItem("dmhs_custom_students");
      localStorage.removeItem("dmhs_custom_teachers");
      localStorage.removeItem("dmhs_custom_classes");
    }
    localStorage.setItem("dmhs_app_build_version", APP_BUILD_VERSION);
  } catch {}

  console.info(`[DMHS ERP] Running version ${APP_BUILD_VERSION} — Single Source of Truth: Supabase.`);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
