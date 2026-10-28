import type { Project, TeamRequest } from "@prisma/client";
import {
  createProject as createProjectRepo,
  findProjectById,
  findProjectByIdWithEmail,
  listProjectsForUser,
  searchProjects as searchProjectsRepo,
  updateProject as updateProjectRepo,
  type CreateProjectData,
  type EvaluatorSlot,
} from "../repositories/project.repository";
import {
  createTeamRequest,
  findPendingEvaluatorInvite,
  findTeamRequestByProjectAndUser,
  findTeamRequestsForUserByProjectIds,
  isAcceptedTeamMember,
} from "../repositories/team-request.repository";
import { findChallengeById } from "../repositories/challenge.repository";
import { findUserById } from "../repositories/user.repository";
import { prisma } from "../repositories/prisma-client";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";
import type {
  CreateProjectInput,
  SearchProjectsQuery,
  UpdateProjectInput,
} from "../schemas/project.schema";

// Exported: also reused by team-request.service's inviteToTeam (WU-05) to
// validate an EVALUATOR-purpose invite target, at invite time rather than
// accept time, so the owner gets immediate feedback on the wrong account type.
export async function assertValidTeacher(teacherId: number, ownerId: number) {
  if (teacherId === ownerId) {
    throw new HttpError(400, "No puedes vincularte a ti mismo como evaluador.");
  }
  const teacher = await findUserById(teacherId);
  if (!teacher || teacher.accountType !== "TEACHER") {
    throw new HttpError(400, "El docente vinculado debe ser una cuenta de tipo docente.");
  }
}

export async function assertValidOrganization(organizationId: number, ownerId: number) {
  if (organizationId === ownerId) {
    throw new HttpError(400, "No puedes vincularte a ti mismo como evaluador.");
  }
  const organization = await findUserById(organizationId);
  if (!organization || organization.accountType !== "ORGANIZATION") {
    throw new HttpError(400, "La organización vinculada debe ser una cuenta de tipo organización.");
  }
}

/**
 * Classifies an evaluator-invite target by account type and validates it
 * with the matching (reused, not reimplemented) assert function. Used both
 * at project creation (`evaluatorInviteIds`) and by `inviteToTeam`'s
 * EVALUATOR-purpose path.
 */
export async function classifyEvaluatorInvite(
  targetUserId: number,
  ownerId: number,
): Promise<EvaluatorSlot> {
  const target = await findUserById(targetUserId);
  if (!target) {
    throw new HttpError(404, "Usuario no encontrado.");
  }
  if (target.accountType === "TEACHER") {
    await assertValidTeacher(targetUserId, ownerId);
    return "teacherId";
  }
  if (target.accountType === "ORGANIZATION") {
    await assertValidOrganization(targetUserId, ownerId);
    return "organizationId";
  }
  throw new HttpError(
    400,
    "Solo puedes invitar a evaluar a una cuenta de tipo docente u organización.",
  );
}

export async function createProject(ownerId: number, input: CreateProjectInput) {
  const { evaluatorInviteIds, ...rest } = input;

  if (rest.challengeId !== undefined) {
    const challenge = await findChallengeById(rest.challengeId);
    if (!challenge) {
      throw new HttpError(404, "Reto no encontrado.");
    }
  }

  const invites = evaluatorInviteIds ?? [];
  const usedSlots = new Set<EvaluatorSlot>();
  const resolvedInvites: { userId: number; slot: EvaluatorSlot }[] = [];

  for (const inviteId of invites) {
    const slot = await classifyEvaluatorInvite(inviteId, ownerId);
    if (usedSlots.has(slot)) {
      throw new HttpError(
        400,
        "Solo puedes invitar a un evaluador por categoría (docente u organización).",
      );
    }
    usedSlots.add(slot);
    resolvedInvites.push({ userId: inviteId, slot });
  }

  const data: CreateProjectData = { ownerId, ...rest };

  // Create the project and every pending EVALUATOR TeamRequest in one
  // transaction (plan §7 P4): the invites never fill teacherId/organizationId
  // here — only accepting them does (see claimEvaluatorSlot).
  const project = await prisma.$transaction(async (tx) => {
    const created = await createProjectRepo(data, tx);
    for (const invite of resolvedInvites) {
      await createTeamRequest(created.id, invite.userId, undefined, "OWNER", "EVALUATOR", tx);
    }
    return created;
  });

  for (const invite of resolvedInvites) {
    await notifyUser(
      invite.userId,
      "TEAM_INVITE_RECEIVED",
      `${project.owner.name} te invitó a evaluar el proyecto "${project.name}".`,
      "/solicitudes-recibidas",
    );
  }

  return project;
}

type ReadableProjectShape = Pick<
  Project,
  "id" | "visibility" | "ownerId" | "teacherId" | "organizationId"
>;

