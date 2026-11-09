import { Router } from "express";
import { listFeedHandler } from "../controllers/feed.controller";
import { likePostHandler, unlikePostHandler } from "../controllers/post-like.controller";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";

export const feedRoutes = Router();

feedRoutes.get("/", optionalAuth, listFeedHandler);
feedRoutes.post("/:updateId/like", requireAuth, likePostHandler);
feedRoutes.delete("/:updateId/like", requireAuth, unlikePostHandler);
