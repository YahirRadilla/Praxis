import {
  createPostLike,
  deletePostLike,
  findPostLike,
} from "../repositories/post-like.repository";
import { findFeedVisibleUpdate } from "../repositories/progress-update.repository";
import { findUserById } from "../repositories/user.repository";
import { notifyUser } from "./notification.service";
import { HttpError } from "../types/http-error";

export async function likePost(userId: number, updateId: number) {
  if (!Number.isInteger(updateId) || updateId <= 0) {
    throw new HttpError(404, "Publicación no encontrada.");
  }

  const update = await findFeedVisibleUpdate(updateId);
  if (!update) {
    throw new HttpError(404, "Publicación no encontrada.");
  }

  const existing = await findPostLike(userId, updateId);
  if (existing) {
    throw new HttpError(409, "Ya te gusta esta publicación.");
  }

  await createPostLike(userId, updateId);

  if (update.authorId !== userId) {
    const liker = await findUserById(userId);
    await notifyUser(
      update.authorId,
      "POST_LIKED",
      `${liker!.name} le dio me gusta a tu avance en "${update.project.name}".`,
      `/proyectos/${update.projectId}`,
    );
  }
}

export async function unlikePost(userId: number, updateId: number) {
  if (!Number.isInteger(updateId) || updateId <= 0) {
    throw new HttpError(404, "No le habías dado me gusta a esta publicación.");
  }

  const existing = await findPostLike(userId, updateId);
  if (!existing) {
    throw new HttpError(404, "No le habías dado me gusta a esta publicación.");
  }

  await deletePostLike(userId, updateId);
}
