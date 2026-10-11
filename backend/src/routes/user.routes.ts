import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { getMeHandler, updateMeHandler, searchUsersHandler } from "../controllers/user.controller";

export const userRoutes = Router();

userRoutes.get("/me", requireAuth, getMeHandler);
userRoutes.patch("/me", requireAuth, updateMeHandler);
userRoutes.get("/", requireAuth, searchUsersHandler);
