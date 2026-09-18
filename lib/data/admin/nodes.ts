import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TransportNode } from "@/types/database";

/** Includes inactive nodes too — only reachable after requireAdmin(). */
export async function getAllNodesForAdmin(): Promise<TransportNode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transport_nodes")
    .select("*")
    .order("name_az", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
