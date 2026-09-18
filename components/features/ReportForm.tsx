"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/provider";
import { NodeSelect } from "@/components/features/NodeSelect";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import type { CrowdColor, Confidence } from "@/lib/crowd/score";
import type { CrowdLevel, TransportNode } from "@/types/database";

const LEVELS: { level: CrowdLevel; icon: string; key: string }[] = [
  { level: 0, icon: "🟢", key: "report.levelLow" },
  { level: 1, icon: "🟡", key: "report.levelMedium" },
  { level: 2, icon: "🔴", key: "report.levelHigh" },
];

interface SubmitResult {
  crowdLevel: CrowdColor;
  reportCount: number;
  confidence: Confidence;
}

export function ReportForm({
  nodes,
  initialNodeId,
  isAuthenticated,
}: {
  nodes: TransportNode[];
  initialNodeId?: string;
  isAuthenticated: boolean;
}) {
  const { t, locale } = useI18n();
  const [nodeId, setNodeId] = useState(initialNodeId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  void locale;

  async function submitLevel(level: CrowdLevel) {
    if (!nodeId || submitting) return;
    setSubmitting(true);
    setError(null);
    setResult(null);

    const coords = await new Promise<{ latitude: number; longitude: number } | null>((resolve) => {
      if (!("geolocation" in navigator)) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {
          setLocationDenied(true);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
      );
    });

    try {
      const res = await fetch("/api/crowd-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeId, level, coords }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error === "rate_limited" ? "rateLimited" : "generic");
        return;
      }

      setResult(json.aggregate);
    } catch {
      setError("generic");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <NodeSelect
        label={t("report.whereAreYou")}
        placeholder={t("report.selectNode")}
        nodes={nodes}
        value={nodeId}
        onChange={(id) => {
          setNodeId(id);
          setResult(null);
          setError(null);
        }}
        required
      />

      <p className="rounded-xl bg-zinc-100 p-3 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        {t("report.locationNotice")}
      </p>

      {!isAuthenticated ? (
        <p role="alert" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
          {t("report.signInRequired")}
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {t("report.howIsIt")}
            </span>
            <div className="grid grid-cols-1 gap-2">
              {LEVELS.map(({ level, icon, key }) => (
                <button
                  key={level}
                  type="button"
                  disabled={!nodeId || submitting}
                  onClick={() => submitLevel(level)}
                  className="flex min-h-[56px] items-center gap-3 rounded-xl border border-zinc-300 px-4 text-base font-medium disabled:opacity-40 dark:border-zinc-700"
                >
                  <span aria-hidden="true" className="text-2xl">
                    {icon}
                  </span>
                  {t(key)}
                </button>
              ))}
            </div>
          </div>

          {locationDenied && (
            <p className="text-xs text-zinc-500">{t("report.locationDenied")}</p>
          )}

          {error === "rateLimited" && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t("report.rateLimited")}
            </p>
          )}
          {error === "generic" && (
            <p role="alert" className="text-sm text-red-700 dark:text-red-400">
              {t("common.error")}
            </p>
          )}

          {result && (
            <div className="flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950">
              <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                {t("report.thankYou")} {t("report.updated")}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm">{t("report.currentStatus")}</span>
                <CrowdBadge level={result.crowdLevel} />
              </div>
              <p className="text-xs text-zinc-500">{t(`confidence.${result.confidence}`)}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
