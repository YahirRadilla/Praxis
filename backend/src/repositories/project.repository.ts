import type { Prisma, ProjectStatus, ProjectVisibility } from "@prisma/client";
import { prisma } from "./prisma-client";

export const projectInclude = {
  owner: { select: { id: true, name: true, email: true, accountType: true } },
  teacher: { select: { id: true, name: true, email: true, accountType: true } },
  organization: { select: { id: true, name: true, email: true, accountType: true } },
  challenge: { select: { id: true, title: true } },
  sdgs: { include: { sdg: true } },
  categories: { include: { category: true } },
} satisfies Prisma.ProjectInclude;

export interface CreateProjectData {
  name: string;
  description: string;
  problemStatement: string;
  objectives: string;
  ownerId: number;
  teacherId?: number;
  organizationId?: number;
  challengeId?: number;
  sdgIds: number[];
  categoryIds: number[];
  visibility?: ProjectVisibility;
}

export function createProject(data: CreateProjectData) {
  const { sdgIds, categoryIds, ...rest } = data;
  return prisma.project.create({
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

export interface UpdateProjectData {
  name?: string;
  description?: string;
  problemStatement?: string;
  objectives?: string;
  teacherId?: number | null;
  organizationId?: number | null;
  status?: ProjectStatus;
  visibility?: ProjectVisibility;
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
  const where: Prisma.ProjectWhereInput = {
    status: "PUBLISHED",
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
