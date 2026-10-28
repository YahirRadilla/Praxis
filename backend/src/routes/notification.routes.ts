import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware";
import {
  getUnreadCountHandler,
  listNotificationsHandler,
  markAllNotificationsReadHandler,
  markNotificationReadHandler,
} from "../controllers/notification.controller";

export const notificationRoutes = Router();

notificationRoutes.get("/", requireAuth, listNotificationsHandler);
notificationRoutes.get("/unread-count", requireAuth, getUnreadCountHandler);
notificationRoutes.patch("/:id/read", requireAuth, markNotificationReadHandler);
notificationRoutes.post("/read-all", requireAuth, markAllNotificationsReadHandler);
