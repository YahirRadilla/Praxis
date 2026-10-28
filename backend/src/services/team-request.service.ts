import type { AccountType, TeamRequestPurpose } from "@prisma/client";
import {
  createTeamRequest,
  deleteTeamRequest,
  findPendingEvaluatorInvite,
  findTeamRequestById,
  findTeamRequestByProjectAndUser,
  isAcceptedTeamMember,
  listPendingInvitesForUser,
  listPendingRequestsForOwner,
  listTeamRequestsByProject,
  listTeamRequestsByProjectWithEmail,
  reopenTeamRequest,
  updateTeamRequestStatus,
} from "../repositories/team-request.repository";
import {
  claimEvaluatorSlot,
  clearEvaluatorSlot,
  findProjectById,
  type EvaluatorSlot,
} from "../repositories/project.repository";
import { unassignUserFromProjectActivities } from "../repositories/activity.repository";
import { findUserById } from "../repositories/user.repository";
import { prisma } from "../repositories/prisma-client";
import {
  assertProjectNotArchived,
  assertProjectReadable,
  classifyEvaluatorInvite,
} from "./project.service";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";
import type { CreateTeamRequestInput } from "../schemas/team-request.schema";

export async function isProjectMember(projectId: number, userId: number): Promise<boolean> {
  const project = await findProjectById(projectId);
  if (!project) return false;
  if (project.ownerId === userId) return true;

  const request = await findTeamRequestByProjectAndUser(projectId, userId);
  // "Integrante real" = accepted AND purpose = MEMBER. An accepted EVALUATOR
  // row (teacher/organization linked via WU-05) is not team membership.
  return request?.status === "ACCEPTED" && request.purpose === "MEMBER";
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
  let request;
  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new HttpError(
        409,
        existing.purpose === "EVALUATOR"
          ? "Ya eres evaluador de este proyecto."
          : "Ya eres integrante de este proyecto.",
      );
    }
    if (existing.status === "PENDING") {
      throw new HttpError(409, "Ya enviaste una solicitud para este proyecto.");
    }
    // REJECTED: reuse the row instead of staying permanently blocked by
    // @@unique([projectId, userId]) (plan §2 decision #7, WU-06).
    request = await reopenTeamRequest(existing.id, {
      initiatedBy: "REQUESTER",
      purpose: "MEMBER",
      message: input.message,
    });
  } else {
    request = await createTeamRequest(projectId, userId, input.message);
  }

  const user = await findUserById(userId);

  await notifyUser(
    project.ownerId,
    "TEAM_REQUEST_RECEIVED",
    `${user!.name} solicitó unirse a tu proyecto "${project.name}".`,
    `/proyectos/${projectId}?tab=equipo`,
  );

  return request;
}

