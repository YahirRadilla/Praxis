import { z } from "zod";

export const createDictamenSchema = z.object({
  verdict: z.enum(["APPROVED", "CHANGES_REQUESTED"]),
  comment: z.string().min(1, "Completa este campo"),
});

export type CreateDictamenInput = z.infer<typeof createDictamenSchema>;
