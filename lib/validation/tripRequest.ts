import { z } from "zod";

export const tripSearchInputSchema = z
  .object({
    originNodeId: z.string().uuid(),
    destinationNodeId: z.string().uuid(),
    desiredArrival: z.string().datetime().nullable().optional(),
    anonymousSessionId: z.string().min(8).max(128).nullable().optional(),
  })
  .refine((data) => data.originNodeId !== data.destinationNodeId, {
    message: "Origin and destination must differ",
    path: ["destinationNodeId"],
  });

export type TripSearchInput = z.infer<typeof tripSearchInputSchema>;
