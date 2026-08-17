"use client";

import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n/client";
import { langCode } from "@/lib/i18n";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  CalendarDays,
  PiggyBank,
  Landmark,
} from "lucide-react";
import type { TransactionWithCategory } from "@/lib/db/transactions";
import type { WalletWithBalance } from "@/lib/db/wallets";
import type { Goal } from "@/lib/generated/prisma/client";

const CHART_COLORS = {
  income: "var(--positive)",
  expense: "var(--destructive)",
} as const;

type MonthlyPt = { month: string; income: number; expense: number };
type CatAgg = { name: string; amount: number; color: string | null };

export default function DashboardView({
  currency,
  todayLabel,
  income,
  expense,
  totalBalance,
  totalSaved,
  budget,
  monthly,
  byCategory,
  recent,
  wallets,
  goals,
}: {
  currency: string;
  todayLabel: string;
  income: number;
  expense: number;
  totalBalance: number;
  totalSaved: number;
  budget: { totalBudget: number; spent: number; remaining: number };
  monthly: MonthlyPt[];
  byCategory: CatAgg[];
  recent: TransactionWithCategory[];
  wallets: WalletWithBalance[];
  goals: Goal[];
}) {
  const { t, locale } = useI18n();
  return (
    <div className="space-y-6 p-4 pb-4 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-display-sm font-display">Dashboard</h1>
        <span className="text-sm text-muted-foreground">{todayLabel}</span>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Wallet className="h-4 w-4 text-primary" />}
          label={t("statBalance")}
          value={formatMoney(totalBalance, currency, locale)}
          sub={`${wallets.length} ${t("accountsLabel").toLowerCase()}`}
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-positive" />}
          label={t("statIncome")}
          value={formatMoney(income, currency, locale)}
          sub={currency}
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          label={t("statExpense")}
          value={formatMoney(expense, currency, locale)}
          sub={currency}
        />
        <BudgetCard
          budget={budget}
          currency={currency}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Line chart: monthly totals */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("trendTitle")}</CardTitle>
            <CardDescription>{t("trendDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noData")}
              </p>
            ) : (
              <MonthlyLine monthly={monthly} currency={currency} locale={locale} />
            )}
          </CardContent>
        </Card>

        {/* Goals progress */}
        <GoalsCard
          goals={goals}
          totalSaved={totalSaved}
          currency={currency}
          locale={locale}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Pie: expense by category */}
        <Card>
          <CardHeader>
            <CardTitle>{t("catPieTitle")}</CardTitle>
            <CardDescription>
              {t("catPieDesc", { total: formatMoney(expense, currency, locale) })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noExpenses")}
              </p>
            ) : (
              <CategoryPie data={byCategory} currency={currency} locale={locale} />
            )}
          </CardContent>
        </Card>

        {/* Account balances */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("accountsCardTitle")}</CardTitle>
              <CardDescription>{t("accountsCardDesc")}</CardDescription>
            </div>
            <Link href="/accounts" className="text-sm font-medium underline">
              {t("seeAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {wallets.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("noAccounts")}</p>
            ) : (
              <div className="space-y-2">
                {wallets.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            w.color ?? "var(--muted-foreground)",
                        }}
                      />
                      <span className="text-sm font-medium">{w.name}</span>
                    </span>
                    <span
                      className={
                        "text-sm font-semibold tabular-nums " +
                        (w.balance < 0 ? "text-destructive" : "")
                      }
                    >
                      {formatMoney(w.balance, currency, locale)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t pt-2 text-sm">
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                    {t("statBalance")}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(totalBalance, currency, locale)}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{t("recentTitle")}</CardTitle>
              <CardDescription>
                {t("recentDesc")}
              </CardDescription>
            </div>
            <Link href="/transactions" className="text-sm font-medium underline">
              {t("seeAll")}
            </Link>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noTransactions")}{" "}
                <Link href="/transactions" className="underline">
                  {t("addNow")}
                </Link>
                .
              </p>
            ) : (
              <RecentList items={recent} currency={currency} locale={locale} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub: string;
}) {
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
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

function BudgetCard({
  budget,
  currency,
  locale,
}: {
  budget: { totalBudget: number; spent: number; remaining: number };
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const { totalBudget, spent, remaining } = budget;

  if (totalBudget === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-primary" />
            {t("statBudgetLeft")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-base text-muted-foreground">
            {t("noBudgetSet")}
          </div>
          <Link href="/categories" className="mt-1 block text-xs underline">
            {t("setBudget")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const over = remaining < 0;
  const pct = Math.min(100, (spent / totalBudget) * 100);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <CalendarDays className="h-4 w-4 text-primary" />
          {t("statBudgetLeft")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={
            "text-2xl font-bold " + (over ? "text-destructive" : "")
          }
        >
          {over ? "- " : ""}
          {formatMoney(Math.abs(remaining), currency, locale)}
        </div>
        <p className="text-xs text-muted-foreground">
          {t("budgetUsedOf", {
            spent: formatMoney(spent, currency, locale),
            total: formatMoney(totalBudget, currency, locale),
          })}
        </p>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={
              "h-full rounded-full " +
              (over ? "bg-destructive" : "bg-positive")
            }
            style={{ width: `${pct}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function GoalsCard({
  goals,
  totalSaved,
  currency,
  locale,
}: {
  goals: Goal[];
  totalSaved: number;
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("goalsCardTitle")}</CardTitle>
          <CardDescription>{t("goalsCardDesc")}</CardDescription>
        </div>
        <Link href="/goals" className="text-sm font-medium underline">
          {t("seeAll")}
        </Link>
      </CardHeader>
      <CardContent>
        {goals.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <PiggyBank className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("noGoalsYet")}{" "}
              <Link href="/goals" className="underline">
                {t("addNow")}
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">
                {t("totalSavedLabel")}
              </span>
              <span className="text-lg font-bold">
                {formatMoney(totalSaved, currency, locale)}
              </span>
            </div>
            {goals.slice(0, 4).map((goal) => {
              const pct =
                goal.targetAmount > 0
                  ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                  : 0;
              return (
                <div key={goal.id}>
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor:
                            goal.color ?? "var(--muted-foreground)",
                        }}
                      />
                      <span className="truncate">{goal.name}</span>
                    </span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        "h-full rounded-full " +
                        (pct >= 100 ? "bg-positive" : "bg-primary")
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
  locale,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
  locale: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-semibold text-foreground">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="ml-auto font-medium text-foreground">
            {formatMoney(entry.value, currency, locale)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthlyLine({
  monthly,
  currency,
  locale,
}: {
  monthly: MonthlyPt[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const lc = langCode(locale);
  const incomeKey = t("income");
  const expenseKey = t("expense");
  const data = monthly.map((m) => ({
    month: new Date(`${m.month}-02`).toLocaleDateString(lc, {
      month: "short",
      year: "2-digit",
    }),
    [incomeKey]: m.income,
    [expenseKey]: m.expense,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="4 4" stroke="var(--border)" />
        <XAxis
          dataKey="month"
          axisLine={false}
          tickLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
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
        <Tooltip content={<ChartTooltip currency={currency} locale={locale} />} />
        <Line
          type="monotone"
          dataKey={incomeKey}
          stroke={CHART_COLORS.income}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_COLORS.income }}
          activeDot={{ r: 5, stroke: CHART_COLORS.income, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey={expenseKey}
          stroke={CHART_COLORS.expense}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_COLORS.expense }}
          activeDot={{ r: 5, stroke: CHART_COLORS.expense, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function CategoryPie({
  data,
  currency,
  locale,
}: {
  data: CatAgg[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip
          content={<ChartTooltip currency={currency} locale={locale} />}
        />
        <Legend layout="vertical" verticalAlign="middle" align="right" />
        <Pie
          data={data}
          dataKey="amount"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={72}
          innerRadius={40}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          label={({ name, percent }: { name?: string; percent?: number }) =>
            `${name ?? t("categoryLabel")} ${((percent ?? 0) * 100).toFixed(0)}%`
          }
        >
          {data.map((e, i) => (
            <Cell
              key={e.name}
              fill={e.color ?? `var(--chart-${(i % 5) + 1})`}
            />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}

function RecentList({
  items,
  currency,
  locale,
}: {
  items: TransactionWithCategory[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      {items.map((tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <div
            key={tx.id}
            className="rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{
                    backgroundColor:
                      tx.category?.color ?? "var(--muted-foreground)",
                  }}
                />
                <span className="truncate text-sm">
                  {tx.description ?? t("noDescription")}
                </span>
              </div>
              <div
                className={
                  "shrink-0 text-sm font-medium tabular-nums " +
                  (isIncome ? "text-positive" : "text-destructive")
                }
              >
                {isIncome ? "+ " : "- "}
                {formatMoney(tx.amount, currency, locale)}
              </div>
            </div>
            {tx.category && (
              <p className="mt-0.5 pl-4 text-xs text-muted-foreground">
                {tx.category.name}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
