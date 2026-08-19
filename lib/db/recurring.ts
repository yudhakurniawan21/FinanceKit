import prisma from "@/lib/prisma";
import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
} from "date-fns";
import { recordNetWorthSnapshot } from "@/lib/db/net-worth";
import { isUniqueViolation } from "@/lib/prisma";
import type {
  RecurringFrequency,
  RecurringTransaction,
  TransactionType,
  PaymentMethod,
  Prisma,
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
  netWorthItem: { name: string } | null;
};

export async function listRecurring(
  userId: string
): Promise<RecurringWithRefs[]> {
  return prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      netWorthItem: { select: { name: true } },
    },
    orderBy: [{ isActive: "desc" }, { nextRunDate: "asc" }],
  });
}

// Jadwal aktif yang jatuh tempo dalam `days` hari ke depan (action item).
export async function listUpcomingRecurring(
  userId: string,
  days = 14
): Promise<RecurringWithRefs[]> {
  const from = new Date();
  return prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextRunDate: { gte: from, lte: addDays(from, days) },
    },
    include: {
      category: { select: { name: true } },
      account: { select: { name: true } },
      netWorthItem: { select: { name: true } },
    },
    orderBy: { nextRunDate: "asc" },
  });
}

// Generate transaksi nyata untuk semua jadwal yang jatuh tempo (≤ hari ini).
// Idempoten via constraint unik (recurringId, date) + majukan nextRunDate
// dalam satu $transaction per jadwal. Kap 36 iterasi per jadwal dan 100
// jadwal per panggilan agar satu request tidak memproses ribuan baris.
export async function processDueRecurring(userId: string): Promise<number> {
  const due = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true, nextRunDate: { lte: new Date() } },
    orderBy: { nextRunDate: "asc" },
    take: 100,
    include: {
      category: { select: { isSavings: true, goalId: true } },
    },
  });
  if (due.length === 0) return 0;

  const today = new Date();
  let created = 0;

  for (const rec of due) {
    let runDate = new Date(rec.nextRunDate);
    // Temuan 1: kategori tabungan → tautkan ke goal & naikkan saldo tujuan.
    const goalId =
      rec.type === "EXPENSE" && rec.category?.isSavings === true
        ? (rec.category.goalId ?? null)
        : null;
    // Temuan 2: pembayaran cicilan berulang → potong pokok utang.
    const netWorthItemId =
      rec.type === "EXPENSE" ? (rec.netWorthItemId ?? null) : null;

    const batch: Array<{
      date: Date;
      amount: number;
      type: TransactionType;
      method: PaymentMethod | null;
      categoryId: string | null;
      accountId: string | null;
      goalId: string | null;
      netWorthItemId: string | null;
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
        goalId,
        netWorthItemId,
        description: rec.description,
      });
      runDate = nextOccurrence(rec.frequency, runDate);
      guard++;
    }
    if (batch.length === 0) continue;

    try {
      const ops: Prisma.PrismaPromise<unknown>[] = [
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
      ];

      const totalAmount = rec.amount * batch.length;
      if (goalId) {
        ops.push(
          prisma.goal.update({
            where: { id: goalId },
            data: { currentAmount: { increment: totalAmount } },
          })
        );
      }
      if (netWorthItemId) {
        ops.push(
          prisma.netWorthItem.update({
            where: { id: netWorthItemId },
            data: { value: { decrement: totalAmount } },
          })
        );
      }

      await prisma.$transaction(ops);
      created += batch.length;
    } catch (err) {
      // Race: request lain memproses jadwal yang sama dan kalah unik constraint.
      if (isUniqueViolation(err)) {
        const latest = await prisma.recurringTransaction.findUnique({
          where: { id: rec.id },
          select: { nextRunDate: true },
        });
        const advanced =
          latest && latest.nextRunDate.getTime() !== rec.nextRunDate.getTime();
        if (!advanced) {
          // nextRunDate belum berubah → majukan manual agar request berikutnya
          // tidak mengulang generate yang gagal.
          await prisma.recurringTransaction.update({
            where: { id: rec.id },
            data: {
              nextRunDate: runDate,
              lastRunDate: batch[batch.length - 1].date,
            },
          });
        }
        continue;
      }
      throw err;
    }
  }

  // Transaksi baru mengubah saldo → perbarui snapshot net worth hari ini.
  if (created > 0) {
    await recordNetWorthSnapshot(userId);
  }

  return created;
}