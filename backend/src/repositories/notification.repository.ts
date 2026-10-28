import type { NotificationType } from "@prisma/client";
import { prisma } from "./prisma-client";

export interface CreateNotificationData {
  userId: number;
  type: NotificationType;
  message: string;
  link: string;
}

export function createNotification(data: CreateNotificationData) {
  return prisma.notification.create({ data });
}

export function listNotificationsForUser(
  userId: number,
  options: { unreadOnly?: boolean } = {},
) {
  return prisma.notification.findMany({
    where: { userId, ...(options.unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
}

export function markNotificationRead(id: number, userId: number) {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { read: true },
  });
}

export function markAllNotificationsRead(userId: number) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

export function countUnread(userId: number) {
  return prisma.notification.count({ where: { userId, read: false } });
}
