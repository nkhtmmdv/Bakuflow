"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { routeInputSchema, routeNodeInputSchema } from "@/lib/validation/admin";

export async function createRoute(formData: FormData): Promise<{ error?: string }> {
  const parsed = routeInputSchema.safeParse({
    code: formData.get("code"),
    nameAz: formData.get("nameAz"),
    nameRu: formData.get("nameRu"),
    type: formData.get("type"),
    active: true,
    isDemo: formData.get("isDemo") === "on",
  });

  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase.from("routes").insert({
    code: parsed.data.code,
    name_az: parsed.data.nameAz,
    name_ru: parsed.data.nameRu,
    type: parsed.data.type,
    active: true,
    is_demo: parsed.data.isDemo,
  });

  if (error) return { error: error.code === "23505" ? "duplicate_code" : "insert_failed" };

  revalidatePath("/admin/routes");
  return {};
}

export async function setRouteActive(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const active = formData.get("active") === "true";
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("routes").update({ active }).eq("id", id);

  revalidatePath("/admin/routes");
  revalidatePath("/trip");
}

export async function addRouteNode(formData: FormData): Promise<{ error?: string }> {
  const routeId = formData.get("routeId");
  const nodeId = formData.get("nodeId");
  const sequence = Number(formData.get("sequence"));
  const minutes = Number(formData.get("estimatedMinutesFromPrevious"));

  const parsed = routeNodeInputSchema.safeParse({
    routeId,
    nodeId,
    sequence,
    estimatedMinutesFromPrevious: minutes,
  });
  if (!parsed.success) return { error: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase.from("route_nodes").insert({
    route_id: parsed.data.routeId,
    node_id: parsed.data.nodeId,
    sequence: parsed.data.sequence,
    estimated_minutes_from_previous: parsed.data.estimatedMinutesFromPrevious,
  });

  if (error) {
    return { error: error.code === "23505" ? "duplicate_sequence" : "insert_failed" };
  }

  revalidatePath(`/admin/routes/${parsed.data.routeId}`);
  return {};
}

export async function removeRouteNode(formData: FormData): Promise<void> {
  const id = formData.get("id");
  const routeId = formData.get("routeId");
  if (typeof id !== "string") return;

  const supabase = await createClient();
  await supabase.from("route_nodes").delete().eq("id", id);

  if (typeof routeId === "string") {
    revalidatePath(`/admin/routes/${routeId}`);
  }
}
