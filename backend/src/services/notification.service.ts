import type { NotificationType } from "@prisma/client";
import {
  countUnread,
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "../repositories/notification.repository";
import { HttpError } from "../types/http-error";

/**
 * Thin helper other services call right after the event they want surfaced
 * (a team request created, an activity assignee added, a Dictamen emitted,
 * ...). Intentionally fire-and-forget from the caller's perspective: it just
 * inserts a row, no delivery channel beyond this table.
 */
export function notifyUser(
  userId: number,
  type: NotificationType,
  message: string,
  link: string,
) {
  return createNotification({ userId, type, message, link });
}

export async function listNotifications(userId: number, unreadOnly?: boolean) {
  return listNotificationsForUser(userId, { unreadOnly });
}

export async function getUnreadCount(userId: number) {
  return countUnread(userId);
}

export async function markRead(id: number, userId: number) {
  const result = await markNotificationRead(id, userId);
  if (result.count === 0) {
    throw new HttpError(404, "Notificación no encontrada.");
  }
}

export async function markAllRead(userId: number) {
  await markAllNotificationsRead(userId);
}
