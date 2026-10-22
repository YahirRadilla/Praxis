import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadSingleFile } from "../middleware/upload.middleware";
import { uploadFileHandler } from "../controllers/upload.controller";

export const uploadRoutes = Router();

uploadRoutes.post("/", requireAuth, uploadSingleFile, uploadFileHandler);
