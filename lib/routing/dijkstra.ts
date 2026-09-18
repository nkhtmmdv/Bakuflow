import type { GraphEdge, TransportGraph } from "@/lib/routing/graph";

export interface PathResult {
  edges: GraphEdge[];
  /** Total weight as computed by the supplied edgeCost function. */
  totalWeight: number;
}

/**
 * Cost of traversing one edge, given the id of the transit route ridden
 * immediately before it (null at the start of the journey, and left
 * unchanged across walking edges — see findRouteAlternatives for why).
 */
export type EdgeCostFn = (edge: GraphEdge, priorTransitRouteId: string | null) => number;

interface HeapItem {
  key: string;
  nodeId: string;
  priorTransitRouteId: string | null;
  weight: number;
  path: GraphEdge[];
}

/**
 * Dijkstra's algorithm over a state space of (nodeId, lastTransitRouteId)
 * rather than just nodeId, so that transfer-penalty edge costs (which
 * depend on whether the rider is changing vehicles) can be modeled as a
 * pure function of a single edge + the arriving state, no global
 * backtracking required. Walking edges pass the incoming
 * `priorTransitRouteId` straight through, so walking never counts as
 * "boarding a different route" by itself.
 */
export function findShortestPath(
  graph: TransportGraph,
  originId: string,
  destinationId: string,
  edgeCost: EdgeCostFn,
  excludedRouteIds: ReadonlySet<string> = new Set(),
): PathResult | null {
  if (originId === destinationId) return { edges: [], totalWeight: 0 };

  const startKey = `${originId}::`;
  const best = new Map<string, number>([[startKey, 0]]);
  // Simple array-backed priority queue: fine at city-transport-graph scale.
  const queue: HeapItem[] = [
    { key: startKey, nodeId: originId, priorTransitRouteId: null, weight: 0, path: [] },
  ];

  while (queue.length > 0) {
    queue.sort((a, b) => a.weight - b.weight);
    const current = queue.shift()!;

    if (current.weight > (best.get(current.key) ?? Infinity)) continue;

    if (current.nodeId === destinationId) {
      return { edges: current.path, totalWeight: current.weight };
    }

    const edges = graph.get(current.nodeId) ?? [];
    for (const edge of edges) {
      if (excludedRouteIds.has(edge.routeId)) continue;

      const nextPriorRouteId =
        edge.routeType === "walking" ? current.priorTransitRouteId : edge.routeId;
      const nextKey = `${edge.toNodeId}::${nextPriorRouteId ?? ""}`;
      const nextWeight = current.weight + edgeCost(edge, current.priorTransitRouteId);

      if (nextWeight < (best.get(nextKey) ?? Infinity)) {
        best.set(nextKey, nextWeight);
        queue.push({
          key: nextKey,
          nodeId: edge.toNodeId,
          priorTransitRouteId: nextPriorRouteId,
          weight: nextWeight,
          path: [...current.path, edge],
        });
      }
    }
  }

  return null;
}
