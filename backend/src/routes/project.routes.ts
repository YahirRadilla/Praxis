import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createProjectHandler,
  getProjectHandler,
  listMyProjectsHandler,
  publishProjectHandler,
  searchProjectsHandler,
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

export const projectRoutes = Router();

projectRoutes.post("/", requireAuth, createProjectHandler);
projectRoutes.get("/", searchProjectsHandler);
projectRoutes.get("/mine", requireAuth, listMyProjectsHandler);
projectRoutes.get("/saved", requireAuth, listSavedProjectsHandler);
projectRoutes.get("/:id", getProjectHandler);
projectRoutes.patch("/:id", requireAuth, updateProjectHandler);
projectRoutes.post("/:id/publish", requireAuth, publishProjectHandler);
projectRoutes.post("/:id/save", requireAuth, saveProjectHandler);
projectRoutes.delete("/:id/save", requireAuth, unsaveProjectHandler);

projectRoutes.get("/:projectId/team", listTeamHandler);
projectRoutes.use("/:projectId/team-requests", teamRoutes);
projectRoutes.use("/:projectId/activities", activityRoutes);
projectRoutes.use("/:projectId/progress-updates", progressUpdateRoutes);
