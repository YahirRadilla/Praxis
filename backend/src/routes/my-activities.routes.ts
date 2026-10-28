import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { listMyActivitiesHandler } from "../controllers/my-activities.controller";

export const myActivitiesRoutes = Router();

myActivitiesRoutes.get("/", requireAuth, listMyActivitiesHandler);
