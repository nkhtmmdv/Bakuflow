import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { buildGraph, type RouteWithNodes, type TransportGraph } from "@/lib/routing/graph";
import type { Route } from "@/types/database";

async function getActiveRoutesWithNodesUncached(): Promise<RouteWithNodes[]> {
  const supabase = await createClient();

  const { data: routes, error: routesError } = await supabase
    .from("routes")
    .select("*")
    .eq("active", true);
  if (routesError) throw routesError;
  if (!routes || routes.length === 0) return [];

  const { data: routeNodes, error: routeNodesError } = await supabase
    .from("route_nodes")
    .select("*")
    .in(
      "route_id",
      routes.map((r) => r.id),
    )
    .order("sequence", { ascending: true });
  if (routeNodesError) throw routeNodesError;

  const nodesByRoute = new Map<string, RouteWithNodes["nodes"]>();
  for (const rn of routeNodes ?? []) {
    const list = nodesByRoute.get(rn.route_id) ?? [];
    list.push({
      nodeId: rn.node_id,
      sequence: rn.sequence,
      estimatedMinutesFromPrevious: rn.estimated_minutes_from_previous,
    });
    nodesByRoute.set(rn.route_id, list);
  }

  return routes.map((route: Route) => ({
    id: route.id,
    type: route.type,
    nodes: nodesByRoute.get(route.id) ?? [],
  }));
}

/** Memoized per-request: the graph is rebuilt once even if several route
 * candidates are requested during the same /trip search. */
export const getActiveRoutesWithNodes = cache(getActiveRoutesWithNodesUncached);

export const getTransportGraph = cache(async (): Promise<TransportGraph> => {
  const routes = await getActiveRoutesWithNodes();
  return buildGraph(routes);
});
