import { z } from "zod";

export const createChallengeSchema = z.object({
  title: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  deadline: z.coerce.date().optional(),
  sdgIds: z.array(z.number().int().min(1).max(17)).min(1, "Selecciona al menos un ODS"),
});

export const listChallengesQuerySchema = z.object({
  sdgIds: z
    .string()
    .optional()
    .transform((val) =>
      val
        ? val
            .split(",")
            .map((v) => Number(v))
            .filter((n) => Number.isInteger(n))
        : undefined,
    ),
});

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type ListChallengesQuery = z.infer<typeof listChallengesQuerySchema>;
