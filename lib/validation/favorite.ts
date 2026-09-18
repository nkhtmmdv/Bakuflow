import { z } from "zod";

export const favoriteInputSchema = z
  .object({
    title: z.string().trim().min(1).max(60),
    originNodeId: z.string().uuid(),
    destinationNodeId: z.string().uuid(),
  })
  .refine((data) => data.originNodeId !== data.destinationNodeId, {
    message: "Origin and destination must differ",
    path: ["destinationNodeId"],
  });

export type FavoriteInput = z.infer<typeof favoriteInputSchema>;
