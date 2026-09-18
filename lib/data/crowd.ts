import "server-only";
import { createClient } from "@/lib/supabase/server";
import { aggregateCrowdReports, type CrowdAggregateResult } from "@/lib/crowd/score";
import type { CrowdLevelByNodeId } from "@/lib/routing/score";

/**
 * Fetches live crowd aggregates for a set of nodes (or all nodes with any
 * recent activity when omitted) via the SECURITY DEFINER SQL function —
 * never touches raw crowd_reports rows.
 */
export async function getCrowdAggregates(
  nodeIds?: string[],
): Promise<Map<string, CrowdAggregateResult>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_node_crowd_aggregates", {
    node_ids: nodeIds ?? null,
  });

  if (error) throw error;

  const map = new Map<string, CrowdAggregateResult>();
  for (const row of data ?? []) {
    map.set(row.node_id, {
      crowdLevel: row.crowd_level as CrowdAggregateResult["crowdLevel"],
      crowdScore: row.crowd_score,
      reportCount: row.report_count,
      confidence: row.confidence as CrowdAggregateResult["confidence"],
      lastReportAt: row.last_report_at ? new Date(row.last_report_at) : null,
    });
  }
  return map;
}

export async function getCrowdLevelByNodeId(nodeIds?: string[]): Promise<CrowdLevelByNodeId> {
  const aggregates = await getCrowdAggregates(nodeIds);
  const result: CrowdLevelByNodeId = {};
  for (const [nodeId, aggregate] of aggregates) {
    result[nodeId] = aggregate.crowdLevel;
  }
  return result;
}

/**
 * Fetches the minimal, non-identifying recent-reports feed for one node and
 * runs it through the (unit-tested) TypeScript aggregation algorithm. Used
 * right after a user submits a report, so the confirmation screen reflects
 * their own submission immediately.
 */
export async function getNodeCrowdAggregateFresh(nodeId: string): Promise<CrowdAggregateResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_node_recent_reports", {
    p_node_id: nodeId,
  });

  if (error) throw error;

  return aggregateCrowdReports(
    (data ?? []).map((row) => ({
      level: row.level as 0 | 1 | 2,
      createdAt: row.created_at,
      verifiedNearNode: row.verified_near_node,
      trustScore: Number(row.trust_score),
    })),
  );
}
