import type { AccountType } from "@prisma/client";
import {
  createClassGroup as createClassGroupRepo,
  createClassGroupMember,
  deleteClassGroupMember,
  findClassGroupById,
  findClassGroupForMember,
  findClassGroupForOwner,
  findClassGroupMembership,
  findClassGroupPreviewById,
  findClassGroupTeacherId,
  listClassGroupMembers as listClassGroupMembersRepo,
  listClassGroupsByTeacher,
  listJoinedClassGroupsForUser,
  searchClassGroups as searchClassGroupsRepo,
  updateClassGroup as updateClassGroupRepo,
  type CreateClassGroupData,
  type SearchClassGroupsFilters,
} from "../repositories/class-group.repository";
import { HttpError } from "../types/http-error";
import type { CreateClassGroupInput, UpdateClassGroupInput } from "../schemas/class-group.schema";

export async function createClassGroup(
  teacherId: number,
  actingUserAccountType: AccountType,
  input: CreateClassGroupInput,
) {
  if (actingUserAccountType !== "TEACHER") {
    throw new HttpError(403, "Solo un docente puede crear un grupo de clase.");
  }

  const data: CreateClassGroupData = { teacherId, ...input };
  return createClassGroupRepo(data);
}

export async function updateClassGroup(
  id: number,
  userId: number,
  input: UpdateClassGroupInput,
) {
  const classGroup = await findClassGroupById(id);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId !== userId) {
    throw new HttpError(403, "Solo el docente responsable puede editar este grupo de clase.");
  }

  return updateClassGroupRepo(id, input);
}

export interface ClassGroupViewer {
  isOwner: boolean;
  isMember: boolean;
  canJoin: boolean;
}

/**
 * Computes `viewer` for a (classGroup, requester) pair, mirroring
 * `buildProjectViewer`'s pattern in project.service.ts: the caller supplies
 * the already-looked-up `membership` row (or null/undefined) instead of
 * this function querying for it, so `getClassGroup` runs one membership
 * lookup total instead of one per call site.
 *
 * `isOwner` and `isMember` are mutually exclusive here (unlike
 * `ProjectViewer`, which treats the owner as a member too) — the plan's
 * field-level shape calls for the owner tier's viewer to read
 * `{ isOwner: true, isMember: false, canJoin: false }`, not folding the
 * owner into "is a member".
 *
 * Returns `undefined` for an anonymous requester, so spreading it into the
 * response drops the `viewer` key entirely (same convention as
 * `buildProjectViewer`).
 */
export function buildClassGroupViewer(
  classGroup: { teacher: { id: number } },
  requesterId: number | undefined,
  membership: { userId: number } | null | undefined,
  requesterAccountType: AccountType | undefined,
): ClassGroupViewer | undefined {
  if (requesterId === undefined) return undefined;

  const isOwner = classGroup.teacher.id === requesterId;
  const isMember = !isOwner && Boolean(membership);

  return {
    isOwner,
    isMember,
    canJoin: !isOwner && !isMember && requesterAccountType === "STUDENT",
  };
}

/**
 * Routes the viewer to the preview, member, or owner tier (plan's three
 * visibility tiers) — never 404s for a non-member, the preview is public
 * by design. Runs at most one membership lookup (skipped entirely for the
 * owner/anonymous cases) and one tier-specific query.
 */
