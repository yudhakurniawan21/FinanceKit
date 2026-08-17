import { cache } from "react";
import prisma from "@/lib/prisma";
import { type Wallet, type WalletType } from "@/lib/generated/prisma/client";

export type WalletWithBalance = Wallet & { balance: number };

// Saldo dihitung dinamis: transaksi (income − expense) + transfer masuk − keluar.
// Tidak ada kolom saldo tersimpan → bebas drift.
// Dibungkus React.cache() agar dalam satu render server (mis. dashboard yang
// memanggil listWallets + getNetWorthSummary→listWallets) query hanya jalan sekali.
export const listWallets = cache(
  async (userId: string): Promise<WalletWithBalance[]> => {
    const [wallets, txRows, trIn, trOut] = await Promise.all([
    prisma.wallet.findMany({
      where: { userId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { not: null } },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["toAccountId"],
      where: { userId },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["fromAccountId"],
      where: { userId },
      _sum: { amount: true },
    }),
  ]);

  const txBalance = new Map<string, number>();
  for (const r of txRows) {
    const id = r.accountId!;
    const delta =
      r.type === "INCOME"
        ? Number(r._sum.amount ?? 0)
        : -Number(r._sum.amount ?? 0);
    txBalance.set(id, (txBalance.get(id) ?? 0) + delta);
  }
  const inMap = new Map(trIn.map((r) => [r.toAccountId, Number(r._sum.amount ?? 0)]));
  const outMap = new Map(
    trOut.map((r) => [r.fromAccountId, Number(r._sum.amount ?? 0)])
  );

  return wallets.map((w) => ({
      ...w,
      balance:
        (txBalance.get(w.id) ?? 0) +
        (inMap.get(w.id) ?? 0) -
        (outMap.get(w.id) ?? 0),
    }));
  }
);

export async function ensureDefaultWallet(userId: string): Promise<Wallet> {
  const existing = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });
  if (existing) return existing;

  const any = await prisma.wallet.findFirst({ where: { userId } });
  if (any) {
    return prisma.wallet.update({
      where: { id: any.id },
      data: { isDefault: true },
    });
  }

  return prisma.wallet.create({
    data: {
      userId,
      name: "Kas Utama",
      type: "CASH" as WalletType,
      icon: "Wallet",
      color: "#2ead4b",
      isDefault: true,
      sortOrder: 0,
    },
  });
}

export async function listTransfers(
  userId: string,
  limit = 10
): Promise<
  Array<{
    id: string;
    amount: number;
    date: Date;
    description: string | null;
    from: { id: string; name: string };
    to: { id: string; name: string };
  }>
> {
  const rows = await prisma.transfer.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take: limit,
    include: {
      fromAccount: { select: { id: true, name: true } },
      toAccount: { select: { id: true, name: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    date: r.date,
    description: r.description,
    from: r.fromAccount,
    to: r.toAccount,
  }));
}