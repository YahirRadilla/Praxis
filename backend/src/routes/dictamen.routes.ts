import { Router } from "express";
import { optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  createDictamenHandler,
  listDictamenesHandler,
} from "../controllers/dictamen.controller";

export const dictamenRoutes = Router({ mergeParams: true });

dictamenRoutes.post("/", requireAuth, createDictamenHandler);
dictamenRoutes.get("/", optionalAuth, listDictamenesHandler);
