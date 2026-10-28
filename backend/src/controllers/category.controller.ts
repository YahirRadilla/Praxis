import type { Request, Response, NextFunction } from "express";
import { listCategories } from "../repositories/category.repository";

export async function listCategoriesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await listCategories();
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
}
