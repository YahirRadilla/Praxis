import type { User } from "@prisma/client";
import {
  findUserById,
  findPublicProfileById,
  updateUser,
  searchUsers as searchUsersRepo,
} from "../repositories/user.repository";
import { findFollow } from "../repositories/follow.repository";
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
  if (input.semester != null) {
    const user = await findUserById(userId);
    if (!user || user.accountType !== "STUDENT") {
      throw new HttpError(400, "Solo las cuentas de estudiante tienen semestre.");
    }
  }

  const user = await updateUser(userId, input);
  return toPublicUser(user);
}

export async function searchUsers(query: SearchUsersQuery) {
  return searchUsersRepo(query);
}

export async function getPublicProfile(id: number, viewerId?: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const user = await findPublicProfileById(id);
  if (!user) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const followedByMe =
    viewerId !== undefined && viewerId !== id && Boolean(await findFollow(viewerId, id));

  const { _count, ...rest } = user;
  return {
    ...rest,
    followerCount: _count.followers,
    followingCount: _count.following,
    followedByMe,
  };
}
