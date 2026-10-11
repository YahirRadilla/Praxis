import { z } from "zod";

export const createActivitySchema = z.object({
  title: z.string().min(1, "Completa este campo"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
