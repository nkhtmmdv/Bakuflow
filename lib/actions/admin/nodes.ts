"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { transportNodeInputSchema } from "@/lib/validation/admin";

/**
 * Every action here relies on the `transport_nodes_*_admin_only` RLS
 * policies (0003_transport_nodes.sql) as the real gate — requireAdmin() on
 * the page is a UX nicety, never the security boundary.
 */
export async function createNode(formData: FormData): Promise<{ error?: string }> {
  const parsed = transportNodeInputSchema.safeParse({
    nameAz: formData.get("nameAz"),
    nameRu: formData.get("nameRu"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    latitude: Number(formData.get("latitude")),
    longitude: Number(formData.get("longitude")),
    active: true,
  });

  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase.from("transport_nodes").insert({
    name_az: parsed.data.nameAz,
    name_ru: parsed.data.nameRu,
    slug: parsed.data.slug,
    type: parsed.data.type,
    latitude: parsed.data.latitude,
    longitude: parsed.data.longitude,
    active: true,
  });

  if (error) return { error: error.code === "23505" ? "duplicate_slug" : "insert_failed" };

  revalidatePath("/admin/nodes");
  return {};
}

export async function setNodeActive(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const active = formData.get("active") === "true";
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("transport_nodes").update({ active }).eq("id", id);

  revalidatePath("/admin/nodes");
  revalidatePath("/");
  revalidatePath("/live");
}