export async function inviteToTeam(
  projectId: number,
  ownerId: number,
  targetUserId: number,
  purpose: TeamRequestPurpose = "MEMBER",
) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== ownerId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede invitar integrantes.");
  }
  if (targetUserId === ownerId) {
    throw new HttpError(409, "Ya eres el responsable de este proyecto.");
  }

  const existing = await findTeamRequestByProjectAndUser(projectId, targetUserId);
  if (existing) {
    if (existing.status === "ACCEPTED") {
      throw new HttpError(
        409,
        existing.purpose === "EVALUATOR" ? "Ya es evaluador de este proyecto." : "Ya es parte del equipo.",
      );
    }
    if (existing.status === "PENDING") {
      throw new HttpError(409, "Ya existe una invitación o solicitud pendiente para este usuario.");
    }
    // existing.status === "REJECTED": falls through to the EVALUATOR
    // validation below (if applicable), then the row is reused (WU-06).
  }

  const targetUser = await findUserById(targetUserId);
  if (!targetUser) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  if (purpose === "EVALUATOR") {
    // Reuses the same account-type classification + assertValidTeacher/
    // assertValidOrganization validation as createProject's
    // evaluatorInviteIds path, so a wrong account type 400s immediately.
    const slot = await classifyEvaluatorInvite(targetUserId, ownerId);

    if (project[slot] !== null) {
      throw new HttpError(
        409,
        "Este proyecto ya tiene un evaluador vinculado en esa categoría.",
      );
    }

    const pendingEvaluator = await findPendingEvaluatorInvite(projectId, targetUser.accountType);
    if (pendingEvaluator) {
      throw new HttpError(
        409,
        "Ya existe una invitación de evaluador pendiente para esa categoría.",
      );
    }
  }

  const request = existing
    ? await reopenTeamRequest(existing.id, { initiatedBy: "OWNER", purpose })
    : await createTeamRequest(projectId, targetUserId, undefined, "OWNER", purpose);

  const message =
    purpose === "EVALUATOR"
      ? `${project.owner.name} te invitó a evaluar el proyecto "${project.name}".`
      : `${project.owner.name} te invitó a unirte al proyecto "${project.name}".`;

  // The recipient's accept/decline UI lives at /solicitudes-recibidas, not on
  // the project page itself — the old link was a dead end (WU-06).
  await notifyUser(targetUserId, "TEAM_INVITE_RECEIVED", message, "/solicitudes-recibidas");

  return request;
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

  if (request.initiatedBy === "OWNER") {
    if (request.userId !== actingUserId) {
      throw new HttpError(403, "Solo el usuario invitado puede responder a esta invitación.");
    }
  } else if (request.project.ownerId !== actingUserId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede resolver solicitudes.");
  }

  if (request.status !== "PENDING") {
    throw new HttpError(409, "Esta solicitud ya fue resuelta.");
  }

  if (status === "ACCEPTED" && request.purpose === "EVALUATOR") {
    // Accepting an EVALUATOR request is the ONLY place teacherId/
    // organizationId is ever filled for real (plan decision #6). The slot
    // claim and the status update happen in one transaction: if the slot
    // got filled by someone else since the invite was sent, roll back 409
    // instead of silently losing the race.
    const slot = request.user.accountType === "TEACHER" ? "teacherId" : "organizationId";

    return prisma.$transaction(async (tx) => {
      const claimed = await claimEvaluatorSlot(request.projectId, slot, request.userId, tx);
      if (claimed === 0) {
        throw new HttpError(
          409,
          "Este proyecto ya tiene un evaluador vinculado en esa categoría.",
        );
      }
      return updateTeamRequestStatus(requestId, "ACCEPTED", tx);
    });
  }

  const updated = await updateTeamRequestStatus(requestId, status);

  // Only the requester-initiated path needs this notification: the owner is
  // the one acting here, so they don't need to be told about their own
  // action. An owner-initiated invite accepted by the invitee has no
  // equivalent "other party" to notify back.
  if (status === "ACCEPTED" && request.initiatedBy === "REQUESTER") {
    await notifyUser(
      request.userId,
      "TEAM_REQUEST_ACCEPTED",
      `Tu solicitud para unirte a "${request.project.name}" fue aceptada.`,
      `/proyectos/${request.projectId}?tab=equipo`,
    );
  }

  return updated;
}

export async function listPendingRequests(projectId: number, actingUserId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== actingUserId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede ver las solicitudes.");
  }

  // `initiatedBy: "REQUESTER"` excludes the owner's own outgoing
  // invitations: this feeds the actionable "Solicitudes pendientes" UI in
  // the project's Equipo tab, and the owner can't Accept/Reject their own
  // invite (that 403'd before WU-06). The caller is always the project
  // owner (checked above), so this keeps the requester's email (plan
  // decision #11, WU-13).
  return listTeamRequestsByProjectWithEmail(projectId, "PENDING", "REQUESTER");
}

export async function listReceivedRequests(ownerId: number) {
  return listPendingRequestsForOwner(ownerId);
}

export async function listReceivedInvites(userId: number) {
  return listPendingInvitesForUser(userId);
}

