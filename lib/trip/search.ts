import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getActiveNodes } from "@/lib/data/nodes";
import { getTransportGraph } from "@/lib/data/routes";
import { getCrowdLevelByNodeId } from "@/lib/data/crowd";
import { findRouteAlternatives, type RouteAlternative } from "@/lib/routing/alternatives";
import { recommendedDepartureTime, type CrowdLevelByNodeId } from "@/lib/routing/score";
import type { CrowdColor } from "@/lib/crowd/score";
import type { TransportNode } from "@/types/database";

const CROWD_SEVERITY: Record<Exclude<CrowdColor, "unknown">, number> = {
  green: 0,
  yellow: 1,
  red: 2,
};

function worstCrowdLevel(legs: TripLeg[], crowdLevelByNodeId: CrowdLevelByNodeId): CrowdColor {
  let worst: CrowdColor = "unknown";
  for (const leg of legs) {
    if (leg.routeType === "walking") continue;
    const level = crowdLevelByNodeId[leg.fromNode.id] ?? "unknown";
    if (level === "unknown") continue;
    if (worst === "unknown" || CROWD_SEVERITY[level] > CROWD_SEVERITY[worst]) {
      worst = level;
    }
  }
  return worst;
}

export interface TripLeg {
  fromNode: TransportNode;
  toNode: TransportNode;
  routeId: string;
  routeType: RouteAlternative["edges"][number]["routeType"];
  minutes: number;
}

export interface TripOption {
  label: RouteAlternative["label"];
  recommended: boolean;
  legs: TripLeg[];
  estimatedMinutes: number;
  estimatedMinutesRange: [number, number];
  transfers: number;
  walkingMinutes: number;
  suggestedDeparture: Date | null;
  worstCrowdLevel: CrowdColor;
}

export interface TripSearchParams {
  originNodeId: string;
  destinationNodeId: string;
  desiredArrival?: Date | null;
}

export async function searchTrips(params: TripSearchParams): Promise<TripOption[]> {
  const [graph, nodes, crowdLevelByNodeId] = await Promise.all([
    getTransportGraph(),
    getActiveNodes(),
    getCrowdLevelByNodeId(),
  ]);

  const nodeById = new Map(nodes.map((n) => [n.id, n]));

  const alternatives = findRouteAlternatives(
    graph,
    params.originNodeId,
    params.destinationNodeId,
    crowdLevelByNodeId,
  );

  return alternatives.map((alt) => {
    const legs: TripLeg[] = alt.edges.map((edge) => {
      const fromNode = nodeById.get(edge.fromNodeId);
      const toNode = nodeById.get(edge.toNodeId);
      if (!fromNode || !toNode) {
        throw new Error(`Route references unknown node(s): ${edge.fromNodeId} -> ${edge.toNodeId}`);
      }
      return {
        fromNode,
        toNode,
        routeId: edge.routeId,
        routeType: edge.routeType,
        minutes: edge.minutes,
      };
    });

    return {
      label: alt.label,
      recommended: alt.recommended,
      legs,
      estimatedMinutes: alt.metrics.estimatedMinutes,
      estimatedMinutesRange: alt.metrics.estimatedMinutesRange,
      transfers: alt.metrics.transfers,
      walkingMinutes: alt.metrics.walkingMinutes,
      suggestedDeparture: params.desiredArrival
        ? recommendedDepartureTime(params.desiredArrival, alt.metrics.estimatedMinutes)
        : null,
      worstCrowdLevel: worstCrowdLevel(legs, crowdLevelByNodeId),
    };
  });
}

/**
 * Records anonymised demand for admin analytics. Best-effort: a logging
 * failure must never block the user from seeing their route results.
 */
export async function logTripRequest(params: {
  originNodeId: string;
  destinationNodeId: string;
  desiredArrival?: Date | null;
  anonymousSessionId?: string | null;
}): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("trip_requests").insert({
      user_id: user?.id ?? null,
      anonymous_session_id: user ? null : params.anonymousSessionId ?? null,
      origin_node_id: params.originNodeId,
      destination_node_id: params.destinationNodeId,
      desired_arrival: params.desiredArrival?.toISOString() ?? null,
    });
  } catch {
    // Demand logging is best-effort; never surface this to the user.
  }
}
