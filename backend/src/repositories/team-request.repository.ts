import type { TeamRequestRole, TeamRequestStatus } from "@prisma/client";
import { prisma } from "./prisma-client";

const memberSelect = {
  id: true,
  name: true,
  email: true,
  accountType: true,
} as const;

export function findTeamRequestByProjectAndUser(projectId: number, userId: number) {
  return prisma.teamRequest.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
}

export function findTeamRequestById(id: number) {
  return prisma.teamRequest.findUnique({
    where: { id },
    include: { user: { select: memberSelect }, project: true },
  });
}

export function createTeamRequest(
  projectId: number,
  userId: number,
  role: TeamRequestRole,
  message?: string,
) {
  return prisma.teamRequest.create({
    data: { projectId, userId, role, message },
    include: { user: { select: memberSelect } },
  });
}

export function updateTeamRequestStatus(id: number, status: TeamRequestStatus) {
  return prisma.teamRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
    include: { user: { select: memberSelect } },
  });
}

export function listTeamRequestsByProject(projectId: number, status?: TeamRequestStatus) {
  return prisma.teamRequest.findMany({
    where: { projectId, ...(status ? { status } : {}) },
    include: { user: { select: memberSelect } },
    orderBy: { createdAt: "asc" },
  });
}

export function listPendingRequestsForOwner(ownerId: number) {
  return prisma.teamRequest.findMany({
    where: { status: "PENDING", project: { ownerId } },
    include: { user: { select: memberSelect }, project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
