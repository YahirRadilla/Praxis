import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  listReceivedRequestsHandler,
  respondToRequestHandler,
} from "../controllers/team-request.controller";

export const teamRequestRoutes = Router();

teamRequestRoutes.get("/received", requireAuth, listReceivedRequestsHandler);
teamRequestRoutes.patch("/:id", requireAuth, respondToRequestHandler);
