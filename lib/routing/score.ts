import type { CrowdColor } from "@/lib/crowd/score";
import { ROUTING_CONFIG } from "@/lib/routing/config";
import type { GraphEdge } from "@/lib/routing/graph";

export interface RouteMetrics {
  /** Real total travel time estimate, including transfer wait. */
  estimatedMinutes: number;
  /** "Approximately X–Y minutes" range shown to the user (never a false-precision point estimate). */
  estimatedMinutesRange: [number, number];
  transfers: number;
  walkingMinutes: number;
  /** Internal ranking score (never shown as a duration) — lower is better. */
  routeScore: number;
}

export type CrowdLevelByNodeId = Record<string, CrowdColor>;

function crowdOf(nodeId: string, crowdLevelByNodeId: CrowdLevelByNodeId): CrowdColor {
  return crowdLevelByNodeId[nodeId] ?? "unknown";
}

/** Groups consecutive same-route, non-walking edges into "ride segments". */
function rideSegments(edges: GraphEdge[]): GraphEdge[][] {
  const segments: GraphEdge[][] = [];
  let current: GraphEdge[] = [];

  for (const edge of edges) {
    if (edge.routeType === "walking") {
      if (current.length) segments.push(current);
      current = [];
      continue;
    }
    if (current.length && current[current.length - 1].routeId !== edge.routeId) {
      segments.push(current);
      current = [];
    }
    current.push(edge);
  }
  if (current.length) segments.push(current);
  return segments;
}

export function computeRouteMetrics(
  edges: GraphEdge[],
  crowdLevelByNodeId: CrowdLevelByNodeId,
): RouteMetrics {
  const segments = rideSegments(edges);
  const transfers = Math.max(0, segments.length - 1);

  const walkingMinutes = edges
    .filter((e) => e.routeType === "walking")
    .reduce((sum, e) => sum + e.minutes, 0);

  const rawMinutes = edges.reduce((sum, e) => sum + e.minutes, 0);
  const estimatedMinutes =
    rawMinutes + transfers * ROUTING_CONFIG.transferPenaltyMinutes;

  const crowdPenalty = segments.reduce((sum, segment) => {
    const boardingNodeId = segment[0].fromNodeId;
    const level = crowdOf(boardingNodeId, crowdLevelByNodeId);
    return sum + ROUTING_CONFIG.crowdPenaltyMinutes[level];
  }, 0);

  const walkingPenalty =
    walkingMinutes * (ROUTING_CONFIG.walkingPenaltyMultiplier - 1);

  const routeScore = estimatedMinutes + crowdPenalty + walkingPenalty;

  const spread = Math.max(3, Math.round(estimatedMinutes * 0.1));

  return {
    estimatedMinutes,
    estimatedMinutesRange: [Math.max(0, estimatedMinutes - spread), estimatedMinutes + spread],
    transfers,
    walkingMinutes,
    routeScore,
  };
}

/**
 * Recommended departure time for a desired arrival time: walk the estimate
 * back from the arrival time and subtract a small safety buffer, since we
 * never promise exact timing (spec: "approximately", not a guarantee).
 */
export function recommendedDepartureTime(
  desiredArrival: Date,
  estimatedMinutes: number,
): Date {
  const totalMinutes = estimatedMinutes + ROUTING_CONFIG.arrivalSafetyBufferMinutes;
  return new Date(desiredArrival.getTime() - totalMinutes * 60_000);
}
