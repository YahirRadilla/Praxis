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
}

export function updateUser(id: number, data: UpdateUserData) {
  return prisma.user.update({ where: { id }, data });
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

