import type { ActivityStatus } from "@prisma/client";
import { prisma } from "./prisma-client";

export interface CreateActivityData {
  projectId: number;
  ownerId: number;
  title: string;
  description?: string;
  dueDate: Date;
  assigneeId?: number;
}

export function createActivity(data: CreateActivityData) {
  return prisma.activity.create({ data });
}

export function updateActivityStatus(id: number, status: ActivityStatus) {
  return prisma.activity.update({ where: { id }, data: { status } });
}

export function listActivitiesByProject(projectId: number) {
  return prisma.activity.findMany({
    where: { projectId },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { dueDate: "asc" },
  });
}

export function findActivityById(id: number) {
  return prisma.activity.findUnique({ where: { id } });
}
