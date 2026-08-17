import prisma from "@/lib/prisma";
import type { Goal } from "@/lib/generated/prisma/client";

export async function listGoals(userId: string): Promise<Goal[]> {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}