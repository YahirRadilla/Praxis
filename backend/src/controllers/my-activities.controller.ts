import type { Request, Response, NextFunction } from "express";
import { listMyActivitiesQuerySchema } from "../schemas/my-activities.schema";
import { listMyActivities } from "../services/activity.service";

export async function listMyActivitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listMyActivitiesQuerySchema.parse(req.query);
    const activities = await listMyActivities(req.user!.sub, query);
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
}
