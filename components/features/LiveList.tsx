"use client";

import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { createClient } from "@/lib/supabase/client";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { nodeName } from "@/components/features/NodeSelect";
import { formatMinutesAgo } from "@/lib/format/relativeTime";
import { haversineDistanceMeters } from "@/lib/crowd/distance";
import type { CrowdColor, Confidence } from "@/lib/crowd/score";
import type { NodeType, TransportNode } from "@/types/database";

export interface LiveItem {
  node: TransportNode;
  crowdLevel: CrowdColor;
  crowdScore: number | null;
  reportCount: number;
  confidence: Confidence;
  lastReportAt: string | null;
}

type Filter = "all" | "metro" | "bus" | "hub";
type Sort = "crowded" | "nearest" | "recent";

const FILTER_TYPE: Record<Exclude<Filter, "all">, NodeType> = {
  metro: "metro",
  bus: "bus_stop",
  hub: "transport_hub",
};

export function LiveList({ initialItems }: { initialItems: LiveItem[] }) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState<Filter>("all");
  const [sort, setSort] = useState<Sort>("crowded");
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  // Lazy-initialized once from the server-rendered snapshot; subsequent
  // updates come only from the Realtime subscription below (a fresh
  // navigation to /live remounts this component with a new snapshot anyway).
  const [live, setLive] = useState<Map<string, LiveItem>>(
    () => new Map(initialItems.map((item) => [item.node.id, item])),
  );

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("live-node-crowd-status")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "node_crowd_status" },
        (payload) => {
          const row = (payload.new ?? payload.old) as {
            node_id: string;
            crowd_score: number | null;
            crowd_level: CrowdColor;
            report_count: number;
            confidence: Confidence;
            last_report_at: string | null;
          };
          setLive((prev) => {
            const existing = prev.get(row.node_id);
            if (!existing) return prev; // node not in our currently loaded set
            const next = new Map(prev);
            next.set(row.node_id, {
              ...existing,
              crowdLevel: row.crowd_level,
              crowdScore: row.crowd_score,
              reportCount: row.report_count,
              confidence: row.confidence,
              lastReportAt: row.last_report_at,
            });
            return next;
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setUserLocation(null),
    );
  }

  const items = useMemo(() => {
    let list = [...live.values()];

    if (filter !== "all") {
      list = list.filter((item) => item.node.type === FILTER_TYPE[filter]);
    }

    if (sort === "crowded") {
      list.sort((a, b) => (b.crowdScore ?? -1) - (a.crowdScore ?? -1));
    } else if (sort === "recent") {
      list.sort((a, b) => {
        const aTime = a.lastReportAt ? new Date(a.lastReportAt).getTime() : 0;
        const bTime = b.lastReportAt ? new Date(b.lastReportAt).getTime() : 0;
        return bTime - aTime;
      });
    } else if (sort === "nearest" && userLocation) {
      list.sort((a, b) => {
        const distA = haversineDistanceMeters(userLocation.lat, userLocation.lon, a.node.latitude, a.node.longitude);
        const distB = haversineDistanceMeters(userLocation.lat, userLocation.lon, b.node.latitude, b.node.longitude);
        return distA - distB;
      });
    }

    return list;
  }, [live, filter, sort, userLocation]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="filter">
        {(["all", "metro", "bus", "hub"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            aria-pressed={filter === f}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${
              filter === f
                ? "border-emerald-700 bg-emerald-50 text-emerald-800 dark:bg-emerald-950"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700"
            }`}
          >
            {t(`live.filter${f === "all" ? "All" : f === "metro" ? "Metro" : f === "bus" ? "Bus" : "Hub"}`)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="sort">
        {(["crowded", "nearest", "recent"] as Sort[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              if (s === "nearest" && !userLocation) requestLocation();
              setSort(s);
            }}
            aria-pressed={sort === s}
            className={`min-h-[40px] rounded-full border px-3 text-sm font-medium ${
              sort === s
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700"
            }`}
          >
            {t(`live.sort${s === "crowded" ? "Crowded" : s === "nearest" ? "Nearest" : "Recent"}`)}
          </button>
        ))}
      </div>
      {sort === "nearest" && !userLocation && (
        <p className="text-xs text-zinc-500">{t("live.locateDisabled")}</p>
      )}

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t("live.empty")}</p>
      ) : (
        <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {items.map((item) => (
            <li key={item.node.id} id={item.node.slug} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <span className="font-medium">{nodeName(item.node, locale)}</span>
                <CrowdBadge level={item.crowdLevel} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                <span>{t("live.reportsCount", { count: item.reportCount })}</span>
                <span>{t(`confidence.${item.confidence}`)}</span>
                {item.lastReportAt && (
                  <span>
                    {t("live.updatedAgo", {
                      time: `${formatMinutesAgo(new Date(item.lastReportAt))} ${t("common.minutes")}`,
                    })}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
