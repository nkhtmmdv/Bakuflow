"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability/offline shell is a progressive enhancement, not
        // required for the app to function.
      });
    }
  }, []);

  return null;
}
