import { z } from "zod";

export const crowdLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

/** Payload the client sends to POST /api/crowd-reports. */
export const crowdReportInputSchema = z.object({
  nodeId: z.string().uuid(),
  routeId: z.string().uuid().nullable().optional(),
  level: crowdLevelSchema,
  coords: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .nullable()
    .optional(),
});

export type CrowdReportInput = z.infer<typeof crowdReportInputSchema>;