export async function listTeam(projectId: number, requesterId?: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  await assertProjectReadable(project, requesterId);

  // Plan decision #11 (WU-13): emails are visible only to insiders of this
  // project (owner, accepted member, or confirmed evaluator) — `listTeam`
  // is reachable by anyone who can read a PUBLIC project, including
  // outsiders and anonymous visitors, so this can't reuse the project's
  // `viewer` (that's only computed for an authenticated requester on
  // `getProject`/`listMyProjects`); it's recomputed here the same way
  // `assertProjectInsider` does.
  const isOwner = requesterId !== undefined && project.ownerId === requesterId;
  const isMember =
    requesterId !== undefined && !isOwner && (await isAcceptedTeamMember(project.id, requesterId));
  const isEvaluator =
    requesterId !== undefined &&
    !isOwner &&
    !isMember &&
    (project.teacherId === requesterId || project.organizationId === requesterId);
  const isInsider = isOwner || isMember || isEvaluator;

  // Integrante real = ACCEPTED + purpose MEMBER. Accepted EVALUATOR rows
  // (teacher/organization links, WU-05) are shown elsewhere, not here.
  if (isInsider) {
    const accepted = await listTeamRequestsByProjectWithEmail(projectId, "ACCEPTED");
    const members = accepted.filter((request) => request.purpose === "MEMBER");
    const owner = await findUserById(project.ownerId);

    return [
      {
        id: project.owner.id,
        name: project.owner.name,
        email: owner?.email,
        accountType: project.owner.accountType,
        role: "OWNER" as const,
      },
      ...members.map((request) => ({
        id: request.user.id,
        name: request.user.name,
        email: request.user.email,
        accountType: request.user.accountType,
        role: request.role,
      })),
    ];
  }

  const accepted = await listTeamRequestsByProject(projectId, "ACCEPTED");
  const members = accepted.filter((request) => request.purpose === "MEMBER");

  return [
    {
      id: project.owner.id,
      name: project.owner.name,
      accountType: project.owner.accountType,
      role: "OWNER" as const,
    },
    ...members.map((request) => ({
      id: request.user.id,
      name: request.user.name,
      accountType: request.user.accountType,
      role: request.role,
    })),
  ];
}

/**
 * Shared cleanup for leaving/removing a team relationship (plan §7 P5,
 * WU-06), run in one transaction: delete the TeamRequest row, then either
 * clear the project's evaluator slot (EVALUATOR) or unassign the user from
 * every Activity in the project while leaving their comments, attachments,
 * and progress updates untouched (MEMBER).
 */
async function removeTeamMembership(
  projectId: number,
  teamRequest: {
    id: number;
    userId: number;
    purpose: TeamRequestPurpose;
    user: { accountType: AccountType };
  },
) {
  await prisma.$transaction(async (tx) => {
    await deleteTeamRequest(teamRequest.id, tx);
    if (teamRequest.purpose === "EVALUATOR") {
      const slot: EvaluatorSlot =
        teamRequest.user.accountType === "TEACHER" ? "teacherId" : "organizationId";
      await clearEvaluatorSlot(projectId, slot, tx);
    } else {
      await unassignUserFromProjectActivities(projectId, teamRequest.userId, tx);
    }
  });
}

/** The calling user leaves the team (MEMBER) or unlinks themself as
 * evaluator (EVALUATOR). The owner has no TeamRequest row — they're
 * identified by Project.ownerId — so they can't "leave" their own project
 * through this endpoint. */
export async function leaveTeam(projectId: number, userId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId === userId) {
    throw new HttpError(409, "El responsable del proyecto no puede salir de su propio equipo.");
  }
  assertProjectNotArchived(project);

  const teamRequest = await findTeamRequestByProjectAndUser(projectId, userId);
  if (!teamRequest || teamRequest.status !== "ACCEPTED") {
    throw new HttpError(404, "No eres integrante ni evaluador de este proyecto.");
  }

  await removeTeamMembership(projectId, teamRequest);
  return { success: true };
}

/** The project owner removes a member or unlinks an evaluator. */
export async function removeTeamMember(projectId: number, ownerId: number, targetUserId: number) {
  const project = await findProjectById(projectId);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== ownerId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede quitar integrantes.");
  }
  assertProjectNotArchived(project);

  const teamRequest = await findTeamRequestByProjectAndUser(projectId, targetUserId);
  if (!teamRequest || teamRequest.status !== "ACCEPTED") {
    throw new HttpError(404, "Ese usuario no es integrante ni evaluador de este proyecto.");
  }

  await removeTeamMembership(projectId, teamRequest);
  return { success: true };
}
