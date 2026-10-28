import { z } from "zod";

export const createActivitySchema = z.object({
  title: z.string().min(1, "Completa este campo"),
  description: z.string().optional(),
  dueDate: z.coerce.date(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA"]).optional(),
  status: z.enum(["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"]).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  labelIds: z.array(z.number().int()).optional(),
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;

export const updateActivitySchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.coerce.date().optional(),
  priority: z.enum(["BAJA", "MEDIA", "ALTA"]).optional(),
  assigneeIds: z.array(z.number().int()).optional(),
  labelIds: z.array(z.number().int()).optional(),
});

export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;

export const moveActivitySchema = z.object({
  status: z.enum(["PENDING", "IN_PROGRESS", "TO_VALIDATE", "DONE"]),
  position: z.number().int().min(0),
});

export type MoveActivityInput = z.infer<typeof moveActivitySchema>;

export const createChecklistSectionSchema = z.object({
  name: z.string().min(1, "Completa este campo"),
});

export type CreateChecklistSectionInput = z.infer<typeof createChecklistSectionSchema>;

export const updateChecklistSectionSchema = z.object({
  name: z.string().min(1).optional(),
  position: z.number().int().optional(),
});

export type UpdateChecklistSectionInput = z.infer<typeof updateChecklistSectionSchema>;

export const createChecklistItemSchema = z.object({
  text: z.string().min(1, "Completa este campo"),
  note: z.string().optional(),
  sectionId: z.number().int().optional(),
});

export type CreateChecklistItemInput = z.infer<typeof createChecklistItemSchema>;

export const updateChecklistItemSchema = z.object({
  text: z.string().min(1).optional(),
  note: z.string().optional(),
  sectionId: z.number().int().nullable().optional(),
  done: z.boolean().optional(),
  position: z.number().int().optional(),
});

export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;

export const createActivityCommentSchema = z.object({
  text: z.string().min(1, "Completa este campo"),
});

export type CreateActivityCommentInput = z.infer<typeof createActivityCommentSchema>;

export const createActivityAttachmentSchema = z.object({
  url: z.string().url(),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
});

export type CreateActivityAttachmentInput = z.infer<typeof createActivityAttachmentSchema>;
