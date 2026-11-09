import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";

// Plan decision (mirrors team-request.repository's memberSelect/
// memberSelectWithEmail, WU-13): emails are hidden from outsiders by
// default. `classGroupInclude` never selects the teacher's email;
// `classGroupIncludeWithEmail` is used only once the requester is confirmed
// as the owning teacher.
const teacherSelect = { id: true, name: true, accountType: true } as const;
const teacherSelectWithEmail = { id: true, name: true, email: true, accountType: true } as const;

const memberUserSelectWithEmail = { id: true, name: true, email: true, accountType: true } as const;

// Only minimal, safe fields for the projects a ClassGroup groups — unlike
// `challengeInclude.projects`, this never reuses the full `projectInclude`
// (which would leak private-project detail on this public endpoint).
const classGroupProjectSelect = {
  id: true,
  name: true,
  visibility: true,
  archived: true,
  bannerUrl: true,
} as const;

const classGroupResourceInclude = {
  creator: { select: { id: true, name: true } },
} as const;

export const classGroupInclude = {
  teacher: { select: teacherSelect },
  resources: { include: classGroupResourceInclude },
  projects: { select: classGroupProjectSelect },
} satisfies Prisma.ClassGroupInclude;

export const classGroupIncludeWithEmail = {
  ...classGroupInclude,
  teacher: { select: teacherSelectWithEmail },
} satisfies Prisma.ClassGroupInclude;

// --- Visibility tiers for GET /class-groups and GET /class-groups/:id ----
//
// Three tiers, enforced via distinct Prisma selects (never by filtering an
// over-fetched object client-side): preview (anyone), member (joined
// students), owner (the owning teacher). See class-group.service's
// `buildClassGroupViewer`/`getClassGroup` for how a viewer is routed to one
// of these.

const classGroupPreviewSelect = {
  id: true,
  name: true,
  description: true,
  bannerUrl: true,
  createdAt: true,
  updatedAt: true,
  teacher: { select: teacherSelect },
  _count: { select: { resources: true, members: true, projects: true } },
} satisfies Prisma.ClassGroupSelect;

export function findClassGroupPreviewById(id: number) {
  return prisma.classGroup.findUnique({ where: { id }, select: classGroupPreviewSelect });
}

/**
 * Member tier: preview fields plus resources and projects — but projects is
 * scoped to PUBLIC ones plus the viewer's own (regardless of visibility),
 * matching the plan's "member tier" field-level shape. Still no `members`
 * list, no teacher email.
 */
export function findClassGroupForMember(id: number, viewerId: number) {
  return prisma.classGroup.findUnique({
    where: { id },
    select: {
      ...classGroupPreviewSelect,
      resources: { include: classGroupResourceInclude },
      projects: {
        where: { OR: [{ visibility: "PUBLIC" }, { ownerId: viewerId }] },
        select: classGroupProjectSelect,
      },
    },
  });
}

/**
 * Owner tier: every linked project regardless of visibility, plus the
 * member list (the one place member emails are visible) and the teacher's
 * own email — only ever queried once the requester is confirmed as the
 * owning teacher.
 */
export function findClassGroupForOwner(id: number) {
  return prisma.classGroup.findUnique({
    where: { id },
    select: {
      ...classGroupPreviewSelect,
      teacher: { select: teacherSelectWithEmail },
      resources: { include: classGroupResourceInclude },
      projects: { select: classGroupProjectSelect },
      members: {
        include: { user: { select: memberUserSelectWithEmail } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
}

/** Cheap existence + ownership check — used to route a viewer to the
 * correct tier before running the (heavier) tier-specific query. */
export function findClassGroupTeacherId(id: number) {
  return prisma.classGroup.findUnique({ where: { id }, select: { teacherId: true } });
}

export interface SearchClassGroupsFilters {
  q?: string;
}

/** Public search: preview tier only, regardless of viewer (plan decision:
 * "a public preview, searchable by anyone"). Mirrors `searchProjects`/
 * `listChallenges`'s `q` (contains, insensitive) on name/description. */
export function searchClassGroups(filters: SearchClassGroupsFilters) {
  const where: Prisma.ClassGroupWhereInput = {};

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { description: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return prisma.classGroup.findMany({
    where,
    select: classGroupPreviewSelect,
    orderBy: { createdAt: "desc" },
  });
}

/** One query for every class group the caller has joined (preview-tier
 * shape, fine for a list view) — avoids N+1 over the caller's memberships. */
export function listJoinedClassGroupsForUser(userId: number) {
  return prisma.classGroup.findMany({
    where: { members: { some: { userId } } },
    select: classGroupPreviewSelect,
    orderBy: { createdAt: "desc" },
  });
}

// --- Membership (self-serve join/leave) -----------------------------------

export function findClassGroupMembership(classGroupId: number, userId: number) {
  return prisma.classGroupMember.findUnique({
    where: { classGroupId_userId: { classGroupId, userId } },
  });
}

export function createClassGroupMember(classGroupId: number, userId: number) {
  return prisma.classGroupMember.create({ data: { classGroupId, userId } });
}

export function deleteClassGroupMember(classGroupId: number, userId: number) {
  return prisma.classGroupMember.delete({
    where: { classGroupId_userId: { classGroupId, userId } },
  });
}

/** Owning-teacher-only member list, with email (the one place a member's
 * email is visible — mirrors `memberSelectWithEmail`'s house pattern). */
export function listClassGroupMembers(classGroupId: number) {
  return prisma.classGroupMember.findMany({
    where: { classGroupId },
    include: { user: { select: memberUserSelectWithEmail } },
    orderBy: { joinedAt: "asc" },
  });
}

export interface CreateClassGroupData {
  name: string;
  description: string;
  teacherId: number;
}

export function createClassGroup(data: CreateClassGroupData) {
  return prisma.classGroup.create({ data, include: classGroupInclude });
}

export function findClassGroupById(id: number) {
  return prisma.classGroup.findUnique({ where: { id }, include: classGroupInclude });
}

/** Same lookup, but with the teacher's email — only call this once the
 * requester has already been confirmed as the owning teacher. */
export function findClassGroupByIdWithEmail(id: number) {
  return prisma.classGroup.findUnique({ where: { id }, include: classGroupIncludeWithEmail });
}

export interface UpdateClassGroupData {
  name?: string;
  description?: string;
  bannerUrl?: string | null;
}

export function updateClassGroup(id: number, data: UpdateClassGroupData) {
  return prisma.classGroup.update({ where: { id }, data, include: classGroupInclude });
}

export function listClassGroupsByTeacher(teacherId: number) {
  return prisma.classGroup.findMany({
    where: { teacherId },
    include: classGroupInclude,
    orderBy: { createdAt: "desc" },
  });
}
