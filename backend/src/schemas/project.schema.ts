import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  problemStatement: z.string().min(1, "Completa este campo"),
  objectives: z.string().min(1, "Completa este campo"),
  sdgIds: z.array(z.number().int().min(1).max(17)).min(1, "Selecciona al menos un ODS"),
  teacherId: z.number().int().optional(),
  organizationId: z.number().int().optional(),
  challengeId: z.number().int().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  problemStatement: z.string().min(1).optional(),
  objectives: z.string().min(1).optional(),
  sdgIds: z.array(z.number().int().min(1).max(17)).min(1).optional(),
  teacherId: z.number().int().nullable().optional(),
  organizationId: z.number().int().nullable().optional(),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).optional(),
});

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
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type SearchProjectsQuery = z.infer<typeof searchProjectsQuerySchema>;
