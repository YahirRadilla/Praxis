import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { listReceivedInvitesHandler } from "../controllers/team-request.controller";

export const teamInviteRoutes = Router();

teamInviteRoutes.get("/received", requireAuth, listReceivedInvitesHandler);
