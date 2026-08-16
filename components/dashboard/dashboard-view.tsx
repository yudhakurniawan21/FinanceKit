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
import { formatDate } from "@/lib/formatting";
import { TrendingUp, TrendingDown, Wallet, CalendarDays } from "lucide-react";
import type { TransactionWithCategory } from "@/lib/db/transactions";

const CHART_COLORS = {
  income: "var(--positive)",
  expense: "var(--destructive)",
} as const;

type MonthlyPt = { month: string; income: number; expense: number };
type CatAgg = { name: string; amount: number; color: string | null };

export default function DashboardView({
  currency,
  dateFormat,
  timeZone,
  income,
  expense,
  budgetSum,
  monthly,
  byCategory,
  recent,
}: {
  currency: string;
  dateFormat: string;
  timeZone: string;
  income: number;
  expense: number;
  budgetSum: number;
  monthly: MonthlyPt[];
  byCategory: CatAgg[];
  recent: TransactionWithCategory[];
}) {
  return (
    <div className="space-y-6 p-4 pb-4 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-display-sm font-display">Dashboard</h1>
        <span className="text-sm text-muted-foreground">
          {formatDate(new Date(), dateFormat, timeZone)}
        </span>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<TrendingUp className="h-4 w-4 text-positive" />}
          label="Pemasukan"
          value={formatMoney(income, currency)}
          sub={currency}
        />
        <StatCard
          icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          label="Pengeluaran"
          value={formatMoney(expense, currency)}
          sub={currency}
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="Net"
          value={formatMoney(income - expense, currency)}
          sub={currency}
        />
        <StatCard
        icon={<CalendarDays className="h-4 w-4 text-primary" />}
        label="Anggaran Tersisa"
          value={formatMoney(budgetSum - expense, currency)}
          sub={currency}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Line chart: monthly totals */}
        <Card>
          <CardHeader>
            <CardTitle>Tren 6 Bulan</CardTitle>
            <CardDescription>Pemasukan vs pengeluaran.</CardDescription>
          </CardHeader>
          <CardContent>
            {monthly.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada data transaksi.
              </p>
            ) : (
              <MonthlyLine monthly={monthly} currency={currency} />
            )}
          </CardContent>
        </Card>

        {/* Pie: expense by category */}
        <Card>
          <CardHeader>
            <CardTitle>Pengeluaran per Kategori</CardTitle>
            <CardDescription>
              Bulan ini. {formatMoney(expense, currency)} total.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Tidak ada pengeluaran.
              </p>
            ) : (
              <CategoryPie data={byCategory} currency={currency} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Transaksi Terbaru</CardTitle>
            <CardDescription>
              5 transaksi terakhir.
            </CardDescription>
          </div>
          <Link href="/transactions" className="text-sm font-medium underline">
            Lihat semua
          </Link>
        </CardHeader>
        <CardContent>
          {recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi.{" "}
              <Link href="/transactions" className="underline">
                Tambahkan sekarang
              </Link>
              .
            </p>
          ) : (
            <RecentList items={recent} currency={currency} />
          )}
        </CardContent>
      </Card>
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
  value: string;
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

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  currency: string;
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
            {formatMoney(entry.value, currency)}
          </span>
        </div>
      ))}
    </div>
  );
}

function MonthlyLine({
  monthly,
  currency,
}: {
  monthly: MonthlyPt[];
  currency: string;
}) {
  const data = monthly.map((m) => ({
    month: new Date(`${m.month}-02`).toLocaleDateString("id-ID", {
      month: "short",
      year: "2-digit",
    }),
    Pemasukan: m.income,
    Pengeluaran: m.expense,
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
            new Intl.NumberFormat("id-ID", {
              notation: "compact",
              maximumFractionDigits: 0,
            }).format(v)
          }
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Line
          type="monotone"
          dataKey="Pemasukan"
          stroke={CHART_COLORS.income}
          strokeWidth={2.5}
          dot={{ r: 3, fill: CHART_COLORS.income }}
          activeDot={{ r: 5, stroke: CHART_COLORS.income, strokeWidth: 2 }}
        />
        <Line
          type="monotone"
          dataKey="Pengeluaran"
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
}: {
  data: CatAgg[];
  currency: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Tooltip
          content={<ChartTooltip currency={currency} />}
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
            `${name ?? "Kategori"} ${((percent ?? 0) * 100).toFixed(0)}%`
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
}: {
  items: TransactionWithCategory[];
  currency: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((tx) => {
        const isIncome = tx.type === "INCOME";
        return (
          <div
            key={tx.id}
            className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: tx.category?.color ?? "var(--muted-foreground)",
                }}
              />
              <span className="text-sm">{tx.description ?? "Tanpa keterangan"}</span>
              <span className="text-xs text-muted-foreground">
                {tx.category?.name ?? "—"}
              </span>
            </div>
            <div
              className={
                "text-sm font-medium " +
                (isIncome ? "text-positive" : "text-destructive")
              }
            >
              {isIncome ? "+ " : "- "}
              {formatMoney(tx.amount, currency)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
