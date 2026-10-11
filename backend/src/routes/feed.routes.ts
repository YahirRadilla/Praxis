import { Router } from "express";
import { listFeedHandler } from "../controllers/feed.controller";

export const feedRoutes = Router();

feedRoutes.get("/", listFeedHandler);
