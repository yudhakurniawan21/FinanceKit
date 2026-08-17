"use client";

import { useRouter } from "next/navigation";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n/client";
import { langCode } from "@/lib/i18n";
import { shiftMonth } from "@/lib/formatting";
import { TrendingUp, TrendingDown, Wallet, ChevronLeft, ChevronRight } from "lucide-react";

type Agg = {
  id: string;
  name: string;
  color: string | null;
  amount: number;
  budget: number | null;
};

export function ReportView({
  month,
  monthLabel,
  prevLabel,
  cur,
  prev,
  expenseByCategory,
  incomeByCategory,
  daily,
  currency,
  locale,
}: {
  month: string;
  monthLabel: string;
  prevLabel: string;
  cur: { income: number; expense: number; savingsIn: number; savingsOut: number };
  prev: { income: number; expense: number; savingsIn: number; savingsOut: number };
  expenseByCategory: Agg[];
  incomeByCategory: Agg[];
  daily: Array<{ date: Date; amount: number }>;
  currency: string;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const lc = langCode(locale);

  const net = cur.income - cur.expense;
  const totalExpense = cur.expense;

  const pct = (curX: number, prevX: number): number | null =>
    prevX > 0 ? ((curX - prevX) / prevX) * 100 : null;

  const expensePct = pct(cur.expense, prev.expense);
  const incomePct = pct(cur.income, prev.income);
  const netPct = pct(net, prev.income - prev.expense);

  const dailyData = daily.map((d) => ({
    day: new Intl.DateTimeFormat(lc, { day: "numeric" }).format(d.date),
    [t("expense")]: d.amount,
  }));

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("prevMonth")}
          onClick={() => router.push(`/reports?month=${shiftMonth(month, -1)}`)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <p className="text-lg font-semibold capitalize">{monthLabel}</p>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={t("nextMonth")}
          onClick={() => router.push(`/reports?month=${shiftMonth(month, 1)}`)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <ReportStat
          icon={<TrendingUp className="h-4 w-4 text-positive" />}
          label={t("statIncome")}
          value={formatMoney(cur.income, currency, locale)}
          delta={incomePct}
          prevLabel={prevLabel}
        />
        <ReportStat
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          label={t("statExpense")}
          value={formatMoney(cur.expense, currency, locale)}
          delta={expensePct}
          prevLabel={prevLabel}
        />
        <ReportStat
          icon={<Wallet className="h-4 w-4" />}
          label={t("statNet")}
          value={formatMoney(net, currency, locale)}
          delta={netPct}
          prevLabel={prevLabel}
        />
      </div>

      {(cur.savingsIn > 0 || cur.savingsOut > 0) && (
        <p className="text-sm text-muted-foreground">
          {t("savingsFlowLabel")}:{" "}
          <span className="font-medium text-foreground">
            {t("savingsInLabel")} {formatMoney(cur.savingsIn, currency, locale)}
          </span>{" "}
          ·{" "}
          <span className="font-medium text-foreground">
            {t("savingsOutLabel")} {formatMoney(cur.savingsOut, currency, locale)}
          </span>
        </p>
      )}

      {/* Daily spending chart */}
      <Card>
        <CardHeader>
          <CardTitle>{t("dailySpendTitle")}</CardTitle>
          <CardDescription>{t("dailySpendDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noData")}</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat(lc, {
                      notation: "compact",
                      maximumFractionDigits: 0,
                    }).format(v)
                  }
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted-foreground)", opacity: 0.1 }}
                  content={<DailyTooltip currency={currency} locale={locale} />}
                />
                <Bar
                  dataKey={t("expense")}
                  fill="var(--destructive)"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Expense by category */}
        <CategoryBreakdown
          title={t("expenseByCatTitle")}
          items={expenseByCategory}
          total={totalExpense}
          currency={currency}
          locale={locale}
          showBudget
        />

        {/* Income by category */}
        <CategoryBreakdown
          title={t("incomeByCatTitle")}
          items={incomeByCategory}
          total={cur.income}
          currency={currency}
          locale={locale}
          showBudget={false}
        />
      </div>
    </div>
  );
}

function ReportStat({
  icon,
  label,
  value,
  delta,
  prevLabel,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: number | null;
  prevLabel: string;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {delta != null ? (
          <p
            className={
              "text-xs " +
              (delta > 0 ? "text-destructive" : delta < 0 ? "text-positive" : "text-muted-foreground")
            }
          >
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(1)}%
            {" "}{t("vsPrev", { prev: prevLabel })}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {t("vsPrev", { prev: prevLabel })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function CategoryBreakdown({
  title,
  items,
  total,
  currency,
  locale,
  showBudget,
}: {
  title: string;
  items: Agg[];
  total: number;
  currency: string;
  locale: string;
  showBudget: boolean;
}) {
  const { t } = useI18n();
  if (items.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => {
          const pct = total > 0 ? (item.amount / total) * 100 : 0;
          const over = showBudget && item.budget != null && item.amount > item.budget;
          const budgetPct =
            showBudget && item.budget && item.budget > 0
              ? Math.min(100, (item.amount / item.budget) * 100)
              : 0;
          return (
            <div key={item.id}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: item.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="font-medium">{item.name}</span>
                  <span className="text-muted-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {formatMoney(item.amount, currency, locale)}
                </span>
              </div>
              {showBudget && item.budget != null && (
                <div className="mt-1 space-y-0.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        "h-full rounded-full " +
                        (over ? "bg-destructive" : "bg-positive")
                      }
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                  <p
                    className={
                      "text-xs " +
                      (over ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {t("budgetUsedOf", {
                      spent: formatMoney(item.amount, currency, locale),
                      total: formatMoney(item.budget, currency, locale),
                    })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function DailyTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="text-xs font-semibold text-foreground">
        {t("colDate")} {label}
      </p>
      <p className="text-xs text-muted-foreground">
        {t("expense")}:{" "}
        <span className="font-medium text-foreground">
          {formatMoney(payload[0].value, currency, locale)}
        </span>
      </p>
    </div>
  );
}