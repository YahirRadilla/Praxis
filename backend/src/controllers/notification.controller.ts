import type { Request, Response, NextFunction } from "express";
import * as notificationService from "../services/notification.service";

export async function listNotificationsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const unreadOnly = req.query.unreadOnly === "true";
    const notifications = await notificationService.listNotifications(req.user!.sub, unreadOnly);
    res.status(200).json(notifications);
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const count = await notificationService.getUnreadCount(req.user!.sub);
    res.status(200).json({ count });
  } catch (error) {
    next(error);
  }
}

export async function markNotificationReadHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await notificationService.markRead(Number(req.params.id), req.user!.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

export async function markAllNotificationsReadHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    await notificationService.markAllRead(req.user!.sub);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}
