import type { AccountType, Prisma } from "@prisma/client";
import { prisma } from "./prisma-client";

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  accountType: AccountType;
}

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export function createUser(data: CreateUserData) {
  return prisma.user.create({ data });
}

export function findUserById(id: number) {
  return prisma.user.findUnique({ where: { id } });
}

export interface UpdateUserData {
  name?: string;
  skills?: string[];
  interests?: string[];
  academicProgram?: string;
  semester?: number | null;
  cvUrl?: string | null;
}

export function updateUser(id: number, data: UpdateUserData) {
  return prisma.user.update({ where: { id }, data });
}

/**
 * Public profile lookup — NEVER reuse `toPublicUser()` or any full-record
 * select here: this is reachable anonymously (optionalAuth), and the
 * email-never-exposed rule for a public profile is stricter than the
 * "own profile" shape (`toPublicUser` only strips `passwordHash`, not
 * `email`). Explicit `select` keeps it that way regardless of future User
 * fields.
 */
export function findPublicProfileById(id: number) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      accountType: true,
      academicProgram: true,
      semester: true,
      skills: true,
      interests: true,
      cvUrl: true,
      verified: true,
      createdAt: true,
      _count: { select: { followers: true, following: true } },
    },
  });
}

export function markUserVerified(id: number) {
  return prisma.user.update({
    where: { id },
    data: { verified: true, verifiedAt: new Date() },
  });
}

export interface SearchUsersFilters {
  accountType?: string;
  q?: string;
}

export function searchUsers(filters: SearchUsersFilters) {
  const where: Prisma.UserWhereInput = {};

  if (filters.accountType) {
    where.accountType = filters.accountType as AccountType;
  }

  if (filters.q) {
    where.OR = [
      { name: { contains: filters.q, mode: "insensitive" } },
      { email: { contains: filters.q, mode: "insensitive" } },
    ];
  }

  return prisma.user.findMany({
    where,
    select: { id: true, name: true, email: true, accountType: true },
    orderBy: { name: "asc" },
    take: 20,
  });
}

