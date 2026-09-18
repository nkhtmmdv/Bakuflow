"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { favoriteInputSchema } from "@/lib/validation/favorite";

export async function createFavorite(formData: FormData): Promise<{ error?: string }> {
  const parsed = favoriteInputSchema.safeParse({
    title: formData.get("title"),
    originNodeId: formData.get("originNodeId"),
    destinationNodeId: formData.get("destinationNodeId"),
  });

  if (!parsed.success) {
    return { error: "invalid_input" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "authentication_required" };
  }

  const { error } = await supabase.from("favorites").insert({
    user_id: user.id,
    title: parsed.data.title,
    origin_node_id: parsed.data.originNodeId,
    destination_node_id: parsed.data.destinationNodeId,
  });

  if (error) {
    return { error: error.code === "23505" ? "duplicate" : "insert_failed" };
  }

  revalidatePath("/favorites");
  revalidatePath("/");
  return {};
}

export async function deleteFavorite(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("favorites").delete().eq("id", id);

  revalidatePath("/favorites");
  revalidatePath("/");
}
