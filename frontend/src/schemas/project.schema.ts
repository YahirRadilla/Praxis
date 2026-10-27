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
  teacherId: z.number().int().nullable().optional(),
  organizationId: z.number().int().nullable().optional(),
  challengeId: z.number().int().nullable().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;
