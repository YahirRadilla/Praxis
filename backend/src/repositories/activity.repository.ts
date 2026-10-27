import type { ActivityPriority, ActivityStatus, Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";

type TxClient = Prisma.TransactionClient;

export const activityInclude = {
  owner: { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
  labels: { include: { label: true } },
} satisfies Prisma.ActivityInclude;

// Board LIST include: adds cheap counts/labels/checklist-done-booleans on top
// of the base include, without eagerly loading full checklist/comment/attachment
// detail (that belongs to activityFullInclude below, used only by the detail
// endpoint) so the board's main query stays light.
const activityBoardInclude = {
  ...activityInclude,
  _count: { select: { comments: true, attachments: true } },
  checklistItems: { select: { done: true } },
  labels: { include: { label: true } },
} satisfies Prisma.ActivityInclude;

// Detail-endpoint include: eagerly loads everything needed for the full
// activity detail view (checklist sections + their items, un-sectioned
// checklist items, comments, attachments, labels, events) plus the project
// shape assertProjectReadable/guards expect.
const activityFullInclude = {
  owner: { select: { id: true, name: true } },
  assignees: { include: { user: { select: { id: true, name: true } } } },
  labels: { include: { label: true } },
  checklistSections: {
    include: { items: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  },
  checklistItems: { where: { sectionId: null }, orderBy: { position: "asc" } },
  comments: {
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  attachments: { orderBy: { createdAt: "desc" } },
  events: {
    include: { actor: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
  project: { select: { id: true, status: true, ownerId: true, visibility: true } },
} satisfies Prisma.ActivityInclude;

export interface CreateActivityData {
  projectId: number;
  ownerId: number;
  title: string;
  description?: string;
  dueDate: Date;
  priority?: ActivityPriority;
  status?: ActivityStatus;
  position: number;
  assigneeIds?: number[];
  labelIds?: number[];
}

export function countActivitiesInColumn(projectId: number, status: ActivityStatus) {
  return prisma.activity.count({ where: { projectId, status } });
}

export function runTransaction<T>(fn: (tx: TxClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn);
}

export function createActivity(data: CreateActivityData) {
  const { assigneeIds, labelIds, ...rest } = data;
  return prisma.activity.create({
    data: {
      ...rest,
      assignees: { create: (assigneeIds ?? []).map((userId) => ({ userId })) },
      labels: { create: (labelIds ?? []).map((labelId) => ({ labelId })) },
    },
    include: activityInclude,
  });
}

export function findActivityById(id: number) {
  return prisma.activity.findUnique({ where: { id }, include: activityInclude });
}

export function findActivityWithProject(id: number) {
  return prisma.activity.findUnique({
    where: { id },
    include: {
      ...activityInclude,
      project: { select: { id: true, status: true, ownerId: true, visibility: true } },
    },
  });
}

export interface UpdateActivityData {
  title?: string;
  description?: string;
  dueDate?: Date;
  priority?: ActivityPriority;
  assigneeIds?: number[];
  labelIds?: number[];
}

export async function updateActivity(id: number, data: UpdateActivityData) {
  const { assigneeIds, labelIds, ...rest } = data;

  if (assigneeIds) {
    await prisma.activityAssignee.deleteMany({ where: { activityId: id } });
  }
  if (labelIds) {
    await prisma.activityLabel.deleteMany({ where: { activityId: id } });
  }

  return prisma.activity.update({
    where: { id },
    data: {
      ...rest,
      ...(assigneeIds
        ? { assignees: { create: assigneeIds.map((userId) => ({ userId })) } }
        : {}),
      ...(labelIds
        ? { labels: { create: labelIds.map((labelId) => ({ labelId })) } }
        : {}),
    },
    include: activityInclude,
  });
}

export function deleteActivity(id: number) {
  return prisma.activity.delete({ where: { id } });
}

export function listActivitiesByProject(projectId: number) {
  return prisma.activity.findMany({
    where: { projectId },
    include: activityBoardInclude,
    orderBy: [{ status: "asc" }, { position: "asc" }],
  });
}

export function findActivityFullDetail(id: number) {
  return prisma.activity.findUnique({ where: { id }, include: activityFullInclude });
}

export function listActivitiesByProjectAndStatus(
  projectId: number,
  status: ActivityStatus,
  tx: TxClient = prisma,
) {
  return tx.activity.findMany({
    where: { projectId, status },
    select: { id: true, position: true },
    orderBy: { position: "asc" },
  });
}

export function updateActivityPosition(
  id: number,
  status: ActivityStatus,
  position: number,
  tx: TxClient = prisma,
  completedAt?: Date | null,
) {
  return tx.activity.update({
    where: { id },
    data: {
      status,
      position,
      ...(completedAt !== undefined ? { completedAt } : {}),
    },
  });
}

export interface CreateActivityEventData {
  activityId: number;
  actorId: number;
  fromStatus: ActivityStatus | null;
  toStatus: ActivityStatus;
}

export function createActivityEvent(data: CreateActivityEventData, tx: TxClient = prisma) {
  return tx.activityEvent.create({ data });
}

// --- Checklist sections ---------------------------------------------------

export function countChecklistSections(activityId: number) {
  return prisma.checklistSection.count({ where: { activityId } });
}

export function createChecklistSection(activityId: number, name: string, position: number) {
  return prisma.checklistSection.create({ data: { activityId, name, position } });
}

export function findChecklistSectionById(id: number) {
  return prisma.checklistSection.findUnique({ where: { id } });
}

export interface UpdateChecklistSectionData {
  name?: string;
  position?: number;
}

export function updateChecklistSection(id: number, data: UpdateChecklistSectionData) {
  return prisma.checklistSection.update({ where: { id }, data });
}

export async function deleteChecklistSectionKeepingItems(sectionId: number) {
  return runTransaction(async (tx) => {
    await tx.checklistItem.updateMany({
      where: { sectionId },
      data: { sectionId: null },
    });
    await tx.checklistSection.delete({ where: { id: sectionId } });
  });
}

// --- Checklist items -------------------------------------------------------

export function countChecklistItemsInScope(activityId: number, sectionId: number | null) {
  return prisma.checklistItem.count({ where: { activityId, sectionId } });
}

export interface CreateChecklistItemData {
  activityId: number;
  text: string;
  note?: string;
  sectionId?: number;
  position: number;
}

export function createChecklistItem(data: CreateChecklistItemData) {
  return prisma.checklistItem.create({ data });
}

export function findChecklistItemById(id: number) {
  return prisma.checklistItem.findUnique({ where: { id } });
}

export interface UpdateChecklistItemData {
  text?: string;
  note?: string;
  sectionId?: number | null;
  position?: number;
  done?: boolean;
  doneById?: number | null;
  doneAt?: Date | null;
}

export function updateChecklistItem(id: number, data: UpdateChecklistItemData) {
  return prisma.checklistItem.update({ where: { id }, data });
}

export function deleteChecklistItem(id: number) {
  return prisma.checklistItem.delete({ where: { id } });
}

// --- Comments ---------------------------------------------------------------

export interface CreateActivityCommentData {
  activityId: number;
  authorId: number;
  text: string;
}

const activityCommentInclude = {
  author: { select: { id: true, name: true } },
} satisfies Prisma.ActivityCommentInclude;

export function createActivityComment(data: CreateActivityCommentData) {
  return prisma.activityComment.create({ data, include: activityCommentInclude });
}

export function findActivityCommentById(id: number) {
  return prisma.activityComment.findUnique({ where: { id } });
}

export function deleteActivityComment(id: number) {
  return prisma.activityComment.delete({ where: { id } });
}

// --- Attachments --------------------------------------------------------

export interface CreateActivityAttachmentData {
  activityId: number;
  uploaderId: number;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
}

export function createActivityAttachment(data: CreateActivityAttachmentData) {
  return prisma.activityAttachment.create({ data });
}

export function findActivityAttachmentById(id: number) {
  return prisma.activityAttachment.findUnique({ where: { id } });
}

export function deleteActivityAttachment(id: number) {
  return prisma.activityAttachment.delete({ where: { id } });
}

// --- Cross-project "mis tareas" -------------------------------------------

export interface ListMyActivitiesFilters {
  status?: ActivityStatus;
  projectId?: number;
}

export function listActivitiesAssignedToUser(userId: number, filters: ListMyActivitiesFilters = {}) {
  return prisma.activityAssignee.findMany({
    where: {
      userId,
      activity: {
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.projectId ? { projectId: filters.projectId } : {}),
        project: {
          OR: [{ ownerId: userId }, { teamRequests: { some: { userId, status: "ACCEPTED" } } }],
        },
      },
    },
    include: {
      activity: {
        include: {
          project: { select: { id: true, name: true, status: true } },
          labels: { include: { label: true } },
        },
      },
    },
    orderBy: { assignedAt: "desc" },
  });
}
