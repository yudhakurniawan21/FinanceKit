import { getCurrentUser } from "@/lib/session";
import {
  monthlyTotals,
  expenseByCategory,
  sumByType,
  listTransactions,
  budgetSum,
} from "@/lib/db/transactions";
import { startOfMonth, endOfMonth } from "@/lib/formatting";
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
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const [monthly, byCat, recent, stats, budget] = await Promise.all([
    monthlyTotals(user.user.id, 6),
    expenseByCategory(user.user.id, mStart, mEnd),
    listTransactions(user.user.id, { limit: 5 }),
    sumByType(user.user.id, mStart, mEnd),
    budgetSum(user.user.id),
  ]);

  return (
    <DashboardView
      currency={currency}
      dateFormat={dateFormat}
      timeZone={timeZone}
      income={stats.income}
      expense={stats.expense}
      budgetSum={budget}
      monthly={monthly}
      byCategory={byCat}
      recent={recent}
    />
  );
}
