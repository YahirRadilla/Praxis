import { z } from "zod";

export const sendMessageSchema = z.object({
  recipientId: z.number().int(),
  text: z
    .string()
    .trim()
    .min(1, "El mensaje no puede estar vacío.")
    .max(2000, "El mensaje es demasiado largo."),
});

export const respondConversationSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export const listConversationsQuerySchema = z.object({
  box: z.enum(["inbox", "requests"]).default("inbox"),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type RespondConversationInput = z.infer<typeof respondConversationSchema>;
export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
