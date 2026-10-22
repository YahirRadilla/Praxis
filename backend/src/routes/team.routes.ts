import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  inviteToTeamHandler,
  listPendingRequestsHandler,
  requestToJoinHandler,
} from "../controllers/team-request.controller";

export const teamRoutes = Router({ mergeParams: true });

teamRoutes.post("/", requireAuth, requestToJoinHandler);
teamRoutes.post("/invite", requireAuth, inviteToTeamHandler);
teamRoutes.get("/", requireAuth, listPendingRequestsHandler);
