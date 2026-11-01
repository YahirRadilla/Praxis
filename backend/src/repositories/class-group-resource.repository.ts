import type { EvidenceType } from "@prisma/client";
import { prisma } from "./prisma-client";

export const classGroupResourceInclude = {
  creator: { select: { id: true, name: true } },
} as const;

export interface CreateClassGroupResourceData {
  classGroupId: number;
  creatorId: number;
  type: EvidenceType;
  url: string;
  label: string;
  description?: string;
  fileName?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export function createClassGroupResource(data: CreateClassGroupResourceData) {
  return prisma.classGroupResource.create({ data, include: classGroupResourceInclude });
}

export function listClassGroupResourcesByClassGroup(classGroupId: number) {
  return prisma.classGroupResource.findMany({
    where: { classGroupId },
    include: classGroupResourceInclude,
    orderBy: { createdAt: "desc" },
  });
}

export function findClassGroupResourceById(id: number) {
  return prisma.classGroupResource.findUnique({ where: { id } });
}

export function deleteClassGroupResource(id: number) {
  return prisma.classGroupResource.delete({ where: { id } });
}
