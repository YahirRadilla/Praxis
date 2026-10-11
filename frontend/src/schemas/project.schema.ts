import { z } from "zod";

export const createProjectFormSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  description: z.string().min(1, "Completa este campo"),
  problemStatement: z.string().min(1, "Completa este campo"),
  objectives: z.string().min(1, "Completa este campo"),
  sdgIds: z.array(z.number()).min(1, "Selecciona al menos un ODS"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]),
  teacherId: z.number().int().nullable().optional(),
  organizationId: z.number().int().nullable().optional(),
});

export type CreateProjectFormValues = z.infer<typeof createProjectFormSchema>;
