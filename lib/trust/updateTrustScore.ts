import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export const TRUST_SCORE_MIN = 0.25;
export const TRUST_SCORE_MAX = 2.0;
export const TRUST_SCORE_DEFAULT = 1.0;

function clampTrustScore(value: number): number {
  return Math.min(TRUST_SCORE_MAX, Math.max(TRUST_SCORE_MIN, value));
}

/**
 * Service-layer hook for adjusting a user's trust score. Not wired to any
 * user-facing flow yet (MVP intentionally ships a static trust score — see
 * spec section 12) but kept isolated here so a future reputation system
 * (e.g. "increase trust when a report is corroborated by others") can call
 * this without touching RLS, routes, or UI. Requires the service role
 * client because `profiles.trust_score` is locked down by a DB trigger for
 * every other caller.
 */
export async function adjustTrustScore(userId: string, delta: number): Promise<number> {
  const admin = createAdminClient();

  const { data: profile, error: fetchError } = await admin
    .from("profiles")
    .select("trust_score")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    throw new Error(`Cannot adjust trust score: profile ${userId} not found`);
  }

  const nextScore = clampTrustScore(profile.trust_score + delta);

  const { error: updateError } = await admin
    .from("profiles")
    .update({ trust_score: nextScore })
    .eq("id", userId);

  if (updateError) {
    throw updateError;
  }

  return nextScore;
}
