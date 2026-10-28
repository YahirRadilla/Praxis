import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createLabelHandler,
  deleteLabelHandler,
  listLabelsHandler,
  updateLabelHandler,
} from "../controllers/label.controller";

export const labelRoutes = Router({ mergeParams: true });

labelRoutes.get("/", optionalAuth, listLabelsHandler);
labelRoutes.post("/", requireAuth, createLabelHandler);
labelRoutes.patch("/:labelId", requireAuth, updateLabelHandler);
labelRoutes.delete("/:labelId", requireAuth, deleteLabelHandler);
