import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TransportNode } from "@/types/database";

export async function getActiveNodes(): Promise<TransportNode[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transport_nodes")
    .select("*")
    .eq("active", true)
    .order("name_az", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getNodeById(id: string): Promise<TransportNode | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transport_nodes")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
