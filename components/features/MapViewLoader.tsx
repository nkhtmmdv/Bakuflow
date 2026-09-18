"use client";

import dynamic from "next/dynamic";
import { T } from "@/components/i18n/T";
import type { MapNodeItem } from "@/components/features/MapView";

// MapLibre touches `window` at import time, so it must never be part of the
// server bundle or the SSR pass — this is the one client-only boundary in
// the app, isolated to /map so the rest of the app is unaffected if it fails.
const MapView = dynamic(() => import("@/components/features/MapView").then((m) => m.MapView), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] w-full items-center justify-center rounded-xl bg-zinc-100 text-sm text-zinc-500 dark:bg-zinc-900">
      <T k="common.loading" />
    </div>
  ),
});

export function MapViewLoader({ items }: { items: MapNodeItem[] }) {
  return <MapView items={items} />;
}
