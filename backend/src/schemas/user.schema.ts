import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  skills: z.array(z.string().min(1)).optional(),
  interests: z.array(z.string().min(1)).optional(),
  academicProgram: z.string().max(120).optional(),
  semester: z.number().int().min(1).max(12).nullable().optional(),
  cvUrl: z
    .string()
    .url()
    .max(2048)
    .refine((u) => /^https?:\/\//i.test(u), "URL inválida")
    .nullable()
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const searchUsersQuerySchema = z.object({
  accountType: z.enum(["STUDENT", "TEACHER", "ORGANIZATION", "INDEPENDENT"]).optional(),
  q: z.string().optional(),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
