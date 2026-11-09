import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  getMeHandler,
  updateMeHandler,
  searchUsersHandler,
  getPublicProfileHandler,
  listUserPublicProjectsHandler,
} from "../controllers/user.controller";
import { followUserHandler, unfollowUserHandler } from "../controllers/follow.controller";

export const userRoutes = Router();

userRoutes.get("/me", requireAuth, getMeHandler);
userRoutes.patch("/me", requireAuth, updateMeHandler);
userRoutes.get("/", requireAuth, searchUsersHandler);

// Registered after /me so Express keeps matching the literal "/me" segment
// first — these :id routes would otherwise shadow it (e.g. "/me" matching
// :id="me"). /api/users/me/activities is mounted separately in app.ts, on
// its own sub-router, so it isn't affected either way.
userRoutes.get("/:id", optionalAuth, getPublicProfileHandler);
userRoutes.get("/:id/projects", listUserPublicProjectsHandler);
userRoutes.post("/:id/follow", requireAuth, followUserHandler);
userRoutes.delete("/:id/follow", requireAuth, unfollowUserHandler);
