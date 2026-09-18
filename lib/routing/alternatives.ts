import { ROUTING_CONFIG } from "@/lib/routing/config";
import { findShortestPath, type EdgeCostFn } from "@/lib/routing/dijkstra";
import type { GraphEdge, TransportGraph } from "@/lib/routing/graph";
import { computeRouteMetrics, type CrowdLevelByNodeId, type RouteMetrics } from "@/lib/routing/score";

export type RouteAlternativeLabel = "fastest" | "lessCrowded" | "alternative";

export interface RouteAlternative {
  label: RouteAlternativeLabel;
  edges: GraphEdge[];
  metrics: RouteMetrics;
  recommended: boolean;
}

function crowdPenaltyFor(edge: GraphEdge, crowdLevelByNodeId: CrowdLevelByNodeId): number {
  const level = crowdLevelByNodeId[edge.fromNodeId] ?? "unknown";
  return ROUTING_CONFIG.crowdPenaltyMinutes[level];
}

function buildEdgeCost(
  crowdLevelByNodeId: CrowdLevelByNodeId,
  options: { crowdWeightMultiplier: number; includeWalkingPenalty: boolean },
): EdgeCostFn {
  return (edge, priorTransitRouteId) => {
    let cost = edge.minutes;

    if (
      edge.routeType !== "walking" &&
      priorTransitRouteId !== null &&
      priorTransitRouteId !== edge.routeId
    ) {
      cost += ROUTING_CONFIG.transferPenaltyMinutes;
    }

    if (options.crowdWeightMultiplier > 0 && edge.routeType !== "walking") {
      cost += crowdPenaltyFor(edge, crowdLevelByNodeId) * options.crowdWeightMultiplier;
    }

    if (options.includeWalkingPenalty && edge.routeType === "walking") {
      cost += edge.minutes * (ROUTING_CONFIG.walkingPenaltyMultiplier - 1);
    }

    return cost;
  };
}

function nodeSet(edges: GraphEdge[]): Set<string> {
  const set = new Set<string>();
  for (const edge of edges) {
    set.add(edge.fromNodeId);
    set.add(edge.toNodeId);
  }
  return set;
}

/** Jaccard similarity of the nodes visited by two paths, 0 (disjoint) to 1 (identical). */
function pathSimilarity(a: GraphEdge[], b: GraphEdge[]): number {
  const setA = nodeSet(a);
  const setB = nodeSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let intersection = 0;
  for (const id of setA) if (setB.has(id)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 1 : intersection / union;
}

const SIMILARITY_THRESHOLD = 0.8;

/**
 * Finds up to ROUTING_CONFIG.maxAlternatives distinct route options between
 * two nodes: the fastest, the least crowded, and one more genuinely
 * different alternative — never the same route dressed up three times.
 * Never uses AI; purely a state-augmented Dijkstra search scored by
 * lib/routing/score.ts.
 */
export function findRouteAlternatives(
  graph: TransportGraph,
  originId: string,
  destinationId: string,
  crowdLevelByNodeId: CrowdLevelByNodeId,
): RouteAlternative[] {
  const costFastest = buildEdgeCost(crowdLevelByNodeId, {
    crowdWeightMultiplier: 0,
    includeWalkingPenalty: false,
  });
  const costLessCrowded = buildEdgeCost(crowdLevelByNodeId, {
    crowdWeightMultiplier: 3,
    includeWalkingPenalty: true,
  });
  const costBalanced = buildEdgeCost(crowdLevelByNodeId, {
    crowdWeightMultiplier: 1,
    includeWalkingPenalty: true,
  });

  const accepted: { label: RouteAlternativeLabel; edges: GraphEdge[] }[] = [];

  const usedRouteIds = () =>
    new Set(accepted.flatMap((a) => a.edges.map((e) => e.routeId)));

  const tryAdd = (label: RouteAlternativeLabel, edges: GraphEdge[] | null): boolean => {
    if (!edges) return false;
    if (accepted.some((a) => pathSimilarity(a.edges, edges) >= SIMILARITY_THRESHOLD)) {
      return false;
    }
    accepted.push({ label, edges });
    return true;
  };

  const fastest = findShortestPath(graph, originId, destinationId, costFastest);
  tryAdd("fastest", fastest?.edges ?? null);

  const lessCrowded = findShortestPath(graph, originId, destinationId, costLessCrowded);
  if (!tryAdd("lessCrowded", lessCrowded?.edges ?? null)) {
    const excluded = usedRouteIds();
    if (excluded.size > 0) {
      const retry = findShortestPath(graph, originId, destinationId, costLessCrowded, excluded);
      tryAdd("lessCrowded", retry?.edges ?? null);
    }
  }

  const balanced = findShortestPath(graph, originId, destinationId, costBalanced);
  if (!tryAdd("alternative", balanced?.edges ?? null)) {
    const excluded = usedRouteIds();
    if (excluded.size > 0) {
      const retry = findShortestPath(graph, originId, destinationId, costBalanced, excluded);
      tryAdd("alternative", retry?.edges ?? null);
    }
  }

  const withMetrics = accepted
    .slice(0, ROUTING_CONFIG.maxAlternatives)
    .map((candidate) => ({
      label: candidate.label,
      edges: candidate.edges,
      metrics: computeRouteMetrics(candidate.edges, crowdLevelByNodeId),
      recommended: false,
    }));

  if (withMetrics.length > 0) {
    const best = withMetrics.reduce((min, current) =>
      current.metrics.routeScore < min.metrics.routeScore ? current : min,
    );
    best.recommended = true;
  }

  return withMetrics;
}
