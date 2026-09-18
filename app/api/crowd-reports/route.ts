import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { crowdReportInputSchema } from "@/lib/validation/crowdReport";
import { haversineDistanceMeters, isVerifiedNearNode } from "@/lib/crowd/distance";
import { isRateLimited, minutesUntilAllowed } from "@/lib/crowd/rateLimit";
import { getNodeCrowdAggregateFresh } from "@/lib/data/crowd";

const MAX_BODY_BYTES = 4_096;

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (rawBody.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = crowdReportInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  }

  // Friendly pre-check (source of truth is the DB trigger, see below).
  const { data: lastReportAtRaw } = await supabase.rpc("get_my_last_crowd_report_at", {
    p_node_id: input.nodeId,
  });
  const lastReportAt = lastReportAtRaw ? new Date(lastReportAtRaw) : null;
  if (isRateLimited(lastReportAt)) {
    return NextResponse.json(
      {
        error: "rate_limited",
        retryAfterMinutes: Math.ceil(minutesUntilAllowed(lastReportAt)),
      },
      { status: 429 },
    );
  }

  const { data: node, error: nodeError } = await supabase
    .from("transport_nodes")
    .select("id, latitude, longitude, active")
    .eq("id", input.nodeId)
    .maybeSingle();

  if (nodeError || !node || !node.active) {
    return NextResponse.json({ error: "node_not_found" }, { status: 404 });
  }

  let verifiedNearNode = false;
  let distanceToNodeM: number | null = null;
  if (input.coords) {
    distanceToNodeM = haversineDistanceMeters(
      input.coords.latitude,
      input.coords.longitude,
      node.latitude,
      node.longitude,
    );
    verifiedNearNode = isVerifiedNearNode(distanceToNodeM);
  }

  const { error: insertError } = await supabase.from("crowd_reports").insert({
    user_id: user.id,
    node_id: input.nodeId,
    route_id: input.routeId ?? null,
    level: input.level,
    verified_near_node: verifiedNearNode,
    distance_to_node_m: distanceToNodeM,
  });

  if (insertError) {
    // The DB trigger raises P0001 if the app-level pre-check above was
    // bypassed or raced; treat it the same way as a rate-limit response.
    if (insertError.message.includes("rate_limited")) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  const aggregate = await getNodeCrowdAggregateFresh(input.nodeId);

  return NextResponse.json({
    ok: true,
    verifiedNearNode,
    aggregate: {
      crowdLevel: aggregate.crowdLevel,
      crowdScore: aggregate.crowdScore,
      reportCount: aggregate.reportCount,
      confidence: aggregate.confidence,
      lastReportAt: aggregate.lastReportAt?.toISOString() ?? null,
    },
  });
}
