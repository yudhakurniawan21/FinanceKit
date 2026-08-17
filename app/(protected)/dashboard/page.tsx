import { getCurrentUser } from "@/lib/session";
import {
  monthlyTotals,
  expenseByCategory,
  sumByType,
  listTransactions,
  budgetRemaining,
} from "@/lib/db/transactions";
import { processDueRecurring } from "@/lib/db/recurring";
import { listWallets } from "@/lib/db/wallets";
import { listGoals, goalMonthlyNeeded } from "@/lib/db/goals";
import { getNetWorthSummary } from "@/lib/db/net-worth";
import { assessFinancialHealth } from "@/lib/financial-health";
import { monthBounds, formatDate } from "@/lib/formatting";
import DashboardView from "@/components/dashboard/dashboard-view";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/dashboard");
  }

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const now = new Date();
  const { start: mStart, end: mEnd } = monthBounds(now, timeZone);
  const todayLabel = formatDate(now, dateFormat, timeZone, locale);

  const [monthly, byCat, recent, stats, budget, wallets, goals, nw, health] =
    await Promise.all([
      monthlyTotals(user.user.id, 6, timeZone),
      expenseByCategory(user.user.id, mStart, mEnd),
      listTransactions(user.user.id, { limit: 5 }),
      sumByType(user.user.id, mStart, mEnd),
      budgetRemaining(user.user.id, mStart, mEnd),
      listWallets(user.user.id),
      listGoals(user.user.id),
      getNetWorthSummary(user.user.id),
      assessFinancialHealth(user.user.id, {
        currency,
        locale,
        timeZone,
        dateFormat,
      }),
      // Lazy: generate transaksi berulang yang jatuh tempo sebelum data dibaca.
      processDueRecurring(user.user.id),
    ]);

  const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
  const totalSaved = goals.reduce((acc, g) => acc + g.currentAmount, 0);
  const goalMonthly: Record<string, number> = Object.fromEntries(
    goals
      .map((g) => [g.id, goalMonthlyNeeded(g, now)])
      .filter(([, v]) => v != null)
  );

  return (
    <DashboardView
      currency={currency}
      todayLabel={todayLabel}
      income={stats.income}
      expense={stats.expense}
      totalBalance={totalBalance}
      totalSaved={totalSaved}
      budget={budget}
      monthly={monthly}
      byCategory={byCat}
      recent={recent}
      wallets={wallets}
      goals={goals}
      netWorth={nw.netWorth}
      totalAssets={nw.totalAssets}
      totalLiabilities={nw.totalLiabilities}
      health={health.report}
      actions={health.actions}
      goalMonthly={goalMonthly}
    />
  );
}
