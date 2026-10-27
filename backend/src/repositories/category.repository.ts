import { prisma } from "./prisma-client";

export function listCategories() {
  return prisma.category.findMany({ orderBy: { id: "asc" } });
}
