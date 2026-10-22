import type { Request, Response, NextFunction } from "express";
import { createProgressUpdateSchema } from "../schemas/progress-update.schema";
import * as progressUpdateService from "../services/progress-update.service";

export async function createProgressUpdateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createProgressUpdateSchema.parse(req.body);
    const update = await progressUpdateService.addProgressUpdate(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(update);
  } catch (error) {
    next(error);
  }
}

export async function listProgressUpdatesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const updates = await progressUpdateService.listProgressUpdates(
      Number(req.params.projectId),
      req.user?.sub,
    );
    res.status(200).json(updates);
  } catch (error) {
    next(error);
  }
}
