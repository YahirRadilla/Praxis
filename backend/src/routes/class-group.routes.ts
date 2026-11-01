import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createClassGroupHandler,
  getClassGroupHandler,
  joinClassGroupHandler,
  leaveClassGroupHandler,
  listClassGroupMembersHandler,
  listJoinedClassGroupsHandler,
  listMyClassGroupsHandler,
  removeClassGroupMemberHandler,
  searchClassGroupsHandler,
  updateClassGroupHandler,
} from "../controllers/class-group.controller";
import { classGroupResourceRoutes } from "./class-group-resource.routes";

export const classGroupRoutes = Router();

classGroupRoutes.post("/", requireAuth, createClassGroupHandler);
// Public search (preview tier only, viewer-independent): mirrors
// project.routes.ts's GET "/" (searchProjectsHandler) — no auth at all.
classGroupRoutes.get("/", searchClassGroupsHandler);
// "/mine" and "/joined" must be registered before "/:id": all three
// patterns match those literal paths, and Express resolves them in
// registration order (mirrors project.routes.ts's "/team/me" vs
// "/team/:userId" precedent).
classGroupRoutes.get("/mine", requireAuth, listMyClassGroupsHandler);
classGroupRoutes.get("/joined", requireAuth, listJoinedClassGroupsHandler);
classGroupRoutes.get("/:id", optionalAuth, getClassGroupHandler);
classGroupRoutes.patch("/:id", requireAuth, updateClassGroupHandler);

classGroupRoutes.post("/:id/members", requireAuth, joinClassGroupHandler);
// "/:id/members/me" must be registered before "/:id/members/:userId": both
// patterns match the literal path ".../members/me".
classGroupRoutes.delete("/:id/members/me", requireAuth, leaveClassGroupHandler);
classGroupRoutes.get("/:id/members", requireAuth, listClassGroupMembersHandler);
classGroupRoutes.delete("/:id/members/:userId", requireAuth, removeClassGroupMemberHandler);

classGroupRoutes.use("/:classGroupId/resources", classGroupResourceRoutes);
