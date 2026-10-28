import type { DictamenVerdict } from "@prisma/client";
import { prisma } from "./prisma-client";

// Plan decision #11 (WU-13): the evaluator's email is hidden by default.
// `listDictamenesByProject`'s only caller (`listDictamenes`) already gates
// on `assertProjectInsider` before calling it, so every row it returns is
// safe to include with email.
export const dictamenInclude = {
  evaluator: { select: { id: true, name: true, accountType: true } },
} as const;

const dictamenIncludeWithEmail = {
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

export function listDictamenesByProject(projectId: number) {
  return prisma.dictamen.findMany({
    where: { projectId },
    include: dictamenIncludeWithEmail,
    orderBy: { createdAt: "asc" },
  });
}
