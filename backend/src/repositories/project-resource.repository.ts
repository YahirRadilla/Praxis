import type { EvidenceType } from "@prisma/client";
import { prisma } from "./prisma-client";

export const projectResourceInclude = {
  creator: { select: { id: true, name: true } },
} as const;

export interface CreateProjectResourceData {
  projectId: number;
  creatorId: number;
  type: EvidenceType;
  url: string;
  label: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export function createProjectResource(data: CreateProjectResourceData) {
  return prisma.projectResource.create({ data, include: projectResourceInclude });
}

export function listProjectResourcesByProject(projectId: number) {
  return prisma.projectResource.findMany({
    where: { projectId },
    include: projectResourceInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findProjectResourceById(id: number) {
  return prisma.projectResource.findUnique({ where: { id } });
}

export function deleteProjectResource(id: number) {
  return prisma.projectResource.delete({ where: { id } });
}
