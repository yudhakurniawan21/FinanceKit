import { monthBounds } from "@/lib/formatting";
import {
  monthlyTotals,
  sumByType,
  budgetRemaining,
} from "@/lib/db/transactions";
import { getNetWorthSummary } from "@/lib/db/net-worth";
import { listGoals } from "@/lib/db/goals";
import { listUpcomingRecurring } from "@/lib/db/recurring";
import { formatMoney } from "@/lib/currencies";
import type { DictKey } from "@/lib/i18n";

// ── Skor Kesehatan Keuangan (deterministik, tanpa AI) ──────────────────
// 6 metrik berbobot dari data yang sudah ada; skor 0-100 dipetakan ke
// grade. Detail & tip adalah kunci i18n + parameter yang dirender client.

export type HealthGrade = "excellent" | "healthy" | "fair" | "poor" | "risky";
export type MetricKey =
  | "emergencyFund"
  | "savingsRate"
  | "debtRatio"
  | "budgetDiscipline"
  | "cashFlow"
  | "goalProgress";

export type MetricStatus = "good" | "warning" | "bad" | "neutral";

export interface HealthMetric {
  key: MetricKey;
  score: number; // 0..100
  status: MetricStatus;
  labelKey: DictKey;
  detail: string; // nilai terformat, dirender apa adanya
  tipKey: DictKey;
  tipParams: Record<string, string>;
  // Penjelasan sumber & rumus perhitungan (tooltip transparansi).
  explainKey: DictKey;
  explainParams: Record<string, string>;
}

export interface HealthReport {
  insufficient: boolean;
  score: number;
  grade: HealthGrade;
  metrics: HealthMetric[];
}

export interface ActionItem {
  key: string;
  severity: "high" | "medium" | "low";
  titleKey: DictKey;
  titleParams: Record<string, string>;
  href: string;
}

export interface FinancialHealth {
  report: HealthReport;
  actions: ActionItem[];
}

interface EvalOptions {
  currency: string;
  locale: string;
  timeZone: string;
  dateFormat: string;
}

const METRIC_LABEL_KEYS: Record<MetricKey, DictKey> = {
  emergencyFund: "healthMetricEmergency",
  savingsRate: "healthMetricSavings",
  debtRatio: "healthMetricDebt",
  budgetDiscipline: "healthMetricBudget",
  cashFlow: "healthMetricCashflow",
  goalProgress: "healthMetricGoals",
};

function statusOf(score: number): MetricStatus {
  if (score >= 75) return "good";
  if (score >= 45) return "warning";
  return "bad";
}

function gradeOf(score: number): HealthGrade {
  if (score >= 80) return "excellent";
  if (score >= 65) return "healthy";
  if (score >= 50) return "fair";
  if (score >= 35) return "poor";
  return "risky";
}

