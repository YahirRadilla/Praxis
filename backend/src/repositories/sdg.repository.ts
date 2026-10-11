import { prisma } from "./prisma-client";

export function listSdgs() {
  return prisma.sdg.findMany({ orderBy: { id: "asc" } });
}
