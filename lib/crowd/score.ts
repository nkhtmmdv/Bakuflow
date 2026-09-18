import type { CrowdLevel } from "@/types/database";

export type CrowdColor = "green" | "yellow" | "red" | "unknown";
export type Confidence = "unknown" | "low" | "medium" | "high";

/** A single crowd report reduced to exactly what the scoring algorithm needs. */
export interface CrowdReportInput {
  level: CrowdLevel;
  createdAt: Date | string;
  verifiedNearNode: boolean;
  trustScore: number;
}

export interface CrowdAggregateResult {
  crowdLevel: CrowdColor;
  crowdScore: number | null;
  reportCount: number;
  confidence: Confidence;
  lastReportAt: Date | null;
}

export const CROWD_WINDOW_MINUTES = 15;

const GREEN_UPPER_BOUND = 0.66;
const YELLOW_UPPER_BOUND = 1.36;

/**
 * How much a report's age discounts its weight. Mirrors the same buckets in
 * the `get_node_crowd_aggregates` SQL function (0008_admin_analytics.sql /
 * 0005_crowd_reports.sql) — keep both in sync if these change.
 */
export function recencyWeight(ageMinutes: number): number {
  if (ageMinutes < 0) return 1.0;
  if (ageMinutes <= 3) return 1.0;
  if (ageMinutes <= 6) return 0.8;
  if (ageMinutes <= 10) return 0.6;
  if (ageMinutes <= CROWD_WINDOW_MINUTES) return 0.3;
  return 0;
}

export function locationVerificationWeight(verifiedNearNode: boolean): number {
  return verifiedNearNode ? 1.0 : 0.5;
}

export function effectiveWeight(report: CrowdReportInput, now: Date = new Date()): number {
  const ageMinutes = (now.getTime() - new Date(report.createdAt).getTime()) / 60_000;
  return (
    recencyWeight(ageMinutes) *
    report.trustScore *
    locationVerificationWeight(report.verifiedNearNode)
  );
}

export function crowdLevelFromScore(score: number | null): CrowdColor {
  if (score === null) return "unknown";
  if (score < GREEN_UPPER_BOUND) return "green";
  if (score < YELLOW_UPPER_BOUND) return "yellow";
  return "red";
}

export function confidenceFromCount(reportCount: number): Confidence {
  if (reportCount <= 0) return "unknown";
  if (reportCount <= 2) return "low";
  if (reportCount <= 7) return "medium";
  return "high";
}

/**
 * Aggregates recent crowd reports for a single node into the score/level/
 * confidence the UI displays. Reports older than CROWD_WINDOW_MINUTES are
 * ignored, matching the spec's "reports older than 15 minutes stop
 * influencing crowd status" requirement.
 */
export function aggregateCrowdReports(
  reports: CrowdReportInput[],
  now: Date = new Date(),
): CrowdAggregateResult {
  const recent = reports.filter((r) => {
    const ageMinutes = (now.getTime() - new Date(r.createdAt).getTime()) / 60_000;
    return ageMinutes >= 0 && ageMinutes <= CROWD_WINDOW_MINUTES;
  });

  if (recent.length === 0) {
    return {
      crowdLevel: "unknown",
      crowdScore: null,
      reportCount: 0,
      confidence: "unknown",
      lastReportAt: null,
    };
  }

  let weightedLevelSum = 0;
  let weightSum = 0;
  let lastReportAt = new Date(recent[0].createdAt);

  for (const report of recent) {
    const weight = effectiveWeight(report, now);
    weightedLevelSum += report.level * weight;
    weightSum += weight;
    const createdAt = new Date(report.createdAt);
    if (createdAt > lastReportAt) lastReportAt = createdAt;
  }

  const crowdScore = weightSum > 0 ? weightedLevelSum / weightSum : null;

  return {
    crowdLevel: crowdLevelFromScore(crowdScore),
    crowdScore,
    reportCount: recent.length,
    confidence: confidenceFromCount(recent.length),
    lastReportAt,
  };
}
