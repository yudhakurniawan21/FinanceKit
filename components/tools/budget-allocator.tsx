"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  allocTargets,
  allocTotals,
  suggestBudgets,
  type AllocCategory,
  type TierKey,
} from "@/lib/calculators/budget-allocator";
import {
  applySuggestedBudgetsAction,
  updateCategoryTierAction,
} from "@/app/actions/tools";
import { formatMoney, minorToMajor } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n/client";
import { Check, Info } from "lucide-react";
import type { BudgetTier } from "@/lib/generated/prisma/client";

const TIERS: Array<{ key: TierKey; label: string; color: string; pct: number }> =
  [
    { key: "NEEDS", label: "tierNeeds", color: "#38c8ff", pct: 50 },
    { key: "WANTS", label: "tierWants", color: "#ffd11a", pct: 30 },
    { key: "SAVINGS", label: "tierSavings", color: "#2ead4b", pct: 20 },
  ];

export function BudgetAllocator({
  currency,
  locale,
  categories,
  avgIncomeMinor,
}: {
  currency: string;
  locale: string;
  categories: AllocCategory[];
  avgIncomeMinor: number;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targets = useMemo(() => allocTargets(avgIncomeMinor), [avgIncomeMinor]);
  const totals = useMemo(() => allocTotals(categories), [categories]);
  const suggestions = useMemo(
    () => suggestBudgets(categories, avgIncomeMinor),
    [categories, avgIncomeMinor]
  );
  const suggestionsByCat = useMemo(
    () => new Map(suggestions.map((s) => [s.categoryId, s.suggestedMinor])),
    [suggestions]
  );

  const expenseCats = categories.filter((c) => !c.isIncome);

  const tierState = (
    key: TierKey
  ): { actual: number; target: number; gap: number } => {
    const map = {
      NEEDS: { actual: totals.needsMinor, target: targets.needsMinor },
      WANTS: { actual: totals.wantsMinor, target: targets.wantsMinor },
      SAVINGS: { actual: totals.savingsMinor, target: targets.savingsMinor },
    } as const;
    const { actual, target } = map[key];
    return { actual, target, gap: target - actual };
  };

  const onTierChange = async (cat: AllocCategory, value: string) => {
    setError(null);
    const res = await updateCategoryTierAction(cat.id, value as BudgetTier | "");
    if (res?.error) setError(res.error);
    router.refresh();
  };

  const onApply = async () => {
    if (suggestions.length === 0) return;
    setApplying(true);
    setError(null);
    try {
      const items = suggestions.map((s) => ({
        categoryId: s.categoryId,
        budgetMajor: minorToMajor(s.suggestedMinor, currency),
      }));
      const res = await applySuggestedBudgetsAction(items);
      if (res.error) {
        setError(res.error);
      } else {
        setApplied(true);
        setTimeout(() => setApplied(false), 4000);
      }
      router.refresh();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Ringkasan pemasukan */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("allocAvgIncome")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">
            {formatMoney(avgIncomeMinor, currency, locale)}
          </p>
        </CardContent>
      </Card>

      {/* Target vs aktual per tier */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("allocGapTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TIERS.map((tier) => {
            const s = tierState(tier.key);
            const incomePct =
              avgIncomeMinor > 0 ? (s.actual / avgIncomeMinor) * 100 : 0;
            return (
              <div key={tier.key}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: tier.color }}
                    />
                    {t(tier.label as "tierNeeds")} · {tier.pct}%
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {t("allocSpent")}:{" "}
                    <span className="font-medium text-foreground">
                      {formatMoney(s.actual, currency, locale)}
                    </span>{" "}
                    · {t("allocTargetLabel")}:{" "}
                    {formatMoney(s.target, currency, locale)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        "h-full rounded-full " +
                        (s.gap < 0
                          ? "bg-destructive"
                          : s.gap / Math.max(1, s.target) > 0.3
                            ? "bg-warning"
                            : "bg-positive")
                      }
                      style={{
                        width: `${Math.min(100, (s.actual / Math.max(1, s.target)) * 100)}%`,
                      }}
                    />
                  </div>
                  <span
                    className={
                      "shrink-0 text-xs font-medium tabular-nums " +
                      (s.gap < 0 ? "text-destructive" : "text-positive")
                    }
                  >
                    {s.gap < 0
                      ? t("allocOver", {
                          amount: formatMoney(-s.gap, currency, locale),
                        })
                      : s.gap > 0
                        ? t("allocUnder", {
                            amount: formatMoney(s.gap, currency, locale),
                          })
                        : "•"}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {incomePct.toFixed(1)}% {t("allocPctOfIncome")}
                </p>
              </div>
            );
          })}

          {totals.unclassifiedMinor > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {t("allocUnclassified")}:{" "}
                {formatMoney(totals.unclassifiedMinor, currency, locale)} —{" "}
                {t("allocUnclassifiedHint")}
              </span>
            </p>
          )}

          {avgIncomeMinor <= 0 && (
            <p className="text-xs text-muted-foreground">
              {t("allocNote")} — {t("healthInsufficientDesc")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Daftar kategori */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{t("allocCategory")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {expenseCats.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("allocNoCategories")}
            </p>
          ) : (
            expenseCats.map((cat) => {
              const suggested = suggestionsByCat.get(cat.id);
              const over =
                suggested != null && cat.spendMinor > suggested
                  ? cat.spendMinor - suggested
                  : 0;
              return (
                <div
                  key={cat.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-muted/40"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          cat.tier === "NEEDS"
                            ? "#38c8ff"
                            : cat.tier === "WANTS"
                              ? "#ffd11a"
                              : cat.isSavings
                                ? "#2ead4b"
                                : "var(--muted-foreground)",
                      }}
                    />
                    <span className="min-w-0 truncate text-sm font-medium">
                      {cat.name}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      {formatMoney(cat.spendMinor, currency, locale)}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {over > 0 && (
                      <span className="text-xs font-medium text-destructive tabular-nums">
                        +{formatMoney(over, currency, locale)}
                      </span>
                    )}
                    {suggested != null && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {t("allocSuggested")}:{" "}
                        <span className="font-medium text-foreground">
                          {formatMoney(suggested, currency, locale)}
                        </span>
                      </span>
                    )}
                    <Select
                      value={cat.isSavings ? "SAVINGS" : (cat.tier ?? "")}
                      onValueChange={(v: string | null) =>
                        onTierChange(cat, v ?? "")
                      }
                      disabled={cat.isSavings}
                    >
                      <SelectTrigger size="sm" className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="" label={t("tierNone")}>
                          {t("tierNone")}
                        </SelectItem>
                        <SelectItem value="NEEDS" label={t("tierNeeds")}>
                          {t("tierNeeds")}
                        </SelectItem>
                        <SelectItem value="WANTS" label={t("tierWants")}>
                          {t("tierWants")}
                        </SelectItem>
                        <SelectItem value="SAVINGS" label={t("tierSavings")}>
                          {t("tierSavings")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={applying || suggestions.length === 0}
          onClick={onApply}
        >
          {applied && <Check className="mr-1.5 h-4 w-4" />}
          {applied ? t("allocApplied") : t("allocApply")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("allocNote")}</p>
      </div>
    </div>
  );
}