import { z } from "zod";

export const createActivitySchema = z.object({
  title: z.string().min(1, "Completa este campo"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  assigneeId: z.number().int().optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivityStatusSchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "DONE"]),
});

export type UpdateActivityStatusInput = z.infer<typeof updateActivityStatusSchema>;
