import { Router } from "express";
import { listSdgsHandler } from "../controllers/sdg.controller";

export const sdgRoutes = Router();

sdgRoutes.get("/", listSdgsHandler);
