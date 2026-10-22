import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  archiveProjectHandler,
  createProjectHandler,
  getProjectHandler,
  listMyProjectsHandler,
  publishProjectHandler,
  searchProjectsHandler,
  submitForReviewHandler,
  updateProjectHandler,
} from "../controllers/project.controller";
import { listTeamHandler } from "../controllers/team-request.controller";
import {
  listSavedProjectsHandler,
  saveProjectHandler,
  unsaveProjectHandler,
} from "../controllers/saved-project.controller";
import { teamRoutes } from "./team.routes";
import { activityRoutes } from "./activity.routes";
import { progressUpdateRoutes } from "./progress-update.routes";
import { dictamenRoutes } from "./dictamen.routes";

export const projectRoutes = Router();

projectRoutes.post("/", requireAuth, createProjectHandler);
projectRoutes.get("/", searchProjectsHandler);
projectRoutes.get("/mine", requireAuth, listMyProjectsHandler);
projectRoutes.get("/saved", requireAuth, listSavedProjectsHandler);
projectRoutes.get("/:id", optionalAuth, getProjectHandler);
projectRoutes.patch("/:id", requireAuth, updateProjectHandler);
projectRoutes.post("/:id/publish", requireAuth, publishProjectHandler);
projectRoutes.post("/:id/submit-review", requireAuth, submitForReviewHandler);
projectRoutes.post("/:id/archive", requireAuth, archiveProjectHandler);
projectRoutes.post("/:id/save", requireAuth, saveProjectHandler);
projectRoutes.delete("/:id/save", requireAuth, unsaveProjectHandler);

projectRoutes.get("/:projectId/team", optionalAuth, listTeamHandler);
projectRoutes.use("/:projectId/team-requests", teamRoutes);
projectRoutes.use("/:projectId/activities", activityRoutes);
projectRoutes.use("/:projectId/progress-updates", progressUpdateRoutes);
projectRoutes.use("/:projectId/dictamenes", dictamenRoutes);
