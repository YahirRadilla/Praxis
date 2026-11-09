import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  createChallengeHandler,
  getChallengeHandler,
  listChallengesHandler,
  updateChallengeHandler,
} from "../controllers/challenge.controller";

export const challengeRoutes = Router();

challengeRoutes.post("/", requireAuth, createChallengeHandler);
challengeRoutes.get("/", listChallengesHandler);
challengeRoutes.get("/:id", getChallengeHandler);
challengeRoutes.patch("/:id", requireAuth, updateChallengeHandler);
