import type { Request, Response, NextFunction } from "express";
import * as progressUpdateService from "../services/progress-update.service";

export async function listFeedHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    const feed = await progressUpdateService.listFeed();
    res.status(200).json(feed);
  } catch (error) {
    next(error);
  }
}
