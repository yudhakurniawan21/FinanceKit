import prisma from "@/lib/prisma";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";
import type {
  RecurringFrequency,
  RecurringTransaction,
  TransactionType,
  PaymentMethod,
} from "@/lib/generated/prisma/client";

export function nextOccurrence(
  frequency: RecurringFrequency,
  from: Date
): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(from, 1);
    case "WEEKLY":
      return addWeeks(from, 1);
    case "MONTHLY":
      return addMonths(from, 1);
    case "YEARLY":
      return addYears(from, 1);
  }
}

export type RecurringWithRefs = RecurringTransaction & {
  category: { name: string } | null;
  account: { name: string } | null;
};

export async function listRecurring(
  userId: string
): Promise<RecurringWithRefs[]> {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
  });
}

// Generate transaksi nyata untuk semua jadwal yang jatuh tempo (≤ hari ini).
// Idempoten via constraint unik (recurringId, date) + majukan nextRunDate
// dalam satu $transaction per jadwal. Kap 36 iterasi per jadwal.
export async function processDueRecurring(userId: string): Promise<number> {
  const due = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, nextRunDate: { lte: new Date() } },
  });
  if (due.length === 0) return 0;

  const today = new Date();
  let created = 0;

  for (const rec of due) {
    let runDate = new Date(rec.nextRunDate);
    const batch: Array<{
      date: Date;
      amount: number;
      type: TransactionType;
      method: PaymentMethod | null;
      categoryId: string | null;
      accountId: string | null;
      description: string;
    }> = [];

    let guard = 0;
    while (runDate.getTime() <= today.getTime() && guard < 36) {
      batch.push({
        date: new Date(runDate),
        amount: rec.amount,
        type: rec.type,
        method: rec.method,
        categoryId: rec.categoryId,
        accountId: rec.accountId,
        description: rec.description,
      });
      runDate = nextOccurrence(rec.frequency, runDate);
      guard++;
    }
    if (batch.length === 0) continue;

    await prisma.$transaction([
      ...batch.map((t) =>
        prisma.transaction.create({
          data: {
            userId,
            recurringId: rec.id,
            ...t,
          },
        })
      ),
      prisma.recurringTransaction.update({
        where: { id: rec.id },
        data: {
          nextRunDate: runDate,
          lastRunDate: batch[batch.length - 1].date,
        },
      }),
    ]);
    created += batch.length;
  }

  return created;
}