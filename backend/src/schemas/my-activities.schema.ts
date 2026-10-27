import { z } from "zod";

export const listMyActivitiesQuerySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"]).optional(),
  projectId: z.coerce.number().int().optional(),
});

export type ListMyActivitiesQuery = z.infer<typeof listMyActivitiesQuerySchema>;
