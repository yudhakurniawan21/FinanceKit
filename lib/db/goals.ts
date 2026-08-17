import prisma from "@/lib/prisma";
import { differenceInCalendarMonths } from "date-fns";
import type { Goal } from "@/lib/generated/prisma/client";

export async function listGoals(userId: string): Promise<Goal[]> {
  return prisma.goal.findMany({
    where: { userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

// Setoran bulanan yang dibutuhkan agar target tercapai sebelum deadline.
// null = tanpa deadline / sudah tercapai. Minor unit.
export function goalMonthlyNeeded(
  goal: Pick<Goal, "targetAmount" | "currentAmount" | "deadline">,
  now: Date
): number | null {
  if (!goal.deadline) return null;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  if (remaining <= 0) return null;
  const monthsLeft = differenceInCalendarMonths(goal.deadline, now);
  if (monthsLeft <= 0) return remaining;
  return Math.ceil(remaining / monthsLeft);
}