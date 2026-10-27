import { z } from "zod";

export const createLabelSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Color inválido"),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = createLabelSchema.partial();

export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
