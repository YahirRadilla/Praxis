import type { Request, Response, NextFunction } from "express";
import { createActivitySchema } from "../schemas/activity.schema";
import * as activityService from "../services/activity.service";

export async function createActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createActivitySchema.parse(req.body);
    const activity = await activityService.addActivity(
      Number(req.params.projectId),
      req.user!.sub,
      input,
    );
    res.status(201).json(activity);
  } catch (error) {
    next(error);
  }
}

export async function listActivitiesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const activities = await activityService.listActivities(Number(req.params.projectId));
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
}
