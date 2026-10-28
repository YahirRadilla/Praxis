import type { Prisma, ProjectVisibility } from "@prisma/client";
import { prisma } from "./prisma-client";

type TxClient = Prisma.TransactionClient;

// Plan decision #11 (WU-13): emails are hidden from outsiders by default.
// `projectInclude` never selects them; `projectIncludeWithEmail` is used
// only at the specific call sites that already confirmed the requester is
// an insider (owner, accepted member, or confirmed evaluator) of THIS
// project — currently just `getProject`.
const personSelect = { id: true, name: true, accountType: true } as const;
const personSelectWithEmail = { id: true, name: true, email: true, accountType: true } as const;

export const projectInclude = {
  owner: { select: personSelect },
  teacher: { select: personSelect },
  organization: { select: personSelect },
  challenge: { select: { id: true, title: true } },
  sdgs: { include: { sdg: true } },
  categories: { include: { category: true } },
} satisfies Prisma.ProjectInclude;

export const projectIncludeWithEmail = {
  ...projectInclude,
  owner: { select: personSelectWithEmail },
  teacher: { select: personSelectWithEmail },
  organization: { select: personSelectWithEmail },
} satisfies Prisma.ProjectInclude;

export interface CreateProjectData {
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  ownerId: number;
  // `teacherId`/`organizationId` are intentionally absent: they're only ever
  // filled by accepting an EVALUATOR-purpose TeamRequest (see
  // claimEvaluatorSlot below), never at creation (plan decision #6).
  challengeId?: number;
  sdgIds: number[];
  categoryIds: number[];
  visibility?: ProjectVisibility;
}

export function createProject(data: CreateProjectData, tx: TxClient = prisma) {
  const { sdgIds, categoryIds, ...rest } = data;
  return tx.project.create({
    data: {
      ...rest,
      sdgs: { create: sdgIds.map((sdgId) => ({ sdgId })) },
      categories: { create: categoryIds.map((categoryId) => ({ categoryId })) },
    },
    include: projectInclude,
  });
}

export function findProjectById(id: number) {
  return prisma.project.findUnique({ where: { id }, include: projectInclude });
}

/** Same lookup, but with owner/teacher/organization emails — only call this
 * once the requester has already been confirmed as an insider (plan
 * decision #11, WU-13). */
export function findProjectByIdWithEmail(id: number) {
  return prisma.project.findUnique({ where: { id }, include: projectIncludeWithEmail });
}

export interface UpdateProjectData {
  name?: string;
  description?: string;
  problemStatement?: string;
  objectives?: string;
  extendedInfo?: string | null;
  teacherId?: number | null;
  organizationId?: number | null;
  visibility?: ProjectVisibility;
  archived?: boolean;
  archivedAt?: Date | null;
  sdgIds?: number[];
  categoryIds?: number[];
}

export async function updateProject(id: number, data: UpdateProjectData) {
  const { sdgIds, categoryIds, ...rest } = data;

  if (sdgIds) {
    await prisma.projectSdg.deleteMany({ where: { projectId: id } });
  }
  if (categoryIds) {
    await prisma.projectCategory.deleteMany({ where: { projectId: id } });
  }

  return prisma.project.update({
    where: { id },
    data: {
      ...rest,
      ...(sdgIds ? { sdgs: { create: sdgIds.map((sdgId) => ({ sdgId })) } } : {}),
      ...(categoryIds
        ? { categories: { create: categoryIds.map((categoryId) => ({ categoryId })) } }
        : {}),
    },
    include: projectInclude,
  });
}

export type EvaluatorSlot = "teacherId" | "organizationId";

/**
 * Atomically fills a project's evaluator slot — but only if it's still
 * empty. Used by `respondToRequest` when accepting an EVALUATOR-purpose
 * TeamRequest: this is the ONLY place `teacherId`/`organizationId` are ever
 * written outside the seed script (plan decision #6). The `where` clause
 * doubles as the race guard — if someone else claimed the slot between the
 * invite and this accept, `count` comes back 0 and the caller rolls back.
 */
export async function claimEvaluatorSlot(
  projectId: number,
  slot: EvaluatorSlot,
  userId: number,
  tx: TxClient = prisma,
): Promise<number> {
  const result = await tx.project.updateMany({
    where: { id: projectId, [slot]: null },
    data: { [slot]: userId },
  });
  return result.count;
}

/**
 * Unconditionally clears an evaluator slot — used when an evaluator leaves
 * or is removed (WU-06). Unlike `claimEvaluatorSlot`, there's no race to
 * guard: whoever currently occupies the slot is the one being removed, by
 * the project owner or by themselves.
 */
export function clearEvaluatorSlot(
  projectId: number,
  slot: EvaluatorSlot,
  tx: TxClient = prisma,
) {
  return tx.project.update({
    where: { id: projectId },
    data: { [slot]: null },
  });
}

export interface SearchProjectsFilters {
  q?: string;
  sdgIds?: number[];
  categoryIds?: number[];
}

export function listProjectsForUser(userId: number) {
  return prisma.project.findMany({
    where: {
      OR: [
        { ownerId: userId },
        { teacherId: userId },
        { organizationId: userId },
        { teamRequests: { some: { userId, status: "ACCEPTED" } } },
      ],
    },
    include: projectInclude,
    orderBy: { updatedAt: "desc" },
  });
}

export function searchProjects(filters: SearchProjectsFilters) {
  // Public search includes archived projects (P1: archived stays discoverable,
  // like an archived GitHub repo) — it only filters by visibility.
  const where: Prisma.ProjectWhereInput = {
    visibility: "PUBLIC",
  };

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  if (filters.sdgIds?.length) {
    where.sdgs = { some: { sdgId: { in: filters.sdgIds } } };
  }

  if (filters.categoryIds?.length) {
    where.categories = { some: { categoryId: { in: filters.categoryIds } } };
  }

  return prisma.project.findMany({
    where,
    include: projectInclude,
    orderBy: { createdAt: "desc" },
  });
}
