import { Router } from "express";
import { loginHandler, registerHandler, verifyGoogleHandler } from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";

export const authRoutes = Router();

authRoutes.post("/register", registerHandler);
authRoutes.post("/login", loginHandler);
authRoutes.post("/verify-google", requireAuth, verifyGoogleHandler);
