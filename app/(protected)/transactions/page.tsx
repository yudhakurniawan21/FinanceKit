import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { ensureDefaultWallet, listWallets } from "@/lib/db/wallets";
import { listTransactions } from "@/lib/db/transactions";
import prisma from "@/lib/prisma";
import { processDueRecurring } from "@/lib/db/recurring";
import { TransactionManager } from "@/components/transactions/transaction-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/transactions");
  }

  const LIMIT = 500;

  const [categories, transactions, wallets, goals, liabilities, totalCount] = await Promise.all([
    ensureDefaultCategories(user.user.id),
    listTransactions(user.user.id, { limit: LIMIT }),
    ensureDefaultWallet(user.user.id).then(() => listWallets(user.user.id)),
    prisma.goal.findMany({
      where: { userId: user.user.id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        currentAmount: true,
        targetAmount: true,
      },
    }),
    prisma.netWorthItem.findMany({
      where: { userId: user.user.id, type: "LIABILITY" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    // Lazy: generate transaksi berulang yang jatuh tempo sebelum data dibaca.
    processDueRecurring(user.user.id).then(() =>
      prisma.transaction.count({ where: { userId: user.user.id } })
    ),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navTransactions")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("txPageDesc")}
        </p>
      </div>
      <TransactionManager
        transactions={transactions}
        categories={categories}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
        goals={goals}
        liabilities={liabilities}
        totalCount={totalCount}
      />
    </div>
  );
}
