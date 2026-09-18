import type { RouteType } from "@/types/database";

export interface GraphEdge {
  fromNodeId: string;
  toNodeId: string;
  routeId: string;
  routeType: RouteType;
  /** Real, unpenalized travel time for this single hop. */
  minutes: number;
}

export interface RouteWithNodes {
  id: string;
  type: RouteType;
  /** Must be pre-sorted by `sequence` ascending. */
  nodes: Array<{ nodeId: string; sequence: number; estimatedMinutesFromPrevious: number }>;
}

export type TransportGraph = Map<string, GraphEdge[]>;

/**
 * Builds a directed adjacency-list graph from admin-entered routes.
 * Each route's stops become one directed edge per consecutive pair, in the
 * order the admin defined (routes are directional; a return trip needs its
 * own route entry, matching how real bus lines are usually numbered).
 */
export function buildGraph(routes: RouteWithNodes[]): TransportGraph {
  const graph: TransportGraph = new Map();

  const addEdge = (edge: GraphEdge) => {
    const existing = graph.get(edge.fromNodeId);
    if (existing) {
      existing.push(edge);
    } else {
      graph.set(edge.fromNodeId, [edge]);
    }
  };

  for (const route of routes) {
    const sortedNodes = [...route.nodes].sort((a, b) => a.sequence - b.sequence);
    for (let i = 1; i < sortedNodes.length; i++) {
      const from = sortedNodes[i - 1];
      const to = sortedNodes[i];
      addEdge({
        fromNodeId: from.nodeId,
        toNodeId: to.nodeId,
        routeId: route.id,
        routeType: route.type,
        minutes: to.estimatedMinutesFromPrevious,
      });
    }
  }

  return graph;
}