export async function assertProjectReadable(
  project: ReadableProjectShape,
  requesterId?: number,
) {
  const isPubliclyVisible = project.visibility === "PUBLIC";
  if (isPubliclyVisible) return;

  const isOwner = requesterId !== undefined && project.ownerId === requesterId;
  const isMember =
    requesterId !== undefined && !isOwner && (await isAcceptedTeamMember(project.id, requesterId));
  // A confirmed evaluator (accepted EVALUATOR TeamRequest, now linked via
  // teacherId/organizationId) can read a private project even without being
  // a team member. Pending-evaluator-invite access (plan P6) is out of scope
  // for this unit.
  const isEvaluator =
    requesterId !== undefined &&
    !isOwner &&
    !isMember &&
    (project.teacherId === requesterId || project.organizationId === requesterId);

  if (!isOwner && !isMember && !isEvaluator) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
}

type InsiderProjectShape = Pick<Project, "id" | "ownerId" | "teacherId" | "organizationId">;

/**
 * WU-10: the activity board (and labels) are insider-only — owner, accepted
 * MEMBER, or confirmed evaluator — even on a PUBLIC project (plan decision
 * #10). Unlike `assertProjectReadable`, visibility never grants access here.
 *
 * Throws 404, not 403: the point is to not reveal that a board exists on a
 * project the requester can't see into, matching the existing pattern used
 * for private-project reads.
 */
export async function assertProjectInsider(project: InsiderProjectShape, requesterId?: number) {
  const isOwner = requesterId !== undefined && project.ownerId === requesterId;
  const isMember =
    requesterId !== undefined && !isOwner && (await isAcceptedTeamMember(project.id, requesterId));
  const isEvaluator =
    requesterId !== undefined &&
    !isOwner &&
    !isMember &&
    (project.teacherId === requesterId || project.organizationId === requesterId);

  if (!isOwner && !isMember && !isEvaluator) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
}

type ArchivableProjectShape = Pick<Project, "archived">;

export function assertProjectNotArchived(project: ArchivableProjectShape) {
  if (project.archived) {
    throw new HttpError(409, "El proyecto está archivado; es de solo lectura.");
  }
}

// --- WU-07: `viewer` read-side convenience object -------------------------
//
// This is NOT a new authorization mechanism: every write path below (and in
// activity/progress-update/label/dictamen services) keeps its own
// independent `assert*` check as the real enforcement. `viewer` only tells
// the frontend which buttons/affordances make sense to show for the
// requester, computed from state the backend already has.

export interface ProjectViewer {
  isOwner: boolean;
  isMember: boolean; // accepted MEMBER, or owner
  isEvaluator: boolean; // teacherId or organizationId === requesterId
  pendingRequest: {
    id: number;
    initiatedBy: "REQUESTER" | "OWNER";
    purpose: "MEMBER" | "EVALUATOR";
  } | null;
  canRequestToJoin: boolean; // authenticated, not owner, not member, not evaluator, no pending request, not archived
  canPost: boolean; // isMember && !archived (progress updates / FeedComposer)
  canSubmitDictamen: boolean; // isEvaluator && !archived
  canSeeBoard: boolean; // isMember || isEvaluator
}

type ViewerProjectShape = Pick<Project, "id" | "ownerId" | "teacherId" | "organizationId" | "archived">;
type ViewerTeamRequestShape = Pick<TeamRequest, "id" | "status" | "purpose" | "initiatedBy">;

/**
 * Computes `viewer` for a single (project, requester) pair.
 *
 * `teamRequest` is the caller-supplied `(project.id, requesterId)`
 * TeamRequest row (or null/undefined when there is none) — this function
 * never queries for it itself. That's what lets `listMyProjects` run ONE
 * batched `TeamRequest` query for every project it returns, instead of one
 * query per project (N+1).
 *
 * Returns `undefined` for an anonymous requester (`requesterId ===
 * undefined`) rather than an "all false" shape: spreading it as `{
 * ...project, viewer: buildProjectViewer(...) }` then lets `JSON.stringify`
 * drop the `viewer` key entirely, matching `GET /projects` (public search),
 * which never has a `viewer` field at all.
 */
export function buildProjectViewer(
  project: ViewerProjectShape,
  requesterId: number | undefined,
  teamRequest?: ViewerTeamRequestShape | null,
): ProjectViewer | undefined {
  if (requesterId === undefined) return undefined;

  const isOwner = project.ownerId === requesterId;
  const isMember =
    isOwner || (teamRequest?.status === "ACCEPTED" && teamRequest.purpose === "MEMBER");
  const isEvaluator = project.teacherId === requesterId || project.organizationId === requesterId;
  const pendingRequest =
    teamRequest?.status === "PENDING"
      ? { id: teamRequest.id, initiatedBy: teamRequest.initiatedBy, purpose: teamRequest.purpose }
      : null;

  return {
    isOwner,
    isMember,
    isEvaluator,
    pendingRequest,
    canRequestToJoin: !isOwner && !isMember && !isEvaluator && !pendingRequest && !project.archived,
    canPost: isMember && !project.archived,
    canSubmitDictamen: isEvaluator && !project.archived,
    canSeeBoard: isMember || isEvaluator,
  };
}

