import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createActivityAttachmentHandler,
  createActivityCommentHandler,
  createActivityHandler,
  createChecklistItemHandler,
  createChecklistSectionHandler,
  deleteActivityAttachmentHandler,
  deleteActivityCommentHandler,
  deleteActivityHandler,
  deleteChecklistItemHandler,
  deleteChecklistSectionHandler,
  getActivityDetailHandler,
  listActivitiesHandler,
  moveActivityHandler,
  updateActivityHandler,
  updateChecklistItemHandler,
  updateChecklistSectionHandler,
} from "../controllers/activity.controller";

export const activityRoutes = Router({ mergeParams: true });

activityRoutes.post("/", requireAuth, createActivityHandler);
activityRoutes.get("/", optionalAuth, listActivitiesHandler);
activityRoutes.get("/:activityId", optionalAuth, getActivityDetailHandler);
activityRoutes.patch("/:activityId", requireAuth, updateActivityHandler);
activityRoutes.delete("/:activityId", requireAuth, deleteActivityHandler);
activityRoutes.post("/:activityId/move", requireAuth, moveActivityHandler);

activityRoutes.post("/:activityId/checklist-sections", requireAuth, createChecklistSectionHandler);
activityRoutes.patch(
  "/:activityId/checklist-sections/:sectionId",
  requireAuth,
  updateChecklistSectionHandler,
);
activityRoutes.delete(
  "/:activityId/checklist-sections/:sectionId",
  requireAuth,
  deleteChecklistSectionHandler,
);

activityRoutes.post("/:activityId/checklist-items", requireAuth, createChecklistItemHandler);
activityRoutes.patch("/:activityId/checklist-items/:itemId", requireAuth, updateChecklistItemHandler);
activityRoutes.delete("/:activityId/checklist-items/:itemId", requireAuth, deleteChecklistItemHandler);

activityRoutes.post("/:activityId/comments", requireAuth, createActivityCommentHandler);
activityRoutes.delete("/:activityId/comments/:commentId", requireAuth, deleteActivityCommentHandler);

activityRoutes.post("/:activityId/attachments", requireAuth, createActivityAttachmentHandler);
activityRoutes.delete(
  "/:activityId/attachments/:attachmentId",
  requireAuth,
  deleteActivityAttachmentHandler,
);
