"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/provider";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { EmptyState } from "@/components/ui/States";
import { nodeName } from "@/components/features/NodeSelect";
import { formatMinutesAgo } from "@/lib/format/relativeTime";
import type { CrowdColor } from "@/lib/crowd/score";
import type { TransportNode } from "@/types/database";

export interface CityNowItem {
  node: TransportNode;
  crowdLevel: CrowdColor;
  reportCount: number;
  lastReportAt: string | null;
}

export function CityNowSnapshot({ items }: { items: CityNowItem[] }) {
  const { t, locale } = useI18n();

  if (items.length === 0) {
    return <EmptyState message={t("home.cityNowEmpty")} />;
  }

  return (
    <ul className="flex flex-col divide-y divide-zinc-200 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {items.map((item) => (
        <li key={item.node.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="flex flex-col">
            <Link href={`/live#${item.node.slug}`} className="font-medium hover:underline">
              {nodeName(item.node, locale)}
            </Link>
            {item.lastReportAt && (
              <span className="text-xs text-zinc-500">
                {t("live.updatedAgo", {
                  time: `${formatMinutesAgo(new Date(item.lastReportAt))} ${t("common.minutes")}`,
                })}
              </span>
            )}
          </div>
          <CrowdBadge level={item.crowdLevel} />
        </li>
      ))}
    </ul>
  );
}
