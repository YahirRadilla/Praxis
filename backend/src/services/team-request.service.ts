import type { AccountType, TeamRequestRole } from "@prisma/client";
import {
  createTeamRequest,
  findTeamRequestById,
  findTeamRequestByProjectAndUser,
  listPendingRequestsForOwner,
  listTeamRequestsByProject,
  updateTeamRequestStatus,
} from "../repositories/team-request.repository";
import { findProjectById } from "../repositories/project.repository";
import { findUserById } from "../repositories/user.repository";
import { HttpError } from "../types/http-error";
import type { CreateTeamRequestInput } from "../schemas/team-request.schema";

function roleForAccountType(accountType: AccountType): TeamRequestRole {
  if (accountType === "TEACHER") return "TEACHER";
  if (accountType === "ORGANIZATION") return "ORGANIZATION";
  return "COLLABORATOR";
}

export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
  const project = await findProjectById(projectId);
  if (!project) return false;
  if (project.ownerId === userId) return true;

  const request = await findTeamRequestByProjectAndUser(projectId, userId);
  return request?.status === "ACCEPTED";
}

export async function requestToJoin(
  projectId: number,
  userId: number,
  input: CreateTeamRequestInput,
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId === userId) {
    throw new HttpError(409, "Ya sos el responsable de este proyecto.");
  }

  const existing = await findTeamRequestByProjectAndUser(projectId, userId);
  if (existing) {
    throw new HttpError(409, "Ya enviaste una solicitud para este proyecto.");
  }

  const user = await findUserById(userId);
  const role = roleForAccountType(user!.accountType);

  return createTeamRequest(projectId, userId, role, input.message);
}

export async function respondToRequest(
  requestId: number,
  actingUserId: number,
  status: "ACCEPTED" | "REJECTED",
) {
  const request = await findTeamRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Solicitud no encontrada.");
  }
  if (request.project.ownerId !== actingUserId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede resolver solicitudes.");
  }
  if (request.status !== "PENDING") {
    throw new HttpError(409, "Esta solicitud ya fue resuelta.");
  }

  return updateTeamRequestStatus(requestId, status);
}

export async function listPendingRequests(projectId: number, actingUserId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== actingUserId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede ver las solicitudes.");
  }

  return listTeamRequestsByProject(projectId, "PENDING");
}

export async function listReceivedRequests(ownerId: number) {
  return listPendingRequestsForOwner(ownerId);
}

export async function listTeam(projectId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }

  const accepted = await listTeamRequestsByProject(projectId, "ACCEPTED");

  return [
    {
      id: project.owner.id,
      name: project.owner.name,
      email: project.owner.email,
      accountType: project.owner.accountType,
      role: "OWNER" as const,
    },
    ...accepted.map((request) => ({
      id: request.user.id,
      name: request.user.name,
      email: request.user.email,
      accountType: request.user.accountType,
      role: request.role,
    })),
  ];
}
