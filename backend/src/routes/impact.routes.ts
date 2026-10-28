import { Router } from "express";
import { getImpactHandler } from "../controllers/impact.controller";

export const impactRoutes = Router();

// Public, no auth: meant to be viewable by anyone, including a non-logged-in evaluator.
impactRoutes.get("/", getImpactHandler);
