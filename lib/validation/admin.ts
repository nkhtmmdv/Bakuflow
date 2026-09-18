import { z } from "zod";

export const nodeTypeSchema = z.enum(["metro", "bus_stop", "transport_hub", "other"]);
export const routeTypeSchema = z.enum(["bus", "express_bus", "metro", "walking", "other"]);

export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug must be lowercase, alphanumeric, hyphen-separated");

export const transportNodeInputSchema = z.object({
  nameAz: z.string().trim().min(1).max(120),
  nameRu: z.string().trim().min(1).max(120),
  slug: slugSchema,
  type: nodeTypeSchema,
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  active: z.boolean().default(true),
});

export type TransportNodeInput = z.infer<typeof transportNodeInputSchema>;

export const routeInputSchema = z.object({
  code: z.string().trim().min(1).max(20),
  nameAz: z.string().trim().min(1).max(120),
  nameRu: z.string().trim().min(1).max(120),
  type: routeTypeSchema,
  active: z.boolean().default(true),
  isDemo: z.boolean().default(false),
});

export type RouteInput = z.infer<typeof routeInputSchema>;

export const routeNodeInputSchema = z.object({
  routeId: z.string().uuid(),
  nodeId: z.string().uuid(),
  sequence: z.number().int().min(0),
  estimatedMinutesFromPrevious: z.number().int().min(0).max(180),
});

export type RouteNodeInput = z.infer<typeof routeNodeInputSchema>;
