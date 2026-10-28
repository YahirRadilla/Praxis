import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  skills: z.array(z.string().min(1)).optional(),
  interests: z.array(z.string().min(1)).optional(),
  academicProgram: z.string().max(120).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const searchUsersQuerySchema = z.object({
  accountType: z.enum(["STUDENT", "TEACHER", "ORGANIZATION", "INDEPENDENT"]).optional(),
  q: z.string().optional(),
});

export type SearchUsersQuery = z.infer<typeof searchUsersQuerySchema>;
