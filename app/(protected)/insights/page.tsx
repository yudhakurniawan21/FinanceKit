import { getCurrentUser } from "@/lib/session";
import {
  sumByType,
  expenseByCategory,
  listTransactions,
} from "@/lib/db/transactions";
import { monthBounds } from "@/lib/formatting";
import { formatMoney } from "@/lib/currencies";
import { InsightPanel } from "@/components/insights/insight-panel";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/insights");
  }

  const currency = user.settings?.currency ?? "IDR";
  const locale = user.settings?.locale ?? "id-ID";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const t = createTranslator(locale);
  const { start: mStart, end: mEnd } = monthBounds(new Date(), timeZone);

  const [stats, byCat, recent] = await Promise.all([
    sumByType(user.user.id, mStart, mEnd),
    expenseByCategory(user.user.id, mStart, mEnd),
    listTransactions(user.user.id, { start: mStart, end: mEnd, limit: 8 }),
  ]);

  const typeLabel = (txType: string) =>
    t(txType === "INCOME" ? "ctxTypeIncome" : "ctxTypeExpense");

  const context = [
    t("ctxSummary", { currency }),
    t("ctxIncome", { amount: formatMoney(stats.income, currency, locale) }),
    t("ctxExpense", { amount: formatMoney(stats.expense, currency, locale) }),
    t("ctxByCategory", {
      list:
        byCat
          .map((c) => `${c.name} (${formatMoney(c.amount, currency, locale)})`)
          .join(", ") || "n/a",
    }),
    t("ctxRecent", {
      list:
        recent
          .map(
            (tx) =>
              `${typeLabel(tx.type)} ${formatMoney(tx.amount, currency, locale)}${tx.description ? ` (${tx.description})` : ""}`
          )
          .join("; ") || "n/a",
    }),
  ].join("\n");

  const presetPrompts = [
    {
      label: t("presetSummary"),
      prompt: t("promptSummary"),
    },
    {
      label: t("presetSave"),
      prompt: t("promptSave"),
    },
    {
      label: t("presetBudget"),
      prompt: t("promptBudget"),
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navInsights")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("insightsPageDesc")}
        </p>
      </div>
      <InsightPanel context={context} presetPrompts={presetPrompts} />
    </div>
  );
}
