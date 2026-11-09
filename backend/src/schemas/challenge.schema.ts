import { z } from "zod";

export const createChallengeSchema = z
  .object({
    title: z.string().min(1, "Completa este campo"),
    description: z.string().min(1, "Completa este campo"),
    deadline: z.coerce.date().optional(),
    sdgIds: z.array(z.number().int().min(1).max(17)).optional(),
    categoryIds: z.array(z.number().int().positive()).optional(),
  })
  .refine(
    (data) => Boolean(data.sdgIds?.length) || Boolean(data.categoryIds?.length),
    { message: "Selecciona al menos un ODS o una categoría.", path: ["sdgIds"] },
  );

export const listChallengesQuerySchema = z.object({
  q: z.string().optional(),
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
  categoryIds: z
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

export const updateChallengeSchema = z
  .object({
    bannerUrl: z
      .string()
      .url()
      .max(2048)
      .refine((u) => /^https?:\/\//i.test(u), "URL inválida")
      .nullable(),
  })
  .strict();

export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type ListChallengesQuery = z.infer<typeof listChallengesQuerySchema>;
export type UpdateChallengeInput = z.infer<typeof updateChallengeSchema>;
