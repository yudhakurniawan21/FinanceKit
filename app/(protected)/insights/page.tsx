import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import {
  sumByType,
  expenseByCategory,
  listTransactions,
} from "@/lib/db/transactions";
import { monthBounds } from "@/lib/formatting";
import { formatMoney } from "@/lib/currencies";
import { getNetWorthSummary } from "@/lib/db/net-worth";
import { assessFinancialHealth } from "@/lib/financial-health";
import { InsightPanel } from "@/components/insights/insight-panel";
import { createTranslator, langCode } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/insights");
  }

  const currency = user.settings?.currency ?? "IDR";
  const locale = user.settings?.locale ?? "id-ID";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const t = createTranslator(locale);

  const sp = await searchParams;
  const rawMonth = sp.month ?? "";
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth);

  let year: number;
  let monthIndex: number; // 0-based
  if (valid) {
    year = Number(rawMonth.slice(0, 4));
    monthIndex = Number(rawMonth.slice(5, 7)) - 1;
  } else {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const p: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") p[part.type] = part.value;
    }
    year = Number(p.year ?? now.getFullYear());
    monthIndex = Number(p.month ?? "01") - 1;
  }

  const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const anchor = new Date(Date.UTC(year, monthIndex, 15));
  const { start: mStart, end: mEnd } = monthBounds(anchor, timeZone);

  const nowParts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const nowP: Record<string, string> = {};
  for (const part of nowParts) {
    if (part.type !== "literal") nowP[part.type] = part.value;
  }
  const isCurrentMonth =
    `${nowP.year}-${nowP.month}` === month;

  const [stats, byCat, recent, netWorth, health] = await Promise.all([
    sumByType(user.user.id, mStart, mEnd),
    expenseByCategory(user.user.id, mStart, mEnd),
    listTransactions(user.user.id, { start: mStart, end: mEnd, limit: 8 }),
    getNetWorthSummary(user.user.id),
    assessFinancialHealth(user.user.id, {
      currency,
      locale,
      timeZone,
      dateFormat,
    }),
  ]);

  const monthLabel = new Intl.DateTimeFormat(langCode(locale), {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(anchor);

  const typeLabel = (txType: string) =>
    t(txType === "INCOME" ? "ctxTypeIncome" : "ctxTypeExpense");

  const topAssets = netWorth.assets
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const topLiabilities = netWorth.liabilities
    .slice()
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

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
    t("ctxNetWorthHeader", { currency }),
    t("ctxNetWorthAssets", {
      amount: formatMoney(netWorth.totalAssets, currency, locale),
    }),
    t("ctxNetWorthLiabilities", {
      amount: formatMoney(netWorth.totalLiabilities, currency, locale),
    }),
    t("ctxNetWorthTotal", {
      amount: formatMoney(netWorth.netWorth, currency, locale),
    }),
    t("ctxNetWorthAssetsTop", {
      list:
        topAssets
          .map((i) => `${i.name} (${formatMoney(i.value, currency, locale)})`)
          .join(", ") || "n/a",
    }),
    t("ctxNetWorthLiabilitiesTop", {
      list:
        topLiabilities
          .map((i) => `${i.name} (${formatMoney(i.value, currency, locale)})`)
          .join(", ") || "n/a",
    }),
    t("ctxGoalsTotal", {
      amount: formatMoney(netWorth.totalGoals, currency, locale),
    }),
    t("ctxGoalsList", {
      list:
        netWorth.goals
          .slice()
          .sort((a, b) => b.currentAmount - a.currentAmount)
          .slice(0, 3)
          .map(
            (g) =>
              `${g.name} (${formatMoney(g.currentAmount, currency, locale)} / ${formatMoney(g.targetAmount, currency, locale)})`
          )
          .join(", ") || "n/a",
    }),
    t("ctxSavingsMonth", {
      in: formatMoney(stats.savingsIn, currency, locale),
      out: formatMoney(stats.savingsOut, currency, locale),
    }),
    ...(health.report.insufficient
      ? []
      : [
          t("ctxHealth", {
            score: String(health.report.score),
            grade: t(
              health.report.grade === "excellent"
                ? "gradeExcellent"
                : health.report.grade === "healthy"
                  ? "gradeHealthy"
                  : health.report.grade === "fair"
                    ? "gradeFair"
                    : health.report.grade === "poor"
                      ? "gradePoor"
                      : "gradeRisky"
            ),
            list:
              health.report.metrics
                .slice()
                .sort((a, b) => a.score - b.score)
                .slice(0, 3)
                .map((m) => `${t(m.labelKey)} (${m.score})`)
                .join(", ") || "n/a",
          }),
        ]),
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
    {
      label: t("presetNetWorth"),
      prompt: t("promptNetWorth"),
    },
    {
      label: t("presetHealth"),
      prompt: t("promptHealth"),
    },
  ];

  const net = stats.income - stats.expense;
  const topCategories = byCat.slice(0, 4);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navInsights")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("insightsPageDesc")}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="h-5 w-5 text-positive" />}
          label={t("statIncome")}
          value={formatMoney(stats.income, currency, locale)}
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5 text-destructive" />}
          label={t("statExpense")}
          value={formatMoney(stats.expense, currency, locale)}
        />
        <StatCard
          icon={<Wallet className="h-5 w-5 text-primary" />}
          label={t("statNet")}
          value={formatMoney(net, currency, locale)}
          valueClassName={net >= 0 ? "text-positive" : "text-destructive"}
        />
      </div>

      {topCategories.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t("topCategories")}:
          </span>
          {topCategories.map((c) => (
            <Link
              key={c.name}
              href="/transactions"
              className="flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-xs font-medium ring-1 ring-border transition-colors hover:ring-[#9fe870]/60"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: c.color ?? undefined }}
              />
              {c.name}
              <span className="font-semibold text-muted-foreground">
                {formatMoney(c.amount, currency, locale)}
              </span>
            </Link>
          ))}
        </div>
      )}

      <p className="rounded-xl bg-muted/60 px-4 py-2.5 text-xs text-muted-foreground">
        {t("aiPrivacyNote")}
      </p>

      <InsightPanel
        key={month}
        context={context}
        presetPrompts={presetPrompts}
        month={month}
        monthLabel={monthLabel}
        isCurrentMonth={isCurrentMonth}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-3xl bg-card p-4 ring-1 ring-border">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-muted-foreground">{label}</p>
        <p className={`truncate font-bold ${valueClassName ?? ""}`}>{value}</p>
      </div>
    </div>
  );
}