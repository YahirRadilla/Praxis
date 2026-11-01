import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createClassGroupResourceHandler,
  deleteClassGroupResourceHandler,
} from "../controllers/class-group-resource.controller";

export const classGroupResourceRoutes = Router({ mergeParams: true });

classGroupResourceRoutes.post("/", requireAuth, createClassGroupResourceHandler);
classGroupResourceRoutes.delete("/:resourceId", requireAuth, deleteClassGroupResourceHandler);
