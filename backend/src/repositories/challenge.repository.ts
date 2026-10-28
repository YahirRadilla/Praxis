import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";
import { projectInclude } from "./project.repository";

export const challengeInclude = {
  organization: { select: { id: true, name: true, email: true, accountType: true } },
  sdgs: { include: { sdg: true } },
  projects: { include: projectInclude },
} satisfies Prisma.ChallengeInclude;

export interface CreateChallengeData {
  title: string;
  description: string;
  deadline?: Date;
  organizationId: number;
  sdgIds: number[];
}

export function createChallenge(data: CreateChallengeData) {
  const { sdgIds, ...rest } = data;
  return prisma.challenge.create({
    data: {
      ...rest,
      sdgs: { create: sdgIds.map((sdgId) => ({ sdgId })) },
    },
    include: challengeInclude,
  });
}

export function findChallengeById(id: number) {
  return prisma.challenge.findUnique({ where: { id }, include: challengeInclude });
}

export interface ListChallengesFilters {
  sdgIds?: number[];
}

export function listChallenges(filters: ListChallengesFilters) {
  const where: Prisma.ChallengeWhereInput = {};

  if (filters.sdgIds?.length) {
    where.sdgs = { some: { sdgId: { in: filters.sdgIds } } };
  }

  return prisma.challenge.findMany({
    where,
    include: challengeInclude,
    orderBy: { createdAt: "desc" },
  });
}
