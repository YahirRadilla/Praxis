import type { Request, Response, NextFunction } from "express";
import {
  createActivityAttachmentSchema,
  createActivityCommentSchema,
  createActivitySchema,
  createChecklistItemSchema,
  createChecklistSectionSchema,
  moveActivitySchema,
  updateActivitySchema,
  updateChecklistItemSchema,
  updateChecklistSectionSchema,
} from "../schemas/activity.schema";
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
    const activities = await activityService.listActivities(
      Number(req.params.projectId),
      req.user?.sub,
    );
    res.status(200).json(activities);
  } catch (error) {
    next(error);
  }
}

export async function getActivityDetailHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const activity = await activityService.getActivityDetail(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user?.sub,
    );
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
}

export async function updateActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateActivitySchema.parse(req.body);
    const activity = await activityService.updateActivity(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
}

export async function deleteActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await activityService.deleteActivity(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function moveActivityHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = moveActivitySchema.parse(req.body);
    const activity = await activityService.moveActivity(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(200).json(activity);
  } catch (error) {
    next(error);
  }
}

// --- Checklist sections -----------------------------------------------------

export async function createChecklistSectionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createChecklistSectionSchema.parse(req.body);
    const section = await activityService.addChecklistSection(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(201).json(section);
  } catch (error) {
    next(error);
  }
}

export async function updateChecklistSectionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateChecklistSectionSchema.parse(req.body);
    const section = await activityService.renameChecklistSection(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.sectionId),
      req.user!.sub,
      input,
    );
    res.status(200).json(section);
  } catch (error) {
    next(error);
  }
}

export async function deleteChecklistSectionHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await activityService.deleteChecklistSection(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.sectionId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// --- Checklist items ---------------------------------------------------------

export async function createChecklistItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createChecklistItemSchema.parse(req.body);
    const item = await activityService.addChecklistItem(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

export async function updateChecklistItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = updateChecklistItemSchema.parse(req.body);
    const item = await activityService.updateChecklistItem(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.itemId),
      req.user!.sub,
      input,
    );
    res.status(200).json(item);
  } catch (error) {
    next(error);
  }
}

export async function deleteChecklistItemHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await activityService.deleteChecklistItem(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.itemId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// --- Comments -----------------------------------------------------------------

export async function createActivityCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createActivityCommentSchema.parse(req.body);
    const comment = await activityService.addActivityComment(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
}

export async function deleteActivityCommentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await activityService.deleteActivityComment(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.commentId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

// --- Attachments ---------------------------------------------------------------

export async function createActivityAttachmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createActivityAttachmentSchema.parse(req.body);
    const attachment = await activityService.addActivityAttachment(
      Number(req.params.projectId),
      Number(req.params.activityId),
      req.user!.sub,
      input,
    );
    res.status(201).json(attachment);
  } catch (error) {
    next(error);
  }
}

export async function deleteActivityAttachmentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await activityService.deleteActivityAttachment(
      Number(req.params.projectId),
      Number(req.params.activityId),
      Number(req.params.attachmentId),
      req.user!.sub,
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
