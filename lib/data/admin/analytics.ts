import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * Every RPC here is a SECURITY DEFINER SQL function that re-checks
 * is_admin() itself (0008_admin_analytics.sql) — this module never touches
 * raw crowd_reports/trip_requests rows directly.
 */
export async function getAdminAnalytics() {
  const supabase = await createClient();

  const [
    reportsToday,
    activeUsersToday,
    mostCrowded,
    topOrigins,
    topDestinations,
    topPairs,
    peakWindows,
  ] = await Promise.all([
    supabase.rpc("admin_reports_today"),
    supabase.rpc("admin_active_users_today"),
    supabase.rpc("admin_most_crowded_nodes", { p_limit: 8 }),
    supabase.rpc("admin_top_origins", { p_limit: 8 }),
    supabase.rpc("admin_top_destinations", { p_limit: 8 }),
    supabase.rpc("admin_top_od_pairs", { p_limit: 8 }),
    supabase.rpc("admin_peak_search_windows", { p_limit: 8 }),
  ]);

  return {
    reportsToday: reportsToday.data ?? 0,
    activeUsersToday: activeUsersToday.data ?? 0,
    mostCrowded: mostCrowded.data ?? [],
    topOrigins: topOrigins.data ?? [],
    topDestinations: topDestinations.data ?? [],
    topPairs: topPairs.data ?? [],
    peakWindows: peakWindows.data ?? [],
  };
}
