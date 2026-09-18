"use client";

import { useT } from "@/lib/i18n/provider";
import type { CrowdColor } from "@/lib/crowd/score";

const STYLES: Record<CrowdColor, { icon: string; classes: string }> = {
  green: { icon: "🟢", classes: "bg-green-50 text-green-800 border-green-200" },
  yellow: { icon: "🟡", classes: "bg-amber-50 text-amber-800 border-amber-200" },
  red: { icon: "🔴", classes: "bg-red-50 text-red-800 border-red-200" },
  unknown: { icon: "⚪", classes: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

/**
 * Never relies on color alone: always pairs the color with an icon and a
 * text label, per the accessibility requirement (color-blind friendly).
 */
export function CrowdBadge({
  level,
  className = "",
}: {
  level: CrowdColor;
  className?: string;
}) {
  const t = useT();
  const { icon, classes } = STYLES[level];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-sm font-medium ${classes} ${className}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{t(`crowd.${level}`)}</span>
    </span>
  );
}
