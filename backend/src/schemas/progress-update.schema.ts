import { z } from "zod";

export const createProgressUpdateSchema = z.object({
  text: z.string().min(1, "Completa este campo"),
  activityId: z.number().int().optional(),
  postedToFeed: z.boolean().optional(),
  evidence: z
    .array(
      z.object({
        type: z.enum(["FILE", "LINK"]),
        url: z.string().url("Ingresa una URL válida"),
        fileName: z.string().optional(),
      }),
    )
    .optional(),
});

export const feedQuerySchema = z.object({
  categoryId: z
    .string()
    .optional()
    .transform((val) => (val ? Number(val) : undefined))
    .refine((val) => val === undefined || Number.isInteger(val), "categoryId inválido"),
});

export type CreateProgressUpdateInput = z.infer<typeof createProgressUpdateSchema>;
export type FeedQuery = z.infer<typeof feedQuerySchema>;
