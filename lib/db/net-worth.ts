import prisma from "@/lib/prisma";
import { listWallets } from "@/lib/db/wallets";
import type { NetWorthItem } from "@/lib/generated/prisma/client";

export interface GoalSavings {
  id: string;
  name: string;
  color: string | null;
  currentAmount: number;
  targetAmount: number;
}

export interface NetWorthSummary {
  // Aset likuid dari saldo dompet (otomatis).
  totalLiquid: number;
  // Item aset/kewajiban manual + totalnya.
  assets: NetWorthItem[];
  liabilities: NetWorthItem[];
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  // Dana yang disisihkan ke tujuan menabung (otomatis).
  goals: GoalSavings[];
  totalGoals: number;
}

// Net worth = aset likuid (saldo dompet) + aset manual + tabungan tujuan
// − kewajiban manual.
export async function getNetWorthSummary(
  userId: string
): Promise<NetWorthSummary> {
  const [wallets, items, goals] = await Promise.all([
    listWallets(userId),
    prisma.netWorthItem.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.goal.findMany({
      where: { userId, currentAmount: { gt: 0 } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        color: true,
        currentAmount: true,
        targetAmount: true,
      },
    }),
  ]);

  const totalLiquid = wallets.reduce((sum, w) => sum + w.balance, 0);
  const assets = items.filter((i) => i.type === "ASSET");
  const liabilities = items.filter((i) => i.type === "LIABILITY");
  const totalGoals = goals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalAssets =
    totalLiquid + assets.reduce((sum, i) => sum + i.value, 0) + totalGoals;
  const totalLiabilities = liabilities.reduce((sum, i) => sum + i.value, 0);

  return {
    totalLiquid,
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    goals,
    totalGoals,
  };
}

// Hitung ulang net worth lalu simpan snapshot hari ini (satu per user per tanggal).
export async function recordNetWorthSnapshot(userId: string): Promise<void> {
  const summary = await getNetWorthSummary(userId);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.netWorthSnapshot.upsert({
    where: { userId_date: { userId, date: today } },
    create: {
      userId,
      date: today,
      totalAssets: summary.totalAssets,
      totalLiabilities: summary.totalLiabilities,
      netWorth: summary.netWorth,
    },
    update: {
      totalAssets: summary.totalAssets,
      totalLiabilities: summary.totalLiabilities,
      netWorth: summary.netWorth,
    },
  });
}

export interface SnapshotPoint {
  date: Date;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

// Snapshot N hari terakhir (diurutkan naik) untuk grafik tren.
export async function listNetWorthSnapshots(
  userId: string,
  days = 90
): Promise<SnapshotPoint[]> {
  const from = new Date();
  from.setUTCHours(0, 0, 0, 0);
  from.setUTCDate(from.getUTCDate() - (days - 1));

  const rows = await prisma.netWorthSnapshot.findMany({
    where: { userId, date: { gte: from } },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({
    date: r.date,
    totalAssets: r.totalAssets,
    totalLiabilities: r.totalLiabilities,
    netWorth: r.netWorth,
  }));
}