export async function assessFinancialHealth(
  userId: string,
  opts: EvalOptions
): Promise<FinancialHealth> {
  const now = new Date();
  const { start, end } = monthBounds(now, opts.timeZone);

  const [months, stats, budget, nw, goals, upcoming] = await Promise.all([
    monthlyTotals(userId, 6, opts.timeZone),
    sumByType(userId, start, end),
    budgetRemaining(userId, start, end),
    getNetWorthSummary(userId),
    listGoals(userId),
    listUpcomingRecurring(userId, 14),
  ]);

  const money = (v: number) => formatMoney(v, opts.currency, opts.locale);
  const pctFmt = (v: number) =>
    new Intl.NumberFormat(opts.locale, { maximumFractionDigits: 0 }).format(v);
  const decFmt = (v: number) =>
    new Intl.NumberFormat(opts.locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(v);
  const activeMonths = months.filter((m) => m.income > 0 || m.expense > 0);

  const report: HealthReport = {
    insufficient:
      activeMonths.length === 0 && stats.income === 0 && stats.expense === 0,
    score: 0,
    grade: "fair",
    metrics: [],
  };

  if (report.insufficient) return { report, actions: [] };

  // 1. Dana darurat (25%) — bulan pengeluaran yang bisa ditutup aset likuid
  //    + goal yang ditandai sebagai dana darurat (isEmergency).
  const recentExpenses = months.slice(-3).map((m) => m.expense);
  const avgExpense =
    recentExpenses.length > 0
      ? recentExpenses.reduce((a, b) => a + b, 0) / recentExpenses.length
      : 0;
  const emergencyGoals = nw.goals.filter((g) => g.isEmergency);
  const emergencyBase =
    nw.totalLiquid +
    emergencyGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const hasFlaggedEmergency = emergencyGoals.length > 0;
  const hasUnflaggedGoals = nw.goals.length > 0 && !hasFlaggedEmergency;

  let emergency: HealthMetric;
  if (avgExpense <= 0) {
    emergency = {
      key: "emergencyFund",
      score: 60,
      status: "neutral",
      labelKey: METRIC_LABEL_KEYS.emergencyFund,
      detail: "—",
      tipKey: "tipEmergencyNoData",
      tipParams: {},
      explainKey: "explainEmergency",
      explainParams: {
        liquid: "—",
        emergency: "—",
        expense: "—",
        months: "—",
      },
    };
  } else {
    const monthsLiquid = emergencyBase / avgExpense;
    const monthsTxt = decFmt(monthsLiquid);
    const need = (3 - monthsLiquid) * avgExpense;
    let score: number;
    if (monthsLiquid >= 6) score = 100;
    else if (monthsLiquid >= 3)
      score = 60 + ((monthsLiquid - 3) / 3) * 40;
    else if (monthsLiquid >= 1) score = 20 + ((monthsLiquid - 1) / 2) * 40;
    else score = Math.max(0, monthsLiquid * 20);

    const tipKey =
      monthsLiquid >= 6
        ? "tipEmergencyGood"
        : monthsLiquid >= 3
          ? "tipEmergencyOk"
          : monthsLiquid >= 1
            ? hasUnflaggedGoals
              ? "tipEmergencyNoFlag"
              : "tipEmergencyAdd"
            : hasUnflaggedGoals
              ? "tipEmergencyNoFlag"
              : "tipEmergencyCritical";

    emergency = {
      key: "emergencyFund",
      score: Math.round(score),
      status:
        monthsLiquid >= 3
          ? "good"
          : monthsLiquid >= 1
            ? "warning"
            : "bad",
      labelKey: METRIC_LABEL_KEYS.emergencyFund,
      detail: monthsTxt,
      tipKey,
      tipParams: {
        months: monthsTxt,
        amount: money(Math.max(0, Math.round(need))),
      },
      explainKey: "explainEmergency",
      explainParams: {
        liquid: money(nw.totalLiquid),
        emergency: money(
          emergencyGoals.reduce((sum, g) => sum + g.currentAmount, 0)
        ),
        expense: money(Math.round(avgExpense)),
        months: monthsTxt,
      },
    };
  }

  // 2. Tabungan bulanan (20%) — surplus / pemasukan (aturan 50/30/20).
  const surplus =
    stats.income - stats.expense - stats.savingsIn + stats.savingsOut;
  let savings: HealthMetric;
  if (stats.income <= 0) {
    savings = {
      key: "savingsRate",
      score: 50,
      status: "neutral",
      labelKey: METRIC_LABEL_KEYS.savingsRate,
      detail: "—",
      tipKey: "tipSavingsNoIncome",
      tipParams: {},
      explainKey: "explainSavings",
      explainParams: {
        income: "—",
        expense: "—",
        savingsIn: "—",
        savingsOut: "—",
        surplus: "—",
        pct: "—",
      },
    };
  } else {
    const rate = surplus / stats.income;
    const pct = pctFmt(rate * 100);
    const needMore = Math.max(0, 0.2 * stats.income - surplus);
    let score: number;
    let tipKey: DictKey;
    let status: MetricStatus;
    if (rate >= 0.3) {
      score = 100;
      tipKey = "tipSavingsGood";
      status = "good";
    } else if (rate >= 0.2) {
      score = 80;
      tipKey = "tipSavingsGood";
      status = "good";
    } else if (rate >= 0) {
      score = 55;
      tipKey = "tipSavingsAdd";
      status = "warning";
    } else {
      score = 10;
      tipKey = "tipSavingsNegative";
      status = "bad";
    }
    savings = {
      key: "savingsRate",
      score,
      status,
      labelKey: METRIC_LABEL_KEYS.savingsRate,
      detail: `${pct}%`,
      tipKey,
      tipParams: { amount: money(Math.round(needMore)) },
      explainKey: "explainSavings",
      explainParams: {
        income: money(stats.income),
        expense: money(stats.expense),
        savingsIn: money(stats.savingsIn),
        savingsOut: money(stats.savingsOut),
        surplus: money(surplus),
        pct,
      },
    };
  }

  // 3. Rasio utang (20%) — kewajiban / aset, penalti jika net worth negatif.
  let debt: HealthMetric;
  if (nw.totalAssets <= 0 && nw.totalLiabilities <= 0) {
    debt = {
      key: "debtRatio",
      score: 50,
      status: "neutral",
      labelKey: METRIC_LABEL_KEYS.debtRatio,
      detail: "—",
      tipKey: "tipDebtNoData",
      tipParams: {},
      explainKey: "explainDebt",
      explainParams: { liabilities: "—", assets: "—", pct: "—" },
    };
  } else {
    const ratio = nw.totalAssets > 0 ? nw.totalLiabilities / nw.totalAssets : 2;
    const pct = pctFmt(ratio * 100);
    let score: number;
    let tipKey: DictKey;
    if (ratio === 0) {
      score = 100;
      tipKey = "tipDebtNone";
    } else if (ratio <= 0.2) {
      score = 85;
      tipKey = "tipDebtOk";
    } else if (ratio <= 0.4) {
      score = 65;
      tipKey = "tipDebtReduce";
    } else if (ratio <= 0.6) {
      score = 40;
      tipKey = "tipDebtReduce";
    } else {
      score = 15;
      tipKey = "tipDebtHigh";
    }
    if (nw.netWorth < 0) {
      score = Math.min(score, 25);
      tipKey = "tipDebtNegative";
    }
    debt = {
      key: "debtRatio",
      score,
      status:
        nw.netWorth < 0 || ratio > 0.6
          ? "bad"
          : ratio > 0.4
            ? "warning"
            : "good",
      labelKey: METRIC_LABEL_KEYS.debtRatio,
      detail: nw.totalLiabilities === 0 ? "0%" : `${pct}%`,
      tipKey,
      tipParams: { pct: String(pct) },
      explainKey: "explainDebt",
      explainParams: {
        liabilities: money(nw.totalLiabilities),
        assets: money(nw.totalAssets),
        pct: String(pct),
      },
    };
  }

  // 4. Disiplin anggaran (15%).
  let budgetMetric: HealthMetric;
  if (budget.totalBudget === 0) {
    budgetMetric = {
      key: "budgetDiscipline",
      score: 50,
      status: "neutral",
      labelKey: METRIC_LABEL_KEYS.budgetDiscipline,
      detail: "—",
      tipKey: "tipBudgetNotSet",
      tipParams: {},
      explainKey: "explainBudget",
      explainParams: { spent: "—", budget: "—", pct: "—" },
    };
  } else {
    const pctRaw = (budget.spent / budget.totalBudget) * 100;
    const pct = pctFmt(pctRaw);
    let score: number;
    let tipKey: DictKey;
    let status: MetricStatus;
    if (pctRaw <= 80) {
      score = 90;
      tipKey = "tipBudgetGood";
      status = "good";
    } else if (pctRaw <= 100) {
      score = 70;
      tipKey = "tipBudgetOk";
      status = "good";
    } else if (pctRaw <= 120) {
      score = 40;
      tipKey = "tipBudgetOver";
      status = "warning";
    } else {
      score = 15;
      tipKey = "tipBudgetOver";
      status = "bad";
    }
    budgetMetric = {
      key: "budgetDiscipline",
      score,
      status,
      labelKey: METRIC_LABEL_KEYS.budgetDiscipline,
      detail: `${pct}%`,
      tipKey,
      tipParams: { pct: String(pct) },
      explainKey: "explainBudget",
      explainParams: {
        spent: money(budget.spent),
        budget: money(budget.totalBudget),
        pct: String(pct),
      },
    };
  }

  // 5. Arus kas (10%) — banyaknya bulan defisit dalam jendela 6 bulan.
  const totalMonths = Math.max(1, months.length);
  const deficits = months.filter((m) => m.expense > m.income).length;
  let cashScore: number;
  let cashTip: DictKey;
  if (deficits === 0) {
    cashScore = 100;
    cashTip = "tipCashflowGood";
  } else if (deficits === 1) {
    cashScore = 80;
    cashTip = "tipCashflowGood";
  } else if (deficits === 2) {
    cashScore = 60;
    cashTip = "tipCashflowReduce";
  } else if (deficits === 3) {
    cashScore = 35;
    cashTip = "tipCashflowReduce";
  } else {
    cashScore = 10;
    cashTip = "tipCashflowCritical";
  }
  const cash: HealthMetric = {
    key: "cashFlow",
    score: cashScore,
    status: statusOf(cashScore),
    labelKey: METRIC_LABEL_KEYS.cashFlow,
    detail: String(deficits),
    tipKey: cashTip,
    tipParams: { count: String(deficits), total: String(totalMonths) },
    explainKey: "explainCashflow",
    explainParams: {
      count: String(deficits),
      total: String(totalMonths),
    },
  };

  // 6. Progres tujuan (10%) — rata-rata % target terkumpul.
  let goalMetric: HealthMetric;
  if (nw.goals.length === 0) {
    goalMetric = {
      key: "goalProgress",
      score: 50,
      status: "neutral",
      labelKey: METRIC_LABEL_KEYS.goalProgress,
      detail: "—",
      tipKey: "tipGoalsNone",
      tipParams: {},
      explainKey: "explainGoals",
      explainParams: { avg: "—", count: "0" },
    };
  } else {
    const avg =
      nw.goals.reduce((acc, g) => {
        if (g.targetAmount <= 0) return acc;
        return acc + Math.min(100, (g.currentAmount / g.targetAmount) * 100);
      }, 0) / nw.goals.length;
    let score: number;
    let tipKey: DictKey;
    if (avg >= 80) {
      score = 100;
      tipKey = "tipGoalsGood";
    } else if (avg >= 50) {
      score = 75;
      tipKey = "tipGoalsGood";
    } else if (avg >= 25) {
      score = 50;
      tipKey = "tipGoalsAdd";
    } else if (avg > 0) {
      score = 25;
      tipKey = "tipGoalsAdd";
    } else {
      score = 10;
      tipKey = "tipGoalsStuck";
    }
    goalMetric = {
      key: "goalProgress",
      score,
      status: statusOf(score),
      labelKey: METRIC_LABEL_KEYS.goalProgress,
      detail: `${Math.round(avg)}%`,
      tipKey,
      tipParams: {},
      explainKey: "explainGoals",
      explainParams: {
        avg: pctFmt(avg),
        count: String(nw.goals.length),
      },
    };
  }

  const metrics = [emergency, savings, debt, budgetMetric, cash, goalMetric];
  const weights: Record<MetricKey, number> = {
    emergencyFund: 0.25,
    savingsRate: 0.2,
    debtRatio: 0.2,
    budgetDiscipline: 0.15,
    cashFlow: 0.1,
    goalProgress: 0.1,
  };
  const score = Math.round(
    metrics.reduce((acc, m) => acc + m.score * weights[m.key], 0)
  );

  report.score = score;
  report.grade = gradeOf(score);
  report.metrics = metrics;

  // ── Aksi prioritas (≤5) ───────────────────────────────
  const actions: ActionItem[] = [];

  if (budget.totalBudget > 0 && budget.spent > budget.totalBudget) {
    actions.push({
      key: "budgetOver",
      severity: "high",
      titleKey: "actionBudgetOver",
      titleParams: {
        pct: String(
          Math.round((budget.spent / budget.totalBudget) * 100) - 100
        ),
      },
      href: "/categories",
    });
  }

  const deadlineGoal = goals.find((g) => {
    if (!g.deadline || g.currentAmount >= g.targetAmount) return false;
    const daysLeft = (g.deadline.getTime() - now.getTime()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 90;
  });
  if (deadlineGoal?.deadline) {
    const daysLeft = Math.max(
      0,
      Math.ceil((deadlineGoal.deadline.getTime() - now.getTime()) / 86400000)
    );
    actions.push({
      key: "goalDeadline",
      severity: "high",
      titleKey: "actionGoalDeadline",
      titleParams: {
        name: deadlineGoal.name,
        days: String(daysLeft),
        amount: money(
          Math.max(0, deadlineGoal.targetAmount - deadlineGoal.currentAmount)
        ),
      },
      href: "/goals",
    });
  }

  if (stats.income - stats.expense < 0) {
    actions.push({
      key: "deficit",
      severity: "high",
      titleKey: "actionDeficit",
      titleParams: {
        amount: money(Math.abs(stats.income - stats.expense)),
      },
      href: "/transactions",
    });
  }

  if (nw.netWorth < 0) {
    actions.push({
      key: "netWorthNegative",
      severity: "high",
      titleKey: "actionNetWorthNegative",
      titleParams: { amount: money(Math.abs(nw.netWorth)) },
      href: "/net-worth",
    });
  }

  if (
    avgExpense > 0 &&
    emergencyBase > 0 &&
    emergencyBase / avgExpense < 1
  ) {
    actions.push({
      key: "emergency",
      severity: "medium",
      titleKey: "actionEmergency",
      titleParams: {},
      href: "/accounts",
    });
  }

  if (upcoming.length > 0) {
    const first = upcoming[0];
    const catName = first.category?.name ?? first.description;
    actions.push({
      key: "recurringDue",
      severity: "medium",
      titleKey: "actionRecurringDue",
      titleParams: {
        name: catName,
        date: new Intl.DateTimeFormat(opts.locale, {
          timeZone: opts.timeZone,
          day: "2-digit",
          month: "short",
        }).format(first.nextRunDate),
      },
      href: "/recurring",
    });
  }

  if (
    budget.totalBudget === 0 &&
    actions.length < 5 &&
    stats.expense > 0
  ) {
    actions.push({
      key: "budgetNotSet",
      severity: "low",
      titleKey: "actionBudgetNotSet",
      titleParams: {},
      href: "/categories",
    });
  }

  return { report, actions: actions.slice(0, 5) };
}
