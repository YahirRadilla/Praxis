import { z } from "zod";

export const createClassGroupFormSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
});

export type CreateClassGroupFormValues = z.infer<typeof createClassGroupFormSchema>;