export async function getClassGroup(
  id: number,
  requesterId?: number,
  requesterAccountType?: AccountType,
) {
  const existing = await findClassGroupTeacherId(id);
  if (!existing) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }

  const isOwner = requesterId !== undefined && existing.teacherId === requesterId;
  const membership =
    requesterId !== undefined && !isOwner
      ? await findClassGroupMembership(id, requesterId)
      : null;

  if (isOwner) {
    const classGroup = await findClassGroupForOwner(id);
    if (!classGroup) throw new HttpError(404, "Grupo de clase no encontrado.");
    return {
      ...classGroup,
      viewer: buildClassGroupViewer(classGroup, requesterId, membership, requesterAccountType),
    };
  }

  if (membership) {
    const classGroup = await findClassGroupForMember(id, requesterId!);
    if (!classGroup) throw new HttpError(404, "Grupo de clase no encontrado.");
    return {
      ...classGroup,
      viewer: buildClassGroupViewer(classGroup, requesterId, membership, requesterAccountType),
    };
  }

  const classGroup = await findClassGroupPreviewById(id);
  if (!classGroup) throw new HttpError(404, "Grupo de clase no encontrado.");
  return {
    ...classGroup,
    viewer: buildClassGroupViewer(classGroup, requesterId, membership, requesterAccountType),
  };
}

export async function searchClassGroups(filters: SearchClassGroupsFilters) {
  return searchClassGroupsRepo(filters);
}

export async function listMyClassGroups(teacherId: number) {
  return listClassGroupsByTeacher(teacherId);
}

export async function joinClassGroup(
  id: number,
  userId: number,
  actingUserAccountType: AccountType,
) {
  const classGroup = await findClassGroupTeacherId(id);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  // Checked before the account-type gate: the owning teacher is always a
  // TEACHER (never a STUDENT), so without this ordering "can't join your
  // own group" would be unreachable — it would always surface as the
  // generic "only students" 403 instead.
  if (classGroup.teacherId === userId) {
    throw new HttpError(400, "No puedes unirte a tu propio grupo de clase.");
  }
  if (actingUserAccountType !== "STUDENT") {
    throw new HttpError(403, "Solo los alumnos pueden unirse a un grupo de clase.");
  }

  const existing = await findClassGroupMembership(id, userId);
  if (existing) {
    throw new HttpError(409, "Ya eres miembro de este grupo de clase.");
  }

  return createClassGroupMember(id, userId);
}

export async function leaveClassGroup(id: number, userId: number) {
  const existing = await findClassGroupMembership(id, userId);
  if (!existing) {
    throw new HttpError(404, "No eres miembro de este grupo de clase.");
  }

  await deleteClassGroupMember(id, userId);
  return { success: true };
}

export async function listClassGroupMembers(id: number, requesterId: number) {
  const classGroup = await findClassGroupTeacherId(id);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId !== requesterId) {
    throw new HttpError(403, "Solo el docente responsable puede ver a los miembros.");
  }

  return listClassGroupMembersRepo(id);
}

export async function removeClassGroupMember(id: number, requesterId: number, targetUserId: number) {
  const classGroup = await findClassGroupTeacherId(id);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId !== requesterId) {
    throw new HttpError(403, "Solo el docente responsable puede quitar miembros.");
  }

  const existing = await findClassGroupMembership(id, targetUserId);
  if (!existing) {
    throw new HttpError(404, "Ese usuario no es miembro de este grupo de clase.");
  }

  await deleteClassGroupMember(id, targetUserId);
  return { success: true };
}

export async function listJoinedClassGroups(userId: number) {
  return listJoinedClassGroupsForUser(userId);
}

/**
 * Bug B fix: a classGroupId can only be linked to a project once the caller
 * is already a member or the owning teacher — joining is a deliberate,
 * separate action, never auto-granted by linking a project. Used by
 * project.service's `createProject`, which also uses the returned teacherId
 * to auto-link that teacher as the project's evaluator (no invite needed —
 * their consent is already expressed by owning the group).
 */
export async function assertCanLinkClassGroup(
  classGroupId: number,
  userId: number,
): Promise<number> {
  const classGroup = await findClassGroupTeacherId(classGroupId);
  if (!classGroup) {
    throw new HttpError(404, "Grupo de clase no encontrado.");
  }
  if (classGroup.teacherId === userId) return classGroup.teacherId;

  const membership = await findClassGroupMembership(classGroupId, userId);
  if (!membership) {
    throw new HttpError(
      403,
      "Primero únete al grupo de clase para vincular tu proyecto a él.",
    );
  }
  return classGroup.teacherId;
}
