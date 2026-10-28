import type { Request, Response, NextFunction } from "express";
import * as progressUpdateService from "../services/progress-update.service";
import { feedQuerySchema } from "../schemas/progress-update.schema";

export async function listFeedHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { categoryId } = feedQuerySchema.parse(req.query);
    const feed = await progressUpdateService.listFeed(categoryId);
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
}
