import { z } from "zod";

export const createChallengeFormSchema = z
  .object({
    title: z.string().min(1, "Completa este campo"),
    description: z.string().min(1, "Completa este campo"),
    deadline: z.string().optional(),
    sdgIds: z.array(z.number()).optional(),
    categoryIds: z.array(z.number()).optional(),
  })
  .refine((data) => Boolean(data.sdgIds?.length) || Boolean(data.categoryIds?.length), {
    message: "Selecciona al menos un ODS o una categoría",
    path: ["sdgIds"],
  });

export type CreateChallengeFormValues = z.infer<typeof createChallengeFormSchema>;
