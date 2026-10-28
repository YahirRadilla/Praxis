import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";

// Public, non-archived projects: Impact stats about projects nobody can see,
// or about archived (read-only, no longer active) ones, would be misleading,
// so every metric below is scoped to this set (P1: archived projects drop out
// of Impacto's metrics, unlike public search which still lists them).
const publicProjectWhere: Prisma.ProjectWhereInput = {
  visibility: "PUBLIC",
  archived: false,
};

export function countPublicProjects() {
  return prisma.project.count({ where: publicProjectWhere });
}

export function countAcceptedTeamRequests() {
  return prisma.teamRequest.count({ where: { status: "ACCEPTED", purpose: "MEMBER" } });
}

export async function countPublicProjectsWithProgressUpdates() {
  const rows = await prisma.progressUpdate.findMany({
    where: { project: publicProjectWhere },
    distinct: ["projectId"],
    select: { projectId: true },
  });
  return rows.length;
}

// A project has "multiple members" when owner (always 1) + at least one
// ACCEPTED team request > 1, i.e. it has at least one accepted team request.
export async function countPublicProjectsWithMultipleMembers() {
  const rows = await prisma.teamRequest.findMany({
    where: { status: "ACCEPTED", purpose: "MEMBER", project: publicProjectWhere },
    distinct: ["projectId"],
    select: { projectId: true },
  });
  return rows.length;
}

export async function countPublicProjectsWithSignedEvaluation() {
  const rows = await prisma.dictamen.findMany({
    where: { project: publicProjectWhere },
    distinct: ["projectId"],
    select: { projectId: true },
  });
  return rows.length;
}

export async function countChallengesWithProposals() {
  const [total, withProposals] = await Promise.all([
    prisma.challenge.count(),
    prisma.challenge.count({ where: { projects: { some: {} } } }),
  ]);
  return { total, withProposals };
}

export interface ImpactBreakdownRow {
  id: number;
  name: string;
  colorHex: string;
  count: number;
}

export async function getProjectsByCategory(): Promise<ImpactBreakdownRow[]> {
  const grouped = await prisma.projectCategory.groupBy({
    by: ["categoryId"],
    where: { project: publicProjectWhere },
    _count: { categoryId: true },
  });

  if (grouped.length === 0) return [];

  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
  });
  const byId = new Map(categories.map((c) => [c.id, c]));

  return grouped
    .map((g) => {
      const category = byId.get(g.categoryId);
      if (!category) return null;
      return { id: category.id, name: category.name, colorHex: category.colorHex, count: g._count.categoryId };
    })
    .filter((row): row is ImpactBreakdownRow => row !== null)
    .sort((a, b) => b.count - a.count);
}

export async function getProjectsBySdg(): Promise<ImpactBreakdownRow[]> {
  const grouped = await prisma.projectSdg.groupBy({
    by: ["sdgId"],
    where: { project: publicProjectWhere },
    _count: { sdgId: true },
  });

  if (grouped.length === 0) return [];

  const sdgs = await prisma.sdg.findMany({ where: { id: { in: grouped.map((g) => g.sdgId) } } });
  const byId = new Map(sdgs.map((s) => [s.id, s]));

  return grouped
    .map((g) => {
      const sdg = byId.get(g.sdgId);
      if (!sdg) return null;
      return { id: sdg.id, name: sdg.name, colorHex: sdg.colorHex, count: g._count.sdgId };
    })
    .filter((row): row is ImpactBreakdownRow => row !== null)
    .sort((a, b) => b.count - a.count);
}
