import type { DictamenVerdict } from "@prisma/client";
import { prisma } from "./prisma-client";

export const dictamenInclude = {
  evaluator: { select: { id: true, name: true, email: true, accountType: true } },
} as const;

export interface CreateDictamenData {
  projectId: number;
  evaluatorId: number;
  verdict: DictamenVerdict;
  comment: string;
}

export function createDictamen(data: CreateDictamenData) {
  return prisma.dictamen.create({ data, include: dictamenInclude });
}

export function findDictamenByProjectAndEvaluator(projectId: number, evaluatorId: number) {
  return prisma.dictamen.findUnique({
    where: { projectId_evaluatorId: { projectId, evaluatorId } },
  });
}

export function listDictamenesByProject(projectId: number) {
  return prisma.dictamen.findMany({
    where: { projectId },
    include: dictamenInclude,
    orderBy: { createdAt: "asc" },
  });
}
