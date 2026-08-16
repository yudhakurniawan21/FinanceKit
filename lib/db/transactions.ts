import prisma from "@/lib/prisma";
import {
  TransactionType,
  type Transaction,
} from "@/lib/generated/prisma/client";

export interface TransactionWithCategory extends Transaction {
  category: { name: string; color: string | null; icon: string | null } | null;
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
    include: { category: { select: { name: true, color: true, icon: true } } },
    orderBy: { date: "desc" },
    take: params.limit,
  });
}

// Agregat per bulan untuk line chart (income & expense) — bulan kalender,
// dimulai dari awal bulan (months-1) yang lalu sehingga tidak terpotong
// di tengah bulan.
export async function monthlyTotals(userId: string, months = 6) {
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
      AND "date" >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' * ${months - 1}::int
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

// Jumlah total anggaran (minor unit) kategori PENGELUARAN yang diatur pengguna.
export async function budgetSum(userId: string): Promise<number> {
  const res = await prisma.category.aggregate({
    where: { userId, type: "EXPENSE", budget: { not: null } },
    _sum: { budget: true },
  });
  return res._sum.budget ?? 0;
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
