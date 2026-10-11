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
    include: { evidence: true, author: { select: { id: true, name: true } }, activity: true },
    orderBy: { createdAt: "desc" },
  });
}

export function listFeedUpdates() {
  return prisma.progressUpdate.findMany({
    where: {
      postedToFeed: true,
      project: { visibility: "PUBLIC", status: { notIn: ["DRAFT", "ARCHIVED"] } },
    },
    include: {
      evidence: true,
      author: { select: { id: true, name: true } },
      activity: true,
      project: { select: { id: true, name: true, sdgs: { include: { sdg: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
