import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createProjectResourceHandler,
  deleteProjectResourceHandler,
  listProjectResourcesHandler,
} from "../controllers/project-resource.controller";

export const projectResourceRoutes = Router({ mergeParams: true });

projectResourceRoutes.post("/", requireAuth, createProjectResourceHandler);
projectResourceRoutes.get("/", optionalAuth, listProjectResourcesHandler);
projectResourceRoutes.delete("/:resourceId", requireAuth, deleteProjectResourceHandler);
