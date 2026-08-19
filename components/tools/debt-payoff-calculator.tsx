"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useMoneyMask } from "@/components/ui/money-input";
import {
  comparePayoffStrategies,
  monthsToParts,
  type DebtInput,
  type PayoffStrategy,
  type PayoffResult,
} from "@/lib/calculators/debt-payoff";
import { getCurrencyMeta } from "@/lib/currencies";
import { langCode } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";
import { Plus, Trash2, CreditCard, Check } from "lucide-react";

let idCounter = 0;
const nextId = () => `debt-${Date.now()}-${idCounter++}`;

const STRATEGIES: Array<{
  key: PayoffStrategy;
  labelKey: "strategyMinimum" | "strategySnowball" | "strategyAvalanche";
  descKey:
    | "strategyMinimumDesc"
    | "strategySnowballDesc"
    | "strategyAvalancheDesc";
}> = [
  { key: "minimum", labelKey: "strategyMinimum", descKey: "strategyMinimumDesc" },
  { key: "snowball", labelKey: "strategySnowball", descKey: "strategySnowballDesc" },
  { key: "avalanche", labelKey: "strategyAvalanche", descKey: "strategyAvalancheDesc" },
];

export function DebtPayoffCalculator({
  currency,
  locale,
  precision,
  initialDebts,
}: {
  currency: string;
  locale: string;
  precision: number;
  initialDebts: DebtInput[];
}) {
  const { t } = useI18n();
  const lc = langCode(locale);
  const meta = getCurrencyMeta(currency);

  const [debts, setDebts] = useState<DebtInput[]>(() =>
    initialDebts.map((d) => ({
      ...d,
      id: nextId(),
      balance: Number(d.balance || 0),
    }))
  );
  const [strategy, setStrategy] = useState<PayoffStrategy>("avalanche");
  const extra = useMoneyMask({ defaultValue: "0", currency });

  const comparison = useMemo(
    () => comparePayoffStrategies(debts, Number(extra.raw || 0), precision),
    [debts, extra.raw, precision]
  );

  const fmt = (v: number) =>
    new Intl.NumberFormat(meta.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: meta.minorUnit,
      minimumFractionDigits: meta.minorUnit,
    }).format(v);

  const fmtAxis = (v: number) =>
    new Intl.NumberFormat(lc, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(v);

  const formatDuration = (months: number) => {
    if (months <= 0) return "—";
    const { years, months: m } = monthsToParts(months);
    if (years > 0 && m > 0) return t("debtYearsMonths", { years, months: m });
    if (years > 0) return t("debtYearsOnly", { years });
    return t("debtMonthsOnly", { months: m });
  };

  const addDebt = () => {
    setDebts((prev) => [
      ...prev,
      {
        id: nextId(),
        name: "",
        balance: 0,
        annualRatePct: 0,
        minPayment: 0,
      },
    ]);
  };

  const addFromLiabilities = () => {
    const existingIds = new Set(debts.map((d) => d.id));
    const fresh = initialDebts.filter((d) => !existingIds.has(d.id));
    if (fresh.length === 0) return;
    setDebts((prev) => [
      ...prev,
      ...fresh.map((d) => ({ ...d, id: nextId(), balance: Number(d.balance || 0) })),
    ]);
  };

  const updateDebt = (
    id: string,
    patch: Partial<Omit<DebtInput, "id">>
  ) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patch } : d))
    );
  };

  const removeDebt = (id: string) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const chartMax = useMemo(() => {
    const paidMonths = Object.values(comparison)
      .filter((r): r is PayoffResult => r?.paidOff === true)
      .map((r) => r.months);
    if (paidMonths.length === 0) return 0;
    return Math.max(...paidMonths);
  }, [comparison]);

  const chartData = useMemo(() => {
    if (chartMax <= 0) return [];
    const data: Array<{
      month: number;
      min: number | null;
      snow: number | null;
      ava: number | null;
    }> = [];
    for (let m = 1; m <= Math.min(chartMax, 240); m++) {
      data.push({
        month: m,
        min: comparison.minimum?.schedule[m - 1]?.totalRemaining ?? null,
        snow: comparison.snowball?.schedule[m - 1]?.totalRemaining ?? null,
        ava: comparison.avalanche?.schedule[m - 1]?.totalRemaining ?? null,
      });
    }
    return data;
  }, [comparison, chartMax]);

  const selected = comparison[strategy];
  const baseline = comparison.minimum;

  const renderResultCard = (key: PayoffStrategy, result: PayoffResult | null) => {
    const isSelected = strategy === key;
    const interestSaved =
      baseline && result?.paidOff
        ? Math.max(0, (baseline.totalInterest ?? 0) - result.totalInterest)
        : 0;
    const monthsFaster =
      baseline && result?.paidOff && baseline.paidOff
        ? Math.max(0, baseline.months - result.months)
        : 0;

    return (
      <button
        key={key}
        type="button"
        onClick={() => setStrategy(key)}
        aria-pressed={isSelected}
        className={
          "relative rounded-xl border p-3 text-left transition-colors " +
          (isSelected
            ? "border-primary bg-primary/5"
            : "border-border bg-card hover:border-primary/40")
        }
      >
        {isSelected && (
          <span className="absolute right-2 top-2 text-primary">
            <Check className="h-4 w-4" />
          </span>
        )}
        <p className="text-sm font-semibold">
          {t(
            STRATEGIES.find((s) => s.key === key)?.labelKey ?? "strategyMinimum"
          )}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t(STRATEGIES.find((s) => s.key === key)?.descKey ?? "strategyMinimumDesc")}
        </p>
        <div className="mt-3 space-y-1.5 text-xs">
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("debtFreeIn")}</span>
            <span className="font-semibold tabular-nums">
              {result?.paidOff ? formatDuration(result.months) : "—"}
            </span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("debtTotalInterest")}</span>
            <span className="font-semibold tabular-nums">
              {fmt(result?.totalInterest ?? 0)}
            </span>
          </p>
          <p className="flex justify-between gap-2">
            <span className="text-muted-foreground">{t("debtTotalPaid")}</span>
            <span className="font-semibold tabular-nums">
              {fmt(result?.totalPaid ?? 0)}
            </span>
          </p>
          {key !== "minimum" && (
            <>
              <p className="flex justify-between gap-2">
                <span className="text-muted-foreground">{t("debtSavings")}</span>
                <span className="font-semibold tabular-nums text-positive">
                  {fmt(interestSaved)}
                </span>
              </p>
              {monthsFaster > 0 && (
                <p className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{t("debtFaster")}</span>
                  <span className="font-semibold tabular-nums text-positive">
                    {monthsFaster}
                  </span>
                </p>
              )}
            </>
          )}
          {result && !result.paidOff && (
            <p className="mt-1 text-[11px] leading-snug text-destructive">
              {t("debtNeverPaid")}
            </p>
          )}
        </div>
      </button>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm">{t("toolDebt")}</CardTitle>
          <CardDescription className="text-xs">
            {t("debtExtraHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {debts.length === 0 && (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
              {t("debtEmpty")}
            </p>
          )}

          {debts.map((d) => (
            <div
              key={d.id}
              className="space-y-2.5 rounded-xl border border-border bg-muted/30 p-3"
            >
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 shrink-0 text-muted-foreground" />
                <Input
                  className="h-7 flex-1"
                  placeholder={t("debtNamePlaceholder")}
                  value={d.name}
                  onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-destructive"
                  aria-label={t("debtRemove")}
                  onClick={() => removeDebt(d.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label htmlFor={`balance-${d.id}`} className="text-xs">
                    {t("debtBalance")}
                  </Label>
                  <RawMoneyInput
                    id={`balance-${d.id}`}
                    currency={currency}
                    defaultValue={d.balance}
                    symbol={meta.symbol}
                    onChangeRaw={(raw) =>
                      updateDebt(d.id, { balance: Number(raw || 0) })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor={`rate-${d.id}`} className="text-xs">
                    {t("debtRate")}
                  </Label>
                  <Input
                    id={`rate-${d.id}`}
                    className="h-7"
                    type="number"
                    min={0}
                    step={0.1}
                    inputMode="decimal"
                    value={d.annualRatePct || ""}
                    placeholder="0"
                    onChange={(e) =>
                      updateDebt(d.id, { annualRatePct: Number(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`minpay-${d.id}`} className="text-xs">
                  {t("debtMinPay")}
                </Label>
                <RawMoneyInput
                  id={`minpay-${d.id}`}
                  currency={currency}
                  defaultValue={d.minPayment}
                  symbol={meta.symbol}
                  onChangeRaw={(raw) =>
                    updateDebt(d.id, { minPayment: Number(raw || 0) })
                  }
                />
              </div>
            </div>
          ))}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={addDebt}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("debtAdd")}
            </Button>
            {initialDebts.length > 0 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addFromLiabilities}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t("debtFromLiabilities")}
              </Button>
            )}
          </div>

          <div>
            <Label htmlFor="debt-extra">{t("debtExtra")}</Label>
            <div className="mt-1.5">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {meta.symbol}
                </span>
                <Input
                  {...extra.inputProps}
                  id="debt-extra"
                  className="pl-10"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{t("debtComparisonTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-3">
              {STRATEGIES.map((s) => renderResultCard(s.key, comparison[s.key]))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("debtChartTitle")}</CardTitle>
            <CardDescription>{t("debtChartDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("debtEmpty")}
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    label={{
                      value: t("debtMonthAxis"),
                      position: "insideBottom",
                      offset: -2,
                      fontSize: 11,
                      fill: "var(--muted-foreground)",
                    }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    width={70}
                    tickFormatter={fmtAxis}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as {
                        month: number;
                        min: number | null;
                        snow: number | null;
                        ava: number | null;
                      };
                      return (
                        <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">
                            {t("debtMonthAxis")} {p.month}
                          </p>
                          <p>{t("strategyMinimum")}: {fmt(p.min ?? 0)}</p>
                          <p>{t("strategySnowball")}: {fmt(p.snow ?? 0)}</p>
                          <p>{t("strategyAvalanche")}: {fmt(p.ava ?? 0)}</p>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="min"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="snow"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="ava"
                    stroke="var(--positive)"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {selected?.payoffOrder.length ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t("debtPayoffOrder")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-1">
                {selected.payoffOrder.map((id, i) => {
                  const d = debts.find((x) => x.id === id);
                  return (
                    <li key={id} className="flex items-center gap-2 text-sm">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="truncate">
                        {d?.name || t("noDescription")}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function RawMoneyInput({
  id,
  symbol,
  defaultValue,
  currency,
  onChangeRaw,
}: {
  id?: string;
  symbol: string;
  currency: string;
  defaultValue?: number | string;
  onChangeRaw: (raw: string) => void;
}) {
  const { inputProps } = useMoneyMask({ defaultValue, currency, onChangeRaw });
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
        {symbol}
      </span>
      <Input
        {...inputProps}
        id={id}
        type="text"
        inputMode="decimal"
        className="h-7 pl-8"
      />
    </div>
  );
}