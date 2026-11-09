import { createFollow, deleteFollow, findFollow } from "../repositories/follow.repository";
import { findUserById } from "../repositories/user.repository";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";

export async function followUser(followerId: number, followingId: number) {
  if (followerId === followingId) {
    throw new HttpError(400, "No puedes seguirte a ti mismo.");
  }

  if (!Number.isInteger(followingId) || followingId <= 0) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const target = await findUserById(followingId);
  if (!target) {
    throw new HttpError(404, "Usuario no encontrado.");
  }

  const existing = await findFollow(followerId, followingId);
  if (existing) {
    throw new HttpError(409, "Ya sigues a este usuario.");
  }

  await createFollow(followerId, followingId);

  const follower = await findUserById(followerId);
  await notifyUser(
    followingId,
    "NEW_FOLLOWER",
    `${follower!.name} comenzó a seguirte.`,
    `/usuarios/${followerId}`,
  );
}

export async function unfollowUser(followerId: number, followingId: number) {
  if (!Number.isInteger(followingId) || followingId <= 0) {
    throw new HttpError(404, "No seguías a este usuario.");
  }

  const existing = await findFollow(followerId, followingId);
  if (!existing) {
    throw new HttpError(404, "No seguías a este usuario.");
  }

  await deleteFollow(followerId, followingId);
}
