import { z } from "zod";

export const createProjectSchema = z
  .object({
    name: z.string().min(1, "Completa este campo"),
    description: z.string().min(1, "Completa este campo"),
    problemStatement: z.string().min(1, "Completa este campo"),
    objectives: z.string().min(1, "Completa este campo"),
    sdgIds: z.array(z.number().int().min(1).max(17)).default([]),
    categoryIds: z
      .array(z.number().int())
      .min(1, "Selecciona al menos una categoría")
      .max(3, "Máximo 3 categorías"),
    challengeId: z.number().int().optional(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
    // Evaluator invitations sent in the same request as project creation
    // (WU-05 / plan §7 P4): these never fill `teacherId`/`organizationId`
    // directly — they create PENDING `TeamRequest` rows the target accepts
    // later. `teacherId`/`organizationId` are not, and will never be,
    // accepted as creation fields (plan decision #6).
    evaluatorInviteIds: z.array(z.number().int()).max(2).optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().min(1).optional(),
    problemStatement: z.string().min(1).optional(),
    objectives: z.string().min(1).optional(),
    extendedInfo: z.string().nullable().optional(),
    sdgIds: z.array(z.number().int().min(1).max(17)).optional(),
    categoryIds: z.array(z.number().int()).min(1).max(3).optional(),
    visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
  })
  .strict();

export const searchProjectsQuerySchema = z.object({
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

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type SearchProjectsQuery = z.infer<typeof searchProjectsQuerySchema>;
