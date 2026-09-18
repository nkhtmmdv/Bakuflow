import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Route, RouteNode, TransportNode } from "@/types/database";

export async function getAllRoutesForAdmin(): Promise<Route[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("routes")
    .select("*")
    .order("code", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export interface RouteStopDetail extends RouteNode {
  node: TransportNode;
}

export async function getRouteDetail(
  routeId: string,
): Promise<{ route: Route; stops: RouteStopDetail[] } | null> {
  const supabase = await createClient();

  const { data: route, error: routeError } = await supabase
    .from("routes")
    .select("*")
    .eq("id", routeId)
    .maybeSingle();
  if (routeError) throw routeError;
  if (!route) return null;

  const { data: routeNodes, error: routeNodesError } = await supabase
    .from("route_nodes")
    .select("*")
    .eq("route_id", routeId)
    .order("sequence", { ascending: true });
  if (routeNodesError) throw routeNodesError;

  const { data: allNodes, error: nodesError } = await supabase
    .from("transport_nodes")
    .select("*");
  if (nodesError) throw nodesError;

  const nodesById = new Map((allNodes ?? []).map((n) => [n.id, n]));

  const stops: RouteStopDetail[] = (routeNodes ?? []).flatMap((rn) => {
    const node = nodesById.get(rn.node_id);
    return node ? [{ ...rn, node }] : [];
  });

  return { route, stops };
}
