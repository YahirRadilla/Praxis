import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";

// Retos are fully public (GET /challenges, GET /challenges/:id need no
// auth), so — like ClassGroup.projects — this only ever selects minimal,
// safe fields for the projects linked to a Reto and filters out PRIVATE
// ones: reusing the full `projectInclude` here would leak every field
// (description, problemStatement, team, etc.) of a private project to
// anyone, just because it's linked to a public Reto.
const challengeProjectSelect = {
  id: true,
  name: true,
  visibility: true,
  archived: true,
  bannerUrl: true,
} as const;

export const challengeInclude = {
  organization: { select: { id: true, name: true, email: true, accountType: true } },
  sdgs: { include: { sdg: true } },
  categories: { include: { category: true } },
  projects: { where: { visibility: "PUBLIC" }, select: challengeProjectSelect },
} satisfies Prisma.ChallengeInclude;

export interface CreateChallengeData {
  title: string;
  description: string;
  deadline?: Date;
  bannerUrl?: string | null;
  organizationId: number;
  sdgIds?: number[];
  categoryIds?: number[];
}

export function createChallenge(data: CreateChallengeData) {
  const { sdgIds, categoryIds, ...rest } = data;
  return prisma.challenge.create({
    data: {
      ...rest,
      sdgs: { create: (sdgIds ?? []).map((sdgId) => ({ sdgId })) },
      categories: { create: (categoryIds ?? []).map((categoryId) => ({ categoryId })) },
    },
    include: challengeInclude,
  });
}

export function findChallengeById(id: number) {
  return prisma.challenge.findUnique({ where: { id }, include: challengeInclude });
}

export function updateChallenge(id: number, data: { bannerUrl: string | null }) {
  return prisma.challenge.update({ where: { id }, data, include: challengeInclude });
}

export interface ListChallengesFilters {
  q?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}

export function listChallenges(filters: ListChallengesFilters) {
  const where: Prisma.ChallengeWhereInput = {};

  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.sdgIds?.length) {
    where.sdgs = { some: { sdgId: { in: filters.sdgIds } } };
  }

  if (filters.categoryIds?.length) {
    where.categories = { some: { categoryId: { in: filters.categoryIds } } };
  }

  return prisma.challenge.findMany({
    where,
    include: challengeInclude,
    orderBy: { createdAt: "desc" },
  });
}
