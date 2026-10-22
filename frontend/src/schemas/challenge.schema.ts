import { z } from "zod";

export const createChallengeFormSchema = z.object({
  title: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  deadline: z.string().optional(),
  sdgIds: z.array(z.number()).min(1, "Selecciona al menos un ODS"),
});

export type CreateChallengeFormValues = z.infer<typeof createChallengeFormSchema>;
