import { z } from "zod";

export const createProjectResourceSchema = z
  .object({
    type: z.enum(["FILE", "LINK"]),
    url: z.string().url("Ingresa una URL válida"),
    label: z.string().min(1, "Completa este campo"),
    description: z.string().optional(),
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    sizeBytes: z.number().int().positive().optional(),
  })
  .refine(
    (data) => data.type !== "FILE" || Boolean(data.fileName && data.mimeType && data.sizeBytes),
    {
      message: "Faltan los datos del archivo subido.",
      path: ["fileName"],
    },
  );

export type CreateProjectResourceInput = z.infer<typeof createProjectResourceSchema>;
