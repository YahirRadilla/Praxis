import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createProgressUpdateHandler,
  listProgressUpdatesHandler,
} from "../controllers/progress-update.controller";

export const progressUpdateRoutes = Router({ mergeParams: true });

progressUpdateRoutes.post("/", requireAuth, createProgressUpdateHandler);
progressUpdateRoutes.get("/", optionalAuth, listProgressUpdatesHandler);
