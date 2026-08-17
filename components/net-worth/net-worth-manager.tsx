"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Trash2,
  Pencil,
  Scale,
  Pipette,
  Banknote,
  Landmark,
  Wallet,
  CreditCard,
  PiggyBank,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Field } from "@/components/ui/field";
import { AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoneyInput } from "@/components/ui/money-input";
import {
  createNetWorthItemAction,
  updateNetWorthItemAction,
  deleteNetWorthItemAction,
} from "@/app/actions/net-worth";
import { formatMoney, minorToMajor } from "@/lib/currencies";
import { formatDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/client";
import type {
  NetWorthItem,
  NetWorthType,
  WalletType,
} from "@/lib/generated/prisma/client";
import type { NetWorthSummary, SnapshotPoint } from "@/lib/db/net-worth";
import type { WalletWithBalance } from "@/lib/db/wallets";

const COLOR_OPTIONS = [
  "#9fe870",
  "#2ead4b",
  "#38c8ff",
  "#ffd11a",
  "#d03238",
  "#f97316",
  "#6366f1",
  "#454745",
];

const TYPE_ICONS: Record<WalletType, React.ComponentType<{ className?: string }>> = {
  CASH: Banknote,
  BANK: Landmark,
  E_WALLET: Wallet,
  CARD: CreditCard,
};

type ItemDialogState =
  | { mode: "create"; type: NetWorthType }
  | { mode: "edit"; item: NetWorthItem };

export function NetWorthManager({
  summary,
  snapshots,
  wallets,
  currency,
  dateFormat,
  timeZone,
  locale,
}: {
  summary: NetWorthSummary;
  snapshots: SnapshotPoint[];
  wallets: WalletWithBalance[];
  currency: string;
  dateFormat: string;
  timeZone: string;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [dialog, setDialog] = useState<ItemDialogState | null>(null);
  const [deleteItem, setDeleteItem] = useState<NetWorthItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await deleteNetWorthItemAction(deleteItem.id);
      setDeleteItem(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const negative = summary.netWorth < 0;

  return (
    <div className="space-y-6">
      {/* Ringkasan */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="min-w-0">
          <CardContent className="p-4">
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Scale className="h-4 w-4 shrink-0" />
              {t("statNetWorth")}
            </p>
            <p
              className={
                "mt-1 text-2xl font-semibold tabular-nums wrap-anywhere " +
                (negative ? "text-destructive" : "")
              }
            >
              {formatMoney(summary.netWorth, currency, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">
              {t("netWorthComposition", {
                assets: formatMoney(summary.totalAssets, currency, locale),
                liabilities: formatMoney(
                  summary.totalLiabilities,
                  currency,
                  locale
                ),
              })}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t("totalAssets")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-positive wrap-anywhere">
              {formatMoney(summary.totalAssets, currency, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground wrap-anywhere">
              {t("liquidAssetsLabel")}:{" "}
              {formatMoney(summary.totalLiquid, currency, locale)}
            </p>
          </CardContent>
        </Card>
        <Card className="min-w-0">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              {t("totalLiabilities")}
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-destructive wrap-anywhere">
              {formatMoney(summary.totalLiabilities, currency, locale)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary.liabilities.length}{" "}
              {t("liabilitiesLabel").toLowerCase()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Grafik tren */}
      <Card>
        <CardHeader>
          <CardTitle>{t("netWorthTrendTitle")}</CardTitle>
          <CardDescription>{t("netWorthTrendDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          {snapshots.length < 2 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("netWorthTrendEmpty")}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart
                  data={snapshots.map((s) => ({
                    label: formatDate(s.date, dateFormat, timeZone, locale),
                    netWorth: s.netWorth,
                    assets: s.totalAssets,
                    liabilities: s.totalLiabilities,
                  }))}
                  margin={{ top: 8, right: 8, left: 8, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="nwFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    tickFormatter={(v: number) =>
                      formatMoney(v, currency, locale)
                    }
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as {
                        label: string;
                        netWorth: number;
                        assets: number;
                        liabilities: number;
                      };
                      return (
                        <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-md">
                          <p className="font-medium">{p.label}</p>
                          <p className="mt-1">
                            {t("statNetWorth")}:{" "}
                            {formatMoney(p.netWorth, currency, locale)}
                          </p>
                          <p className="text-positive">
                            {t("totalAssets")}:{" "}
                            {formatMoney(p.assets, currency, locale)}
                          </p>
                          <p className="text-destructive">
                            {t("totalLiabilities")}:{" "}
                            {formatMoney(p.liabilities, currency, locale)}
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="netWorth"
                    stroke="var(--positive)"
                    strokeWidth={2.5}
                    fill="url(#nwFill)"
                    dot={{ r: 2, fill: "var(--positive)" }}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="assets"
                    stroke="var(--chart-2)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="liabilities"
                    stroke="var(--chart-5)"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Aset */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">
              {t("assetsLabel")} ({wallets.length + summary.assets.length})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setDialog({ mode: "create", type: "ASSET" })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addAsset")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {wallets.map((w) => {
            const Icon = TYPE_ICONS[w.type as WalletType] ?? Wallet;
            return (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `${w.color ?? "#454745"}22`,
                      color: w.color ?? "var(--foreground)",
                    }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 truncate text-sm font-medium">
                    {w.name}
                  </span>
                  <Badge
                    variant="secondary"
                    className="shrink-0 px-1.5 py-0 text-[10px]"
                  >
                    {t("autoBadge")}
                  </Badge>
                </div>
                <span className="shrink-0 text-sm font-medium tabular-nums">
                  {formatMoney(w.balance, currency, locale)}
                </span>
              </div>
            );
          })}
          {summary.assets.map((item) => (
            <NetWorthItemRow
              key={item.id}
              item={item}
              currency={currency}
              onEdit={() => setDialog({ mode: "edit", item })}
              onDelete={() => setDeleteItem(item)}
            />
          ))}
          {wallets.length + summary.assets.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noNetWorthItems")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tabungan (Tujuan) */}
      {summary.goals.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm">
                {t("savingsGoalsLabel")} ({summary.goals.length})
              </CardTitle>
              <Link
                href="/goals"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                <PiggyBank className="mr-1.5 h-4 w-4" />
                {t("manageGoals")}
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.goals.map((g) => {
              const pct =
                g.targetAmount > 0
                  ? Math.min(100, (g.currentAmount / g.targetAmount) * 100)
                  : 0;
              return (
                <div key={g.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `${g.color ?? "#454745"}22`,
                          color: g.color ?? "var(--foreground)",
                        }}
                      >
                        <PiggyBank className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 truncate text-sm font-medium">
                        {g.name}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="text-sm font-medium tabular-nums">
                        {formatMoney(g.currentAmount, currency, locale)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {t("goalProgress", {
                          current: formatMoney(g.currentAmount, currency, locale),
                          target: formatMoney(g.targetAmount, currency, locale),
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: g.color ?? "var(--positive)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-muted-foreground">
                {t("savingsTotalLabel")}
              </span>
              <span className="font-medium tabular-nums">
                {formatMoney(summary.totalGoals, currency, locale)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kewajiban */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm">
              {t("liabilitiesLabel")} ({summary.liabilities.length})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setDialog({ mode: "create", type: "LIABILITY" })}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              {t("addLiability")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {summary.liabilities.map((item) => (
            <NetWorthItemRow
              key={item.id}
              item={item}
              currency={currency}
              onEdit={() => setDialog({ mode: "edit", item })}
              onDelete={() => setDeleteItem(item)}
            />
          ))}
          {summary.liabilities.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noNetWorthItems")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Dialog tambah/edit */}
      {dialog && (
        <ItemDialog
          key={
            dialog.mode === "edit"
              ? dialog.item.id
              : `create-${dialog.type}`
          }
          state={dialog}
          onClose={() => setDialog(null)}
          currency={currency}
        />
      )}

      {/* Konfirmasi hapus */}
      <AlertDialog
        open={!!deleteItem}
        onOpenChange={(o) => !o && setDeleteItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteNetWorthItemTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteItem
                ? t("deleteNetWorthItemDesc", { name: deleteItem.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteItem(null)}
            >
              {t("cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? t("deleting") : t("yesDelete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function NetWorthItemRow({
  item,
  currency,
  onEdit,
  onDelete,
}: {
  item: NetWorthItem;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { t, locale } = useI18n();
  const isLiability = item.type === "LIABILITY";
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{
            backgroundColor: item.color ?? "var(--muted-foreground)",
          }}
        />
        <span className="min-w-0 truncate text-sm font-medium">
          {item.name}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span
          className={
            "text-sm font-medium tabular-nums " +
            (isLiability ? "text-destructive" : "")
          }
        >
          {formatMoney(item.value, currency, locale)}
        </span>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4" />
          <span className="sr-only">{t("edit")}</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">{t("delete")}</span>
        </Button>
      </div>
    </div>
  );
}

function ItemDialog({
  state,
  onClose,
  currency,
}: {
  state: ItemDialogState;
  onClose: () => void;
  currency: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const item = state.mode === "edit" ? state.item : null;
  const type = state.mode === "edit" ? state.item.type : state.type;
  const action =
    state.mode === "edit" ? updateNetWorthItemAction : createNetWorthItemAction;
  const [formState, boundAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (!formState?.success) return;
    const to = setTimeout(() => {
      onClose();
      router.refresh();
    }, 0);
    return () => clearTimeout(to);
  }, [formState, onClose, router]);

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent>
        <form action={boundAction}>
          {item && <input type="hidden" name="id" value={item.id} />}
          <input type="hidden" name="type" value={type} />
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {state.mode === "edit"
                ? t("editNetWorthItemTitle", {
                    type: t(type === "ASSET" ? "nwAsset" : "nwLiability"),
                  })
                : t("addNetWorthItemTitle", {
                    type: t(type === "ASSET" ? "nwAsset" : "nwLiability"),
                  })}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {state.mode === "edit"
                ? t("editNetWorthItemDesc")
                : t("addNetWorthItemDesc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-4 py-4">
            <Field label={t("netWorthItemNameLabel")} htmlFor="nw-name">
              <Input
                id="nw-name"
                name="name"
                defaultValue={item?.name}
                placeholder={t("netWorthItemNamePlaceholder")}
                required
                disabled={isPending}
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput
                name="value"
                label={t("netWorthItemValueLabel")}
                defaultValue={
                  item ? minorToMajor(item.value, currency) : undefined
                }
                currency={currency}
                placeholder={t("netWorthItemValuePlaceholder")}
                required
                disabled={isPending}
              />

              <ColorField defaultValue={item?.color ?? COLOR_OPTIONS[0]} />
            </div>

            {formState?.error && (
              <p className="text-sm text-destructive">{formState.error}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("save")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

function ColorField({ defaultValue = COLOR_OPTIONS[0] }: { defaultValue?: string }) {
  const { t } = useI18n();
  const [color, setColor] = useState(defaultValue);
  const isPreset = COLOR_OPTIONS.includes(color);

  return (
    <div className="space-y-1.5">
      <Label>{t("colorLabel")}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {COLOR_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            aria-label={c}
            title={c}
            className={
              "h-7 w-7 rounded-full transition-transform " +
              (color === c
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                : "hover:scale-110")
            }
            style={{ backgroundColor: c }}
          />
        ))}
        <button
          type="button"
          aria-label={t("customColor")}
          title={t("customColor")}
          className={
            "relative flex h-7 w-7 items-center justify-center overflow-hidden rounded-full ring-1 ring-border transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-primary " +
            (!isPreset
              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
              : "")
          }
          style={{ backgroundColor: color }}
        >
          <Pipette className="pointer-events-none h-3.5 w-3.5 text-white mix-blend-exclusion" />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </button>
      </div>
      <input type="hidden" name="color" value={color} />
    </div>
  );
}