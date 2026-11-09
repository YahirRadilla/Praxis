import { prisma } from "./prisma-client";

export function findPostLike(userId: number, progressUpdateId: number) {
  return prisma.postLike.findUnique({
    where: { userId_progressUpdateId: { userId, progressUpdateId } },
  });
}

export function createPostLike(userId: number, progressUpdateId: number) {
  return prisma.postLike.create({ data: { userId, progressUpdateId } });
}

export function deletePostLike(userId: number, progressUpdateId: number) {
  return prisma.postLike.deleteMany({ where: { userId, progressUpdateId } });
}
