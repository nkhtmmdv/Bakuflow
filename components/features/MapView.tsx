"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Map as MapLibreMap, Marker, NavigationControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useI18n } from "@/lib/i18n/provider";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { nodeName } from "@/components/features/NodeSelect";
import { formatMinutesAgo } from "@/lib/format/relativeTime";
import type { CrowdColor, Confidence } from "@/lib/crowd/score";
import type { TransportNode } from "@/types/database";

const MAP_STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/liberty";

const MARKER_COLOR: Record<CrowdColor, string> = {
  green: "#059669",
  yellow: "#d97706",
  red: "#dc2626",
  unknown: "#9ca3af",
};

export interface MapNodeItem {
  node: TransportNode;
  crowdLevel: CrowdColor;
  reportCount: number;
  confidence: Confidence;
  lastReportAt: string | null;
}

export function MapView({ items }: { items: MapNodeItem[] }) {
  const { t, locale } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const markersRef = useRef<Marker[]>([]);
  const [selected, setSelected] = useState<MapNodeItem | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapLibreMap({
      container: containerRef.current,
      style: MAP_STYLE_URL,
      center: [49.8671, 40.4093], // Baku
      zoom: 11,
    });
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = items.map((item) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", nodeName(item.node, locale));
      el.style.width = "18px";
      el.style.height = "18px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2)";
      el.style.backgroundColor = MARKER_COLOR[item.crowdLevel];
      el.style.cursor = "pointer";
      el.addEventListener("click", () => setSelected(item));

      return new Marker({ element: el })
        .setLngLat([item.node.longitude, item.node.latitude])
        .addTo(map);
    });

    return () => {
      markersRef.current.forEach((m) => m.remove());
    };
  }, [items, locale]);

  return (
    <div className="relative h-[60vh] w-full overflow-hidden rounded-xl">
      <div ref={containerRef} className="h-full w-full" />

      {selected && (
        <div className="absolute inset-x-2 bottom-2 flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <button
            type="button"
            onClick={() => setSelected(null)}
            aria-label={t("common.back")}
            className="absolute right-2 top-2 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            ✕
          </button>
          <p className="pr-6 font-semibold">{nodeName(selected.node, locale)}</p>
          <div className="flex items-center gap-2">
            <CrowdBadge level={selected.crowdLevel} />
            <span className="text-xs text-zinc-500">
              {t("live.reportsCount", { count: selected.reportCount })}
            </span>
          </div>
          {selected.lastReportAt && (
            <p className="text-xs text-zinc-500">
              {t("live.updatedAgo", {
                time: `${formatMinutesAgo(new Date(selected.lastReportAt))} ${t("common.minutes")}`,
              })}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <Link
              href={`/report?node=${selected.node.id}`}
              className="min-h-[44px] flex-1 rounded-xl bg-emerald-700 px-3 py-2 text-center text-sm font-medium text-white"
            >
              {t("map.reportHere")}
            </Link>
            <Link
              href={`/?origin=${selected.node.id}`}
              className="min-h-[44px] flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-center text-sm font-medium dark:border-zinc-700"
            >
              {t("map.goFromHere")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
