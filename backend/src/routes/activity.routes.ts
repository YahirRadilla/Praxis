import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createActivityHandler,
  listActivitiesHandler,
  updateActivityStatusHandler,
} from "../controllers/activity.controller";

export const activityRoutes = Router({ mergeParams: true });

activityRoutes.post("/", requireAuth, createActivityHandler);
activityRoutes.get("/", optionalAuth, listActivitiesHandler);
activityRoutes.patch("/:activityId", requireAuth, updateActivityStatusHandler);
