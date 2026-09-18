"use client";

import { useSyncExternalStore } from "react";
import { useT } from "@/lib/i18n/provider";

function subscribe(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getSnapshot() {
  return !navigator.onLine;
}

function getServerSnapshot() {
  return false;
}

export function OfflineBanner() {
  const t = useT();
  const isOffline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isOffline) return null;

  return (
    <div
      role="status"
      className="bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
    >
      {t("common.offline")}
    </div>
  );
}
