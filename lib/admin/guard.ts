import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

/**
 * Server-side gate for /admin. Role is always re-derived from the database
 * (never trusted from the client), per BakuFlow's security requirements.
 * Call this at the top of every admin page/layout.
 */
export async function requireAdmin(): Promise<{ profile: Profile }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/profile?next=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    redirect("/");
  }

  return { profile };
}
