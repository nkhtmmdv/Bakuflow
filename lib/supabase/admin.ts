import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Service-role Supabase client. NEVER import this from a Client Component or
 * anything that could end up in a browser bundle — the `server-only` import
 * above makes that a build error, not just a convention.
 *
 * Use sparingly: almost everything in BakuFlow should go through the
 * request-scoped client (lib/supabase/server.ts) and rely on RLS. This
 * client exists for the handful of privileged operations that must bypass
 * RLS by design, e.g. the trust-score service layer (lib/trust).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not configured; refusing to create an admin client.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
