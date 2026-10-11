import { prisma } from "./prisma-client";
import { projectInclude } from "./project.repository";

export function findSavedProject(userId: number, projectId: number) {
  return prisma.savedProject.findUnique({
    where: { userId_projectId: { userId, projectId } },
  });
}

export function createSavedProject(userId: number, projectId: number) {
  return prisma.savedProject.create({ data: { userId, projectId } });
}

export function deleteSavedProject(userId: number, projectId: number) {
  return prisma.savedProject.deleteMany({ where: { userId, projectId } });
}

export async function listSavedProjects(userId: number) {
  const saved = await prisma.savedProject.findMany({
    where: { userId },
    include: { project: { include: projectInclude } },
    orderBy: { createdAt: "desc" },
  });
  return saved.map((s) => s.project);
}
