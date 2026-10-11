import { z } from "zod";

export const createTeamRequestSchema = z.object({
  message: z.string().optional(),
});

export const respondTeamRequestSchema = z.object({
  status: z.enum(["ACCEPTED", "REJECTED"]),
});

export type CreateTeamRequestInput = z.infer<typeof createTeamRequestSchema>;
export type RespondTeamRequestInput = z.infer<typeof respondTeamRequestSchema>;
