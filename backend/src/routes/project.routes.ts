import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  archiveProjectHandler,
  createProjectHandler,
  getProjectHandler,
  listMyProjectsHandler,
  searchProjectsHandler,
  unarchiveProjectHandler,
  updateProjectHandler,
} from "../controllers/project.controller";
import {
  leaveTeamHandler,
  listTeamHandler,
  removeTeamMemberHandler,
} from "../controllers/team-request.controller";
import {
  listSavedProjectsHandler,
  saveProjectHandler,
  unsaveProjectHandler,
} from "../controllers/saved-project.controller";
import { teamRoutes } from "./team.routes";
import { activityRoutes } from "./activity.routes";
import { progressUpdateRoutes } from "./progress-update.routes";
import { dictamenRoutes } from "./dictamen.routes";
import { labelRoutes } from "./label.routes";
import { projectResourceRoutes } from "./project-resource.routes";

export const projectRoutes = Router();

projectRoutes.post("/", requireAuth, createProjectHandler);
projectRoutes.get("/", searchProjectsHandler);
projectRoutes.get("/mine", requireAuth, listMyProjectsHandler);
projectRoutes.get("/saved", requireAuth, listSavedProjectsHandler);
projectRoutes.get("/:id", optionalAuth, getProjectHandler);
projectRoutes.patch("/:id", requireAuth, updateProjectHandler);
projectRoutes.post("/:id/archive", requireAuth, archiveProjectHandler);
projectRoutes.post("/:id/unarchive", requireAuth, unarchiveProjectHandler);
projectRoutes.post("/:id/save", requireAuth, saveProjectHandler);
projectRoutes.delete("/:id/save", requireAuth, unsaveProjectHandler);

projectRoutes.get("/:projectId/team", optionalAuth, listTeamHandler);
// "/team/me" must be registered before "/team/:userId": both patterns match
// the literal path "/team/me", and Express resolves them in registration
// order.
projectRoutes.delete("/:projectId/team/me", requireAuth, leaveTeamHandler);
projectRoutes.delete("/:projectId/team/:userId", requireAuth, removeTeamMemberHandler);
projectRoutes.use("/:projectId/team-requests", teamRoutes);
projectRoutes.use("/:projectId/activities", activityRoutes);
projectRoutes.use("/:projectId/progress-updates", progressUpdateRoutes);
projectRoutes.use("/:projectId/dictamenes", dictamenRoutes);
projectRoutes.use("/:projectId/labels", labelRoutes);
projectRoutes.use("/:projectId/resources", projectResourceRoutes);
