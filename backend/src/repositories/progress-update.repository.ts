import { prisma } from "./prisma-client";

export interface EvidenceInput {
  type: "FILE" | "LINK";
  url: string;
  fileName?: string;
}

export interface CreateProgressUpdateData {
  projectId: number;
  authorId: number;
  activityId?: number;
  text: string;
  postedToFeed?: boolean;
  evidence?: EvidenceInput[];
}

export function createProgressUpdate(data: CreateProgressUpdateData) {
  const { evidence, ...rest } = data;
  return prisma.progressUpdate.create({
    data: {
      ...rest,
      ...(evidence && evidence.length > 0 ? { evidence: { create: evidence } } : {}),
    },
    include: { evidence: true, author: { select: { id: true, name: true } } },
  });
}

export function listProgressUpdatesByProject(projectId: number) {
  return prisma.progressUpdate.findMany({
    where: { projectId },
    include: {
      evidence: true,
      author: { select: { id: true, name: true } },
      // WU-10: progress updates stay public, but the linked activity's
      // title/description are board-insider-only (decision #10) — trim to
      // just `{ id, title }` instead of leaking the full activity record.
      activity: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export interface ListFeedFilters {
  categoryId?: number;
}

export function listFeedUpdates(filters: ListFeedFilters = {}) {
  return prisma.progressUpdate.findMany({
    where: {
      postedToFeed: true,
      project: {
        visibility: "PUBLIC",
        archived: false,
        ...(filters.categoryId ? { categories: { some: { categoryId: filters.categoryId } } } : {}),
      },
    },
    include: {
      evidence: true,
      author: { select: { id: true, name: true } },
      activity: true,
      project: {
        select: {
          id: true,
          name: true,
          sdgs: { include: { sdg: true } },
          categories: { include: { category: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
