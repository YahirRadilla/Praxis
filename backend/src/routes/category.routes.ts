import { Router } from "express";
import { listCategoriesHandler } from "../controllers/category.controller";

export const categoryRoutes = Router();

categoryRoutes.get("/", listCategoriesHandler);
