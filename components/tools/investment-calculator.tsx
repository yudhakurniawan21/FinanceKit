"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
import { Field } from "@/components/ui/field";
import { useMoneyMask } from "@/components/ui/money-input";
import {
  simulateCompound,
  COMMON_INSTRUMENTS,
  type CompoundYearPoint,
} from "@/lib/calculators/compound-interest";
import { getCurrencyMeta } from "@/lib/currencies";
import { langCode } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n/client";

export function InvestmentCalculator({
  currency,
  locale,
  precision,
}: {
  currency: string;
  locale: string;
  precision: number;
}) {
  const { t } = useI18n();
  const lc = langCode(locale);
  const meta = getCurrencyMeta(currency);

  const [presetKey, setPresetKey] = useState<string>("");
  const [years, setYears] = useState("10");
  const [rate, setRate] = useState("8");
  const [inflation, setInflation] = useState("3");

  const principal = useMoneyMask({ defaultValue: "0", currency });
  const monthly = useMoneyMask({ defaultValue: "1000000", currency });

  const initial: string | number = principal.raw || "0";
  const contrib: string | number = monthly.raw || "0";

  const result = useMemo(
    () =>
      simulateCompound({
        principal: Number(initial),
        monthlyContribution: Number(contrib),
        annualRatePct: Number(rate) || 0,
        years: Number(years) || 1,
        inflationPct: Number(inflation) || 0,
        precision,
      }),
    [initial, contrib, rate, years, inflation, precision]
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

  const chartData: CompoundYearPoint[] = result.series;

  const applyPreset = (r: number) => {
    setRate(String(r));
  };

  const activePreset = (() => {
    const cur = Number(rate);
    const found = COMMON_INSTRUMENTS.find(
      (p) => Math.abs(p.annualRatePct - cur) < 0.001
    );
    return found?.key ?? "";
  })();

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle className="text-sm">{t("toolInvestment")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <Label htmlFor="inv-principal">{t("invPrincipal")}</Label>
              <div className="mt-1.5">
                <MoneyLikeInput {...principal.inputProps} id="inv-principal" symbol={meta.symbol} />
              </div>
            </div>
            <div>
              <Label htmlFor="inv-monthly">{t("invMonthly")}</Label>
              <div className="mt-1.5">
                <MoneyLikeInput {...monthly.inputProps} id="inv-monthly" symbol={meta.symbol} />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <Field label={t("invYears")} htmlFor="inv-years">
              <Input
                id="inv-years"
                type="number"
                min={1}
                max={50}
                value={years}
                onChange={(e) => setYears(e.target.value)}
              />
            </Field>
            <Field label={t("invReturn")} htmlFor="inv-rate">
              <Input
                id="inv-rate"
                type="number"
                min={0}
                step={0.1}
                inputMode="decimal"
                value={rate}
                onChange={(e) => {
                  setRate(e.target.value);
                  setPresetKey("");
                }}
              />
            </Field>
          </div>

          <Field label={t("invInflation")} htmlFor="inv-inflation">
            <Input
              id="inv-inflation"
              type="number"
              min={0}
              step={0.1}
              inputMode="decimal"
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
            />
          </Field>

          <div className="space-y-1.5">
            <Label>{t("invPreset")}</Label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_INSTRUMENTS.map((p) => {
                const isActive = presetKey === p.key || activePreset === p.key;
                return (
                  <button
                    key={p.key}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => {
                      setPresetKey(p.key);
                      applyPreset(p.annualRatePct);
                    }}
                    className={
                      "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors " +
                      (isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground")
                    }
                  >
                    {p.label} · {p.annualRatePct}%
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>{t("invChartTitle")}</CardTitle>
          <CardDescription>{t("invChartDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? null : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="investFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="year"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v: number) => `T${v}`}
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
                    const p = payload[0].payload as CompoundYearPoint;
                    return (
                      <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                        <p className="font-medium">
                          {t("invYearAxis")} {p.year}
                        </p>
                        <p className="mt-1 text-positive">
                          {t("invTotalInterest")}: {fmt(p.interest)}
                        </p>
                        <p>{t("invTotalContrib")}: {fmt(p.contributions)}</p>
                        <p className="font-medium">{t("invFinalValue")}: {fmt(p.total)}</p>
                        <p className="text-muted-foreground">
                          {t("invRealValue")}: {fmt(p.realValue)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="interest"
                  stackId="growth"
                  stroke="var(--positive)"
                  strokeWidth={2}
                  fill="url(#investFill)"
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="contributions"
                  stackId="growth"
                  stroke="var(--chart-2)"
                  strokeWidth={1.5}
                  fill="var(--chart-2)"
                  fillOpacity={0.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="realValue"
                  stroke="var(--warning)"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label={t("invFinalValue")} value={fmt(result.finalValue)} />
            <Stat
              label={t("invRealValue")}
              value={fmt(result.finalRealValue)}
            />
            <Stat
              label={t("invTotalContrib")}
              value={fmt(result.totalContributions)}
            />
            <Stat
              label={t("invTotalInterest")}
              value={fmt(result.totalInterest)}
            />
          </div>

          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <span>
              {t("invPurchasingPower")}:{" "}
              <span className="font-medium">
                {result.purchasingPowerPct.toFixed(1)}%
              </span>
            </span>
          </p>

          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
            {t("invDisclaimer")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyLikeInput({
  symbol,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { symbol: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        {symbol}
      </span>
      <Input {...props} type="text" inputMode="decimal" className={"pl-10 " + (className ?? "")} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold tabular-nums">
        {value}
      </p>
    </div>
  );
}