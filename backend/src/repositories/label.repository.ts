import { prisma } from "./prisma-client";

export interface CreateLabelData {
  projectId: number;
  name: string;
  colorHex: string;
}

export function createProjectLabel(data: CreateLabelData) {
  return prisma.projectLabel.create({ data });
}

export function findProjectLabelById(id: number) {
  return prisma.projectLabel.findUnique({ where: { id } });
}

export function listProjectLabels(projectId: number) {
  return prisma.projectLabel.findMany({
    where: { projectId },
    orderBy: { name: "asc" },
  });
}

export function countProjectLabelsByIds(projectId: number, labelIds: number[]) {
  return prisma.projectLabel.count({ where: { id: { in: labelIds }, projectId } });
}

export interface UpdateLabelData {
  name?: string;
  colorHex?: string;
}

export function updateProjectLabel(id: number, data: UpdateLabelData) {
  return prisma.projectLabel.update({ where: { id }, data });
}

export function deleteProjectLabel(id: number) {
  return prisma.projectLabel.delete({ where: { id } });
}
