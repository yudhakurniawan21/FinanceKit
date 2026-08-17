import prisma from "@/lib/prisma";
import {
  TransactionType,
  type Transaction,
} from "@/lib/generated/prisma/client";
import { monthBounds } from "@/lib/formatting";

export interface TransactionWithCategory extends Transaction {
  category: { name: string; color: string | null; icon: string | null } | null;
  account: { id: string; name: string; color: string | null } | null;
}

export async function listTransactions(
  userId: string,
  params: {
    start?: Date;
    end?: Date;
    type?: TransactionType;
    categoryId?: string;
    limit?: number;
  } = {}
): Promise<TransactionWithCategory[]> {
  return prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: params.start,
        lte: params.end,
      },
      ...(params.type ? { type: params.type } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
    },
    include: {
      category: { select: { name: true, color: true, icon: true } },
      account: { select: { id: true, name: true, color: true } },
    },
    orderBy: { date: "desc" },
    take: params.limit,
  });
}

// Agregat per bulan untuk line chart (income & expense) — jendela dimulai
// dari awal bulan (months-1) yang lalu, basis bulan dihitung dalam timezone
// user (bukan timezone server/DB) agar konsisten dengan tampilan lain.
export async function monthlyTotals(userId: string, months = 6, timeZone = "Asia/Jakarta") {
  const { start } = monthBounds(new Date(), timeZone);
  const startDate = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - (months - 1), 1)
  );

  const res = await prisma.$queryRaw<
    Array<{
      month: string; // YYYY-MM
      total: number;
      type: string;
    }>
  >`
    SELECT
      to_char("date", 'YYYY-MM') AS month,
      SUM("amount")::float AS total,
      "type"
    FROM "transaction"
    WHERE "userId" = ${userId}
      AND "date" >= ${startDate}
    GROUP BY month, "type"
    ORDER BY month ASC
  `;

  const map = new Map<string, { income: number; expense: number }>();
  for (const row of res) {
    const month = row.month;
    const cur = map.get(month) ?? { income: 0, expense: 0 };
    if (row.type === "INCOME") cur.income += row.total;
    else cur.expense += row.total;
    map.set(month, cur);
  }

  return Array.from(map.entries()).map(([month, v]) => ({
    month,
    income: v.income,
    expense: v.expense,
  }));
}

// Agregat per kategori untuk pie chart (hanya EXPENSE).
export async function expenseByCategory(
  userId: string,
  start: Date,
  end: Date
): Promise<Array<{ name: string; amount: number; color: string | null }>> {
  return prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  }).then(async (groups) => {
    const ids = groups.map((g) => g.categoryId!).filter(Boolean);
    const cats = await prisma.category.findMany({
      where: { id: { in: ids as string[] } },
      select: { id: true, name: true, color: true },
    });
    const byId = new Map(cats.map((c) => [c.id, c]));
    return groups
      .map((g) => {
        const cat = g.categoryId ? byId.get(g.categoryId) : null;
        if (!cat) return null;
        return {
          name: cat.name,
          amount: g._sum.amount ?? 0,
          color: cat.color,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  });
}

// Total anggaran & pemakaian bulan ini untuk kategori PENGELUARAN berbudget.
// Semantik: sisa = Σ per kategori (budget − pengeluaran kategori itu),
// hanya kategori yang benar-benar punya budget.
export async function budgetRemaining(
  userId: string,
  start: Date,
  end: Date
): Promise<{ totalBudget: number; spent: number; remaining: number }> {
  const cats = await prisma.category.findMany({
    where: { userId, type: "EXPENSE", budget: { not: null } },
    select: { id: true, budget: true },
  });
  if (cats.length === 0) {
    return { totalBudget: 0, spent: 0, remaining: 0 };
  }

  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
      categoryId: { in: cats.map((c) => c.id) },
    },
    _sum: { amount: true },
  });
  const spentByCat = new Map(
    rows.map((r) => [r.categoryId, Number(r._sum.amount ?? 0)])
  );

  let totalBudget = 0;
  let spent = 0;
  for (const c of cats) {
    totalBudget += c.budget ?? 0;
    spent += spentByCat.get(c.id) ?? 0;
  }
  return { totalBudget, spent, remaining: totalBudget - spent };
}

// Pengeluaran bulan ini per kategori (minor unit), utk progress bar budget.
export async function monthSpentByCategory(
  userId: string,
  start: Date,
  end: Date
): Promise<Record<string, number>> {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: "EXPENSE",
      date: { gte: start, lte: end },
      categoryId: { not: null },
    },
    _sum: { amount: true },
  });
  return Object.fromEntries(
    rows.map((r) => [r.categoryId!, Number(r._sum.amount ?? 0)])
  );
}

// Total pemasukan & pengeluaran periode ini (minor unit).
export async function sumByType(
  userId: string,
  start: Date,
  end: Date
): Promise<{ income: number; expense: number }> {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: { gte: start, lte: end } },
    _sum: { amount: true },
  });
  const income = Number(
    rows.find((r) => r.type === "INCOME")?._sum?.amount ?? 0
  );
  const expense = Number(
    rows.find((r) => r.type === "EXPENSE")?._sum?.amount ?? 0
  );
  return { income, expense };
}

// Agregat per kategori (expense ATAU income) + budget kategori utk laporan.
export async function categoryTotals(
  userId: string,
  start: Date,
  end: Date,
  type: TransactionType
): Promise<
  Array<{
    id: string;
    name: string;
    color: string | null;
    amount: number;
    budget: number | null;
  }>
> {
  const groups = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type,
      date: { gte: start, lte: end },
      categoryId: { not: null },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: "desc" } },
  });
  const ids = groups.map((g) => g.categoryId!).filter(Boolean);
  if (ids.length === 0) return [];
  const cats = await prisma.category.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, color: true, budget: true },
  });
  const byId = new Map(cats.map((c) => [c.id, c]));
  return groups
    .map((g) => {
      const cat = g.categoryId ? byId.get(g.categoryId) : null;
      if (!cat) return null;
      return {
        id: cat.id,
        name: cat.name,
        color: cat.color,
        amount: Number(g._sum.amount ?? 0),
        budget: cat.budget,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
}

// Pengeluaran per hari (minor unit), utk bar chart laporan bulanan.
// Pakai raw SQL GROUP BY agar tidak memuat semua baris transaksi ke memori.
export async function dailyTotals(
  userId: string,
  start: Date,
  end: Date
): Promise<Array<{ date: Date; amount: number }>> {
  const rows = await prisma.$queryRaw<
    Array<{ day: string; total: number }>
  >`
    SELECT
      to_char("date", 'YYYY-MM-DD') AS day,
      SUM("amount")::float AS total
    FROM "transaction"
    WHERE "userId" = ${userId}
      AND "type" = 'EXPENSE'
      AND "date" >= ${start}
      AND "date" <= ${end}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r) => ({
    date: new Date(`${r.day}T00:00:00Z`),
    amount: Math.round(r.total),
  }));
}
