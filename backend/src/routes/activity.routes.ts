import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { createActivityHandler, listActivitiesHandler } from "../controllers/activity.controller";

export const activityRoutes = Router({ mergeParams: true });

activityRoutes.post("/", requireAuth, createActivityHandler);
activityRoutes.get("/", listActivitiesHandler);