/**
 * WU-08 gap fix: the owner's own outgoing EVALUATOR invites, by account-type
 * slot, so the "Invitación pendiente: X" state in the Evaluación section
 * survives a page reload instead of living only in local mutation-success
 * state. Owner-only data (not a privacy concern either way, but there's no
 * reason to compute/send it for non-owners).
 */
async function loadPendingEvaluatorInvites(projectId: number) {
  const [teacherInvite, organizationInvite] = await Promise.all([
    findPendingEvaluatorInvite(projectId, "TEACHER"),
    findPendingEvaluatorInvite(projectId, "ORGANIZATION"),
  ]);
  return {
    teacher: teacherInvite ? { id: teacherInvite.userId, name: teacherInvite.user.name } : null,
    organization: organizationInvite
      ? { id: organizationInvite.userId, name: organizationInvite.user.name }
      : null,
  };
}

export async function getProject(id: number, requesterId?: number) {
  const project = await findProjectById(id);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  await assertProjectReadable(project, requesterId);

  const teamRequest =
    requesterId !== undefined ? await findTeamRequestByProjectAndUser(id, requesterId) : null;

  const viewer = buildProjectViewer(project, requesterId, teamRequest);
  // Plan decision #11 (WU-13): owner/teacher/organization emails are only
  // visible to insiders of THIS project — never to an outsider, even on a
  // PUBLIC one.
  const isInsider = Boolean(viewer && (viewer.isOwner || viewer.isMember || viewer.isEvaluator));
  const projectForResponse = isInsider ? (await findProjectByIdWithEmail(id)) ?? project : project;

  return {
    ...projectForResponse,
    viewer,
    ...(viewer?.isOwner ? { pendingEvaluatorInvites: await loadPendingEvaluatorInvites(id) } : {}),
  };
}

export async function searchProjects(query: SearchProjectsQuery) {
  return searchProjectsRepo(query);
}

export async function listMyProjects(userId: number) {
  const projects = await listProjectsForUser(userId);

  // One query for every project's TeamRequest row belonging to this user,
  // instead of one query per project.
  const projectIds = projects.map((project) => project.id);
  const teamRequests = await findTeamRequestsForUserByProjectIds(projectIds, userId);
  const teamRequestByProjectId = new Map(teamRequests.map((request) => [request.projectId, request]));

  return projects.map((project) => ({
    ...project,
    viewer: buildProjectViewer(project, userId, teamRequestByProjectId.get(project.id) ?? null),
  }));
}

async function requireOwnedProject(id: number, userId: number) {
  const project = await findProjectById(id);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  if (project.ownerId !== userId) {
    throw new HttpError(403, "Solo el responsable del proyecto puede modificarlo.");
  }
  return project;
}

async function requireMemberProject(id: number, userId: number) {
  const project = await findProjectById(id);
  if (!project) {
    throw new HttpError(404, "Proyecto no encontrado.");
  }
  const isOwner = project.ownerId === userId;
  const isMember = isOwner || (await isAcceptedTeamMember(project.id, userId));
  if (!isMember) {
    throw new HttpError(403, "Solo los integrantes del proyecto pueden editar esta información.");
  }
  return project;
}

export async function updateProject(id: number, userId: number, input: UpdateProjectInput) {
  // `extendedInfo` (the free-text Anexos writeup) is editable by any project
  // member, unlike every other field here which stays owner-only. A payload
  // containing only that key uses the looser membership check instead.
  const keys = Object.keys(input) as (keyof UpdateProjectInput)[];
  const isExtendedInfoOnlyUpdate = keys.length > 0 && keys.every((key) => key === "extendedInfo");

  const project = isExtendedInfoOnlyUpdate
    ? await requireMemberProject(id, userId)
    : await requireOwnedProject(id, userId);

  // Archived = read-only. The one exception: the owner can still flip
  // visibility on an archived project (that's how it stays discoverable or
  // gets hidden while archived), so a payload containing only `visibility`
  // is let through.
  const isVisibilityOnlyUpdate = keys.length > 0 && keys.every((key) => key === "visibility");
  if (project.archived && !isVisibilityOnlyUpdate) {
    throw new HttpError(409, "El proyecto está archivado; es de solo lectura.");
  }

  // `teacherId`/`organizationId` are not, and will never be, update fields:
  // `UpdateProjectInput` doesn't carry them (plan decision #6).
  return updateProjectRepo(id, input);
}

export async function archiveProject(id: number, userId: number) {
  await requireOwnedProject(id, userId);
  return updateProjectRepo(id, { archived: true, archivedAt: new Date() });
}

export async function unarchiveProject(id: number, userId: number) {
  await requireOwnedProject(id, userId);
  return updateProjectRepo(id, { archived: false, archivedAt: null });
}
