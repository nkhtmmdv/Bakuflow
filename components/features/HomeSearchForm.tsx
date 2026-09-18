"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/provider";
import { NodeSelect } from "@/components/features/NodeSelect";
import { getOrCreateAnonymousSessionId } from "@/lib/anonymousSession";
import type { TransportNode } from "@/types/database";

export function HomeSearchForm({
  nodes,
  initialOriginId,
  initialDestinationId,
}: {
  nodes: TransportNode[];
  initialOriginId?: string;
  initialDestinationId?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [originId, setOriginId] = useState(initialOriginId ?? "");
  const [destinationId, setDestinationId] = useState(initialDestinationId ?? "");
  const [arrivalMode, setArrivalMode] = useState<"now" | "at">("now");
  const [arrivalTime, setArrivalTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!originId || !destinationId) {
      setError(t("common.error"));
      return;
    }
    if (originId === destinationId) {
      setError(t("common.error"));
      return;
    }
    setError(null);

    const params = new URLSearchParams({
      origin: originId,
      destination: destinationId,
      sid: getOrCreateAnonymousSessionId(),
    });

    if (arrivalMode === "at" && arrivalTime) {
      const [hours, minutes] = arrivalTime.split(":").map(Number);
      const arrival = new Date();
      arrival.setSeconds(0, 0);
      arrival.setHours(hours, minutes);
      if (arrival.getTime() < Date.now()) {
        arrival.setDate(arrival.getDate() + 1);
      }
      params.set("arrival", arrival.toISOString());
    }

    router.push(`/trip?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <NodeSelect
        label={t("home.origin")}
        placeholder={t("home.originPlaceholder")}
        nodes={nodes}
        value={originId}
        onChange={setOriginId}
        required
      />
      <NodeSelect
        label={t("home.destination")}
        placeholder={t("home.destinationPlaceholder")}
        nodes={nodes}
        value={destinationId}
        onChange={setDestinationId}
        required
      />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {t("home.arrival")}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setArrivalMode("now")}
            aria-pressed={arrivalMode === "now"}
            className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-medium ${
              arrivalMode === "now"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700"
            }`}
          >
            {t("home.arrivalNow")}
          </button>
          <button
            type="button"
            onClick={() => setArrivalMode("at")}
            aria-pressed={arrivalMode === "at"}
            className={`min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-medium ${
              arrivalMode === "at"
                ? "border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950"
                : "border-zinc-300 text-zinc-600 dark:border-zinc-700"
            }`}
          >
            {t("home.arrivalAt")}
          </button>
        </div>
        {arrivalMode === "at" && (
          <input
            type="time"
            value={arrivalTime}
            onChange={(e) => setArrivalTime(e.target.value)}
            aria-label={t("home.arrivalAt")}
            className="min-h-[48px] rounded-xl border border-zinc-300 bg-white px-3 text-base dark:border-zinc-700 dark:bg-zinc-900"
          />
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="min-h-[52px] rounded-xl bg-emerald-700 px-4 text-base font-semibold text-white hover:bg-emerald-800 active:bg-emerald-900"
      >
        {t("home.submit")}
      </button>
    </form>
  );
}
