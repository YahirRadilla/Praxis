import type {
  AccountType,
  Prisma,
  TeamRequestInitiator,
  TeamRequestPurpose,
  TeamRequestStatus,
} from "@prisma/client";
import { prisma } from "./prisma-client";

type TxClient = Prisma.TransactionClient;

// Plan decision #11 (WU-13): emails are hidden from outsiders by default.
// `memberSelect` never includes it; `memberSelectWithEmail` is used only at
// call sites already confirmed to be insider-only (the project owner, or
// `listTeam` once it has checked the requester itself).
const memberSelect = {
  id: true,
  name: true,
  accountType: true,
} as const;

const memberSelectWithEmail = {
  id: true,
  name: true,
  email: true,
  accountType: true,
} as const;

export function findTeamRequestByProjectAndUser(projectId: number, userId: number) {
  return prisma.teamRequest.findUnique({
    where: { projectId_userId: { projectId, userId } },
    include: { user: { select: memberSelect } },
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
  message?: string,
  initiatedBy: TeamRequestInitiator = "REQUESTER",
  purpose: TeamRequestPurpose = "MEMBER",
  tx: TxClient = prisma,
) {
  // `role` is left to its schema default (COLLABORATOR): OWNER is never
  // persisted (listTeam synthesizes it).
  return tx.teamRequest.create({
    data: { projectId, userId, message, initiatedBy, purpose },
    include: { user: { select: memberSelect } },
  });
}

export function updateTeamRequestStatus(
  id: number,
  status: TeamRequestStatus,
  tx: TxClient = prisma,
) {
  return tx.teamRequest.update({
    where: { id },
    data: { status, resolvedAt: new Date() },
    include: { user: { select: memberSelect } },
  });
}

/**
 * Reuses a REJECTED row instead of leaving the requester/invitee permanently
 * blocked by `@@unique([projectId, userId])` (plan §2 decision #7, WU-06):
 * brings it back to PENDING with a fresh `createdAt`/`initiatedBy`/`purpose`/
 * `message`, clearing `resolvedAt`. Only ever called on a row already known
 * to be REJECTED — PENDING/ACCEPTED are rejected with 409 before this runs.
 */
export function reopenTeamRequest(
  id: number,
  data: { initiatedBy: TeamRequestInitiator; purpose: TeamRequestPurpose; message?: string },
  tx: TxClient = prisma,
) {
  return tx.teamRequest.update({
    where: { id },
    data: {
      status: "PENDING",
      initiatedBy: data.initiatedBy,
      purpose: data.purpose,
      message: data.message ?? null,
      resolvedAt: null,
      createdAt: new Date(),
    },
    include: { user: { select: memberSelect } },
  });
}

export function deleteTeamRequest(id: number, tx: TxClient = prisma) {
  return tx.teamRequest.delete({ where: { id } });
}

/**
 * A pending EVALUATOR-purpose invite already targeting the project's slot
 * for this account type (TEACHER -> teacherId, ORGANIZATION ->
 * organizationId). `inviteToTeam` uses this to 409 instead of creating a
 * second pending invite for the same slot.
 */
export function findPendingEvaluatorInvite(projectId: number, accountType: AccountType) {
  return prisma.teamRequest.findFirst({
    where: {
      projectId,
      purpose: "EVALUATOR",
      status: "PENDING",
      user: { accountType },
    },
    // `user` (id/name) is only consumed by getProject's `pendingEvaluatorInvites`
    // (WU-08 gap fix); inviteToTeam's call site only checks truthiness, so the
    // extra include is harmless there.
    include: { user: { select: { id: true, name: true } } },
  });
}

/**
 * `initiatedBy` is only passed by callers feeding the owner's actionable
 * "Solicitudes pendientes" UI (WU-06): it filters out the owner's own
 * outgoing invitations, which have no Accept/Reject action the owner can
 * take on them. `listTeam`'s ACCEPTED-status call leaves it unset — that's a
 * full membership view, not an actionable list.
 */
export function listTeamRequestsByProject(
  projectId: number,
  status?: TeamRequestStatus,
  initiatedBy?: TeamRequestInitiator,
) {
  return prisma.teamRequest.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
      ...(initiatedBy ? { initiatedBy } : {}),
    },
    include: { user: { select: memberSelect } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Same query, with the requester's email — used only where the caller has
 * already confirmed the context is insider-only (plan decision #11,
 * WU-13): the owner's own "Solicitudes pendientes" list (`listPendingRequests`),
 * and `listTeam`'s accepted-members fetch once it has checked the viewer.
 */
export function listTeamRequestsByProjectWithEmail(
  projectId: number,
  status?: TeamRequestStatus,
  initiatedBy?: TeamRequestInitiator,
) {
  return prisma.teamRequest.findMany({
    where: {
      projectId,
      ...(status ? { status } : {}),
      ...(initiatedBy ? { initiatedBy } : {}),
    },
    include: { user: { select: memberSelectWithEmail } },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * One query for every project a requester might be looking at (used by
 * `buildProjectViewer` via `listMyProjects`, WU-07), instead of one
 * `TeamRequest` lookup per project — avoids N+1 on `GET /projects/mine`.
 */
export function findTeamRequestsForUserByProjectIds(projectIds: number[], userId: number) {
  return prisma.teamRequest.findMany({
    where: { userId, projectId: { in: projectIds } },
    select: { id: true, projectId: true, status: true, purpose: true, initiatedBy: true },
  });
}

export async function isAcceptedTeamMember(projectId: number, userId: number): Promise<boolean> {
  const request = await prisma.teamRequest.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  // "Integrante real" = ACCEPTED + purpose MEMBER. An accepted EVALUATOR row
  // (teacher/organization linked via WU-05) is not team membership.
  return request?.status === "ACCEPTED" && request.purpose === "MEMBER";
}

// `initiatedBy: "REQUESTER"` excludes the owner's own outgoing invitations:
// without it, an owner's invite to someone else showed up in their own
// "received requests" list with Accept/Reject buttons that 403'd (WU-06).
// Always scoped to `project: { ownerId }` — the caller is always the owner
// of every project this returns, so this keeps the requester's email
// (plan decision #11, WU-13: "el dueño es de dentro").
export function listPendingRequestsForOwner(ownerId: number) {
  return prisma.teamRequest.findMany({
    where: { status: "PENDING", initiatedBy: "REQUESTER", project: { ownerId } },
    include: { user: { select: memberSelectWithEmail }, project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export function listPendingInvitesForUser(userId: number) {
  return prisma.teamRequest.findMany({
    where: { status: "PENDING", userId, initiatedBy: "OWNER" },
    include: { user: { select: memberSelect }, project: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
}
