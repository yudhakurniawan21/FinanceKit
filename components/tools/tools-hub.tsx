"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TrendingUp, CreditCard, PieChart } from "lucide-react";
import { useI18n } from "@/lib/i18n/client";
import { InvestmentCalculator } from "./investment-calculator";
import { DebtPayoffCalculator } from "./debt-payoff-calculator";
import { BudgetAllocator } from "./budget-allocator";
import type { AllocCategory } from "@/lib/calculators/budget-allocator";
import type { DebtInput } from "@/lib/calculators/debt-payoff";

type ToolKey = "investment" | "debt" | "budget";

const TOOL_QUERY: Record<ToolKey, string> = {
  investment: "investment",
  debt: "debt",
  budget: "budget",
};

export function ToolsHub({
  currency,
  locale,
  precision,
  categories,
  avgIncomeMinor,
  liabilities,
}: {
  currency: string;
  locale: string;
  precision: number;
  categories: AllocCategory[];
  avgIncomeMinor: number;
  liabilities: Array<{
    id: string;
    name: string;
    value: number;
    annualRatePct: number;
    minPayment: number;
  }>;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useI18n();

  const active = useMemo<ToolKey>(() => {
    const raw = searchParams.get("tool");
    return raw === "debt"
      ? "debt"
      : raw === "budget"
        ? "budget"
        : "investment";
  }, [searchParams]);

  const select = (key: ToolKey) => {
    router.replace(`/tools?tool=${TOOL_QUERY[key]}`, { scroll: false });
  };

  const tabs: Array<{
    key: ToolKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    { key: "investment", label: t("toolInvestment"), icon: TrendingUp },
    { key: "debt", label: t("toolDebt"), icon: CreditCard },
    { key: "budget", label: t("toolBudget"), icon: PieChart },
  ];

  const desc: Record<ToolKey, string> = {
    investment: t("toolInvestmentDesc"),
    debt: t("toolDebtDesc"),
    budget: t("toolBudgetDesc"),
  };

  const initialDebts: DebtInput[] = liabilities.map((l) => ({
    id: l.id,
    name: l.name,
    balance: l.value,
    annualRatePct: l.annualRatePct,
    minPayment: l.minPayment,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const isActive = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => select(tab.key)}
              aria-pressed={isActive}
              className={
                "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors " +
                (isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground")
              }
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <p className="text-sm text-muted-foreground">{desc[active]}</p>

      {active === "investment" && (
        <InvestmentCalculator
          currency={currency}
          locale={locale}
          precision={precision}
        />
      )}
      {active === "debt" && (
        <DebtPayoffCalculator
          currency={currency}
          locale={locale}
          precision={precision}
          initialDebts={initialDebts}
        />
      )}
      {active === "budget" && (
        <BudgetAllocator
          currency={currency}
          locale={locale}
          categories={categories}
          avgIncomeMinor={avgIncomeMinor}
        />
      )}
    </div>
  );
}
