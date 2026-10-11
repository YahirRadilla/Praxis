import type { User } from "@prisma/client";
import {
  findUserById,
  updateUser,
  searchUsers as searchUsersRepo,
} from "../repositories/user.repository";
import { HttpError } from "../types/http-error";
import type { UpdateProfileInput, SearchUsersQuery } from "../schemas/user.schema";

export function toPublicUser(user: User) {
  const { passwordHash: _passwordHash, ...publicUser } = user;
  return publicUser;
}

export async function getProfile(userId: number) {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }
  return toPublicUser(user);
}

export async function updateProfile(userId: number, input: UpdateProfileInput) {
  const user = await updateUser(userId, input);
  return toPublicUser(user);
}

export async function searchUsers(query: SearchUsersQuery) {
  return searchUsersRepo(query);
}
