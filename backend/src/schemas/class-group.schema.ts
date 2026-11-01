import { z } from "zod";

export const createClassGroupSchema = z
  .object({
    name: z.string().min(1, "Completa este campo"),
    description: z.string().min(1, "Completa este campo"),
  })
  .strict();

export const updateClassGroupSchema = z
  .object({
    name: z.string().min(1, "Completa este campo").optional(),
    description: z.string().min(1, "Completa este campo").optional(),
  })
  .strict();

export const searchClassGroupsQuerySchema = z.object({
  q: z.string().optional(),
});

export type CreateClassGroupInput = z.infer<typeof createClassGroupSchema>;
export type UpdateClassGroupInput = z.infer<typeof updateClassGroupSchema>;
export type SearchClassGroupsQuery = z.infer<typeof searchClassGroupsQuerySchema>;
