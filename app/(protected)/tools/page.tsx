import { getCurrentUser } from "@/lib/session";
import { listCategories } from "@/lib/db/categories";
import {
  monthlyTotals,
  monthSpentByCategory,
} from "@/lib/db/transactions";
import { getNetWorthSummary } from "@/lib/db/net-worth";
import { monthBounds } from "@/lib/formatting";
import { getCurrencyMeta, minorToMajor } from "@/lib/currencies";
import { createTranslator } from "@/lib/i18n";
import { ToolsHub } from "@/components/tools/tools-hub";
import type { AllocCategory } from "@/lib/calculators/budget-allocator";
import type { BudgetTier } from "@/lib/generated/prisma/client";
import { redirect } from "next/navigation";

export default async function ToolsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/tools");
  }

  const currency = user.settings?.currency ?? "IDR";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);
  const precision = getCurrencyMeta(currency).minorUnit;

  const now = new Date();
  const { start, end } = monthBounds(now, timeZone);

  const [categories, monthly, spentByCategory, nw] = await Promise.all([
    listCategories(user.user.id),
    monthlyTotals(user.user.id, 3, timeZone),
    // Termasuk setoran tabungan/dana darurat agar porsi 20% terhitung.
    monthSpentByCategory(user.user.id, start, end, { includeSavings: true }),
    getNetWorthSummary(user.user.id),
  ]);

  const activeMonths = monthly.length;
  const avgIncomeMinor =
    activeMonths > 0
      ? Math.round(
          monthly.reduce((sum, m) => sum + m.income, 0) / activeMonths
        )
      : 0;

  const allocCategories: AllocCategory[] = categories.map((c) => ({
    id: c.id,
    name: c.name,
    spendMinor: spentByCategory[c.id] ?? 0,
    budgetMinor: c.budget,
    tier: c.budgetTier as BudgetTier | null,
    isSavings: c.isSavings,
    isIncome: c.type === "INCOME",
  }));

  const liabilities = nw.liabilities
    .filter((l) => l.value > 0)
    .map((l) => ({
      id: l.id,
      name: l.name,
      value: minorToMajor(l.value, currency),
      annualRatePct: l.interestRate ?? 0,
      // minPayment disimpan dalam minor unit → major untuk simulator.
      minPayment: l.minPayment ? minorToMajor(l.minPayment, currency) : 0,
    }));

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navTools")}</h1>
        <p className="text-sm text-muted-foreground">{t("toolsPageDesc")}</p>
      </div>
      <ToolsHub
        currency={currency}
        locale={locale}
        precision={precision}
        categories={allocCategories}
        avgIncomeMinor={avgIncomeMinor}
        liabilities={liabilities}
      />
    </div>
  );
}