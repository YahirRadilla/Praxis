import { z } from "zod";

export const createProjectFormSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  problemStatement: z.string().min(1, "Completa este campo"),
  objectives: z.string().min(1, "Completa este campo"),
  sdgIds: z.array(z.number()),
  categoryIds: z
    .array(z.number().int())
    .min(1, "Selecciona al menos una categoría")
    .max(3, "Máximo 3 categorías"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  challengeId: z.number().int().nullable().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;

// Edit form has no teacher/organization selectors and no Reto linking: a
// linked evaluator can only change through an accepted invite (plan §2
// decision #6, WU-08), and `PATCH /projects/:id` doesn't accept
// `challengeId` either.
export const updateProjectFormSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  problemStatement: z.string().min(1, "Completa este campo"),
  objectives: z.string().min(1, "Completa este campo"),
  sdgIds: z.array(z.number()),
  categoryIds: z
    .array(z.number().int())
    .min(1, "Selecciona al menos una categoría")
    .max(3, "Máximo 3 categorías"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export type UpdateProjectFormValues = z.infer<typeof updateProjectFormSchema>;
