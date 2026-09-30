import type { AccountType } from "@prisma/client";
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
