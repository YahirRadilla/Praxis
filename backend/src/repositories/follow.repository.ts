import { prisma } from "./prisma-client";

export function findFollow(followerId: number, followingId: number) {
  return prisma.follow.findUnique({
    where: { followerId_followingId: { followerId, followingId } },
  });
}

export function createFollow(followerId: number, followingId: number) {
  return prisma.follow.create({ data: { followerId, followingId } });
}

export function deleteFollow(followerId: number, followingId: number) {
  return prisma.follow.deleteMany({ where: { followerId, followingId } });
}
