import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Favorite } from "@/types/database";

export async function getCurrentUserFavorites(): Promise<Favorite[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}
