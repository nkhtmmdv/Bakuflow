import { describe, expect, it } from "vitest";
import {
  aggregateCrowdReports,
  confidenceFromCount,
  crowdLevelFromScore,
  effectiveWeight,
  locationVerificationWeight,
  recencyWeight,
  type CrowdReportInput,
} from "@/lib/crowd/score";

const NOW = new Date("2026-01-01T12:00:00Z");

function minutesAgo(minutes: number): Date {
  return new Date(NOW.getTime() - minutes * 60_000);
}

describe("recencyWeight", () => {
  it("weights very fresh reports at 1.0", () => {
    expect(recencyWeight(0)).toBe(1.0);
    expect(recencyWeight(3)).toBe(1.0);
  });

  it("steps down through the documented buckets", () => {
    expect(recencyWeight(4)).toBe(0.8);
    expect(recencyWeight(6)).toBe(0.8);
    expect(recencyWeight(7)).toBe(0.6);
    expect(recencyWeight(10)).toBe(0.6);
    expect(recencyWeight(11)).toBe(0.3);
    expect(recencyWeight(15)).toBe(0.3);
  });

  it("drops to zero past the 15 minute window", () => {
    expect(recencyWeight(15.01)).toBe(0);
    expect(recencyWeight(60)).toBe(0);
  });
});

describe("locationVerificationWeight", () => {
  it("halves the weight of unverified reports", () => {
    expect(locationVerificationWeight(true)).toBe(1.0);
    expect(locationVerificationWeight(false)).toBe(0.5);
  });
});

describe("effectiveWeight", () => {
  it("multiplies recency, trust and location verification", () => {
    const report: CrowdReportInput = {
      level: 2,
      createdAt: minutesAgo(2),
      verifiedNearNode: true,
      trustScore: 1.5,
    };
    // recency(2min)=1.0 * trust=1.5 * verified=1.0
    expect(effectiveWeight(report, NOW)).toBeCloseTo(1.5);
  });

  it("applies the unverified penalty", () => {
    const report: CrowdReportInput = {
      level: 1,
      createdAt: minutesAgo(2),
      verifiedNearNode: false,
      trustScore: 1.0,
    };
    expect(effectiveWeight(report, NOW)).toBeCloseTo(0.5);
  });
});

describe("crowdLevelFromScore", () => {
  it("classifies according to the documented thresholds", () => {
    expect(crowdLevelFromScore(null)).toBe("unknown");
    expect(crowdLevelFromScore(0)).toBe("green");
    expect(crowdLevelFromScore(0.65)).toBe("green");
    expect(crowdLevelFromScore(0.66)).toBe("yellow");
    expect(crowdLevelFromScore(1.35)).toBe("yellow");
    expect(crowdLevelFromScore(1.36)).toBe("red");
    expect(crowdLevelFromScore(2)).toBe("red");
  });
});

describe("confidenceFromCount", () => {
  it("classifies according to report volume", () => {
    expect(confidenceFromCount(0)).toBe("unknown");
    expect(confidenceFromCount(1)).toBe("low");
    expect(confidenceFromCount(2)).toBe("low");
    expect(confidenceFromCount(3)).toBe("medium");
    expect(confidenceFromCount(7)).toBe("medium");
    expect(confidenceFromCount(8)).toBe("high");
    expect(confidenceFromCount(100)).toBe("high");
  });
});

describe("aggregateCrowdReports", () => {
  it("returns unknown/null for no reports (UNKNOWN must never equal GREEN)", () => {
    const result = aggregateCrowdReports([], NOW);
    expect(result.crowdLevel).toBe("unknown");
    expect(result.crowdScore).toBeNull();
    expect(result.reportCount).toBe(0);
    expect(result.confidence).toBe("unknown");
    expect(result.lastReportAt).toBeNull();
  });

  it("ignores reports older than the 15 minute window", () => {
    const reports: CrowdReportInput[] = [
      { level: 2, createdAt: minutesAgo(20), verifiedNearNode: true, trustScore: 1.0 },
    ];
    const result = aggregateCrowdReports(reports, NOW);
    expect(result.reportCount).toBe(0);
    expect(result.crowdLevel).toBe("unknown");
  });

  it("computes a weighted average score across mixed reports", () => {
    const reports: CrowdReportInput[] = [
      { level: 2, createdAt: minutesAgo(1), verifiedNearNode: true, trustScore: 1.0 },
      { level: 0, createdAt: minutesAgo(1), verifiedNearNode: true, trustScore: 1.0 },
    ];
    // Equal weights (1.0 each) -> average of levels 2 and 0 = 1.0 (yellow)
    const result = aggregateCrowdReports(reports, NOW);
    expect(result.crowdScore).toBeCloseTo(1.0);
    expect(result.crowdLevel).toBe("yellow");
    expect(result.reportCount).toBe(2);
    expect(result.confidence).toBe("low");
  });

  it("weights fresher and more trusted reports more heavily", () => {
    const reports: CrowdReportInput[] = [
      // Fresh, trusted, verified HIGH report dominates...
      { level: 2, createdAt: minutesAgo(1), verifiedNearNode: true, trustScore: 2.0 },
      // ...over a stale, unverified LOW report.
      { level: 0, createdAt: minutesAgo(14), verifiedNearNode: false, trustScore: 0.5 },
    ];
    const result = aggregateCrowdReports(reports, NOW);
    expect(result.crowdScore).not.toBeNull();
    expect(result.crowdScore!).toBeGreaterThan(1.5);
    expect(result.crowdLevel).toBe("red");
  });

  it("tracks the most recent report timestamp", () => {
    const older = minutesAgo(10);
    const newer = minutesAgo(1);
    const reports: CrowdReportInput[] = [
      { level: 1, createdAt: older, verifiedNearNode: true, trustScore: 1.0 },
      { level: 1, createdAt: newer, verifiedNearNode: true, trustScore: 1.0 },
    ];
    const result = aggregateCrowdReports(reports, NOW);
    expect(result.lastReportAt?.getTime()).toBe(newer.getTime());
  });
});
