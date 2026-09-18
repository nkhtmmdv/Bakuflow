"use client";

import { useState, useTransition } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { nodeName } from "@/components/features/NodeSelect";
import { createFavorite } from "@/lib/actions/favorites";
import type { CrowdColor } from "@/lib/crowd/score";
import type { TransportNode } from "@/types/database";

export interface TripCardLeg {
  fromNode: TransportNode;
  toNode: TransportNode;
  routeType: string;
  minutes: number;
}

export interface TripCardData {
  label: "fastest" | "lessCrowded" | "alternative";
  recommended: boolean;
  legs: TripCardLeg[];
  estimatedMinutesRange: [number, number];
  transfers: number;
  walkingMinutes: number;
  suggestedDeparture: string | null;
  worstCrowdLevel: CrowdColor;
}

const LABEL_KEY: Record<TripCardData["label"], string> = {
  fastest: "trip.fastest",
  lessCrowded: "trip.lessCrowded",
  alternative: "trip.alternative",
};

export function TripCard({
  trip,
  isAuthenticated,
}: {
  trip: TripCardData;
  isAuthenticated: boolean;
}) {
  const { t, locale } = useI18n();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const origin = trip.legs[0]?.fromNode;
  const destination = trip.legs[trip.legs.length - 1]?.toNode;

  function handleSave() {
    if (!origin || !destination) return;
    const formData = new FormData();
    formData.set("title", `${nodeName(origin, locale)} → ${nodeName(destination, locale)}`);
    formData.set("originNodeId", origin.id);
    formData.set("destinationNodeId", destination.id);
    startTransition(async () => {
      const result = await createFavorite(formData);
      if (!result.error) setSaved(true);
    });
  }

  return (
    <article className="flex flex-col gap-3 rounded-2xl border border-zinc-200 p-4 shadow-sm dark:border-zinc-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          {t(LABEL_KEY[trip.label])}
        </span>
        {trip.recommended && (
          <span className="rounded-full bg-emerald-700 px-2.5 py-1 text-xs font-bold text-white">
            {t("trip.recommended")}
          </span>
        )}
      </div>

      {origin && destination && (
        <p className="font-medium">
          {nodeName(origin, locale)} → {nodeName(destination, locale)}
        </p>
      )}

      <p className="text-2xl font-bold">
        {t("trip.approxDuration", {
          min: trip.estimatedMinutesRange[0],
          max: trip.estimatedMinutesRange[1],
        })}
      </p>

      <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
        <CrowdBadge level={trip.worstCrowdLevel} />
        <span>
          {trip.transfers === 0 ? t("trip.transfersNone") : t("trip.transfersCount", { count: trip.transfers })}
        </span>
        {trip.walkingMinutes > 0 && (
          <span>{t("trip.walking", { minutes: Math.round(trip.walkingMinutes) })}</span>
        )}
      </div>

      {trip.suggestedDeparture && (
        <p className="text-sm text-zinc-500">
          {t("trip.departBy", {
            time: new Date(trip.suggestedDeparture).toLocaleTimeString(locale === "ru" ? "ru-RU" : "az-AZ", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })}
        </p>
      )}

      {isAuthenticated && (
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || saved}
          className="min-h-[44px] self-start rounded-xl border border-emerald-700 px-4 text-sm font-medium text-emerald-800 disabled:opacity-50 dark:text-emerald-400"
        >
          {saved ? "✓" : t("trip.saveFavorite")}
        </button>
      )}
    </article>
  );
}
