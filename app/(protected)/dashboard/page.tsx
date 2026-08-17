import { getCurrentUser } from "@/lib/session";
import {
  monthlyTotals,
  expenseByCategory,
  sumByType,
  listTransactions,
  budgetRemaining,
} from "@/lib/db/transactions";
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

  const [monthly, byCat, recent, stats, budget] = await Promise.all([
    monthlyTotals(user.user.id, 6, timeZone),
    expenseByCategory(user.user.id, mStart, mEnd),
    listTransactions(user.user.id, { limit: 5 }),
    sumByType(user.user.id, mStart, mEnd),
    budgetRemaining(user.user.id, mStart, mEnd),
  ]);

  return (
    <DashboardView
      currency={currency}
      todayLabel={todayLabel}
      income={stats.income}
      expense={stats.expense}
      budget={budget}
      monthly={monthly}
      byCategory={byCat}
      recent={recent}
    />
  );
}
