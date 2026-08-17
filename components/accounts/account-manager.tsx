"use client";

import { useEffect, useMemo, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, ArrowLeftRight, Banknote, Landmark, Wallet, CreditCard } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DatePicker } from "@/components/ui/date-picker";
import { MoneyInput } from "@/components/ui/money-input";
import {
  createWalletAction,
  updateWalletAction,
  deleteWalletAction,
  createTransferAction,
  deleteTransferAction,
} from "@/app/actions/wallets";
import { formatMoney } from "@/lib/currencies";
import { formatDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { WalletWithBalance } from "@/lib/db/wallets";

const WALLET_TYPES = ["CASH", "BANK", "E_WALLET", "CARD"] as const;
type WalletType = (typeof WALLET_TYPES)[number];

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

export function AccountManager({
  wallets,
  transfers,
  currency,
  dateFormat,
  timeZone,
  locale,
}: {
  wallets: WalletWithBalance[];
  transfers: Array<{
    id: string;
    amount: number;
    date: Date;
    description: string | null;
    from: { id: string; name: string };
    to: { id: string; name: string };
  }>;
  currency: string;
  dateFormat: string;
  timeZone: string;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editWallet, setEditWallet] = useState<WalletWithBalance | null>(null);
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteWallet, setDeleteWallet] = useState<WalletWithBalance | null>(null);
  const [deleting, setDeleting] = useState(false);

  const total = useMemo(
    () => wallets.reduce((sum, w) => sum + w.balance, 0),
    [wallets]
  );

  async function handleDelete() {
    if (!deleteWallet) return;
    setDeleting(true);
    try {
      await deleteWalletAction(deleteWallet.id);
      setDeleteWallet(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t("totalBalance")}</p>
          <p className="text-2xl font-semibold tabular-nums">
            {formatMoney(total, currency, locale)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            {t("transfer")}
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t("addAccount")}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => {
          const Icon = TYPE_ICONS[w.type as WalletType] ?? Wallet;
          const positive = w.balance >= 0;
          return (
            <Card key={w.id} className="transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-lg"
                      style={{ backgroundColor: `${w.color ?? "#454745"}22`, color: w.color ?? "var(--foreground)" }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="font-medium leading-tight">{w.name}</p>
                      <Badge variant="secondary" className="mt-0.5 text-xs">
                        {t(typeLabelKey(w.type))}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setEditWallet(w)}>
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">{t("edit")}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setDeleteWallet(w)}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">{t("delete")}</span>
                    </Button>
                  </div>
                </div>
                <p
                  className={
                    "mt-3 text-right text-xl font-semibold tabular-nums " +
                    (positive ? "" : "text-destructive")
                  }
                >
                  {formatMoney(w.balance, currency, locale)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <h2 className="mb-2 text-sm font-semibold">{t("transferHistory")}</h2>
          {transfers.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noTransfers")}</p>
          ) : (
            <ul className="divide-y divide-border">
                {transfers.map((tr) => (
                  <li key={tr.id} className="py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 truncate text-sm">
                          {tr.from.name} → {tr.to.name}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-sm font-medium tabular-nums">
                          {formatMoney(tr.amount, currency, locale)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={async () => {
                            await deleteTransferAction(tr.id);
                            router.refresh();
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{t("delete")}</span>
                        </Button>
                      </div>
                    </div>
                    {tr.description && (
                      <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                        {tr.description}
                      </p>
                    )}
                    <p className="mt-0.5 pl-6 text-xs text-muted-foreground">
                      {formatDate(tr.date, dateFormat, timeZone, locale)}
                    </p>
                  </li>
                ))}
              </ul>
          )}
        </CardContent>
      </Card>

      <WalletDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        currency={currency}
      />

      {editWallet && (
        <WalletDialog
          key={editWallet.id}
          open
          onOpenChange={() => setEditWallet(null)}
          mode="edit"
          wallet={editWallet}
          currency={currency}
        />
      )}

      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
        currency={currency}
        locale={locale}
      />

      <AlertDialog
        open={!!deleteWallet}
        onOpenChange={(o) => !o && setDeleteWallet(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteAccountTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteWallet
                ? t("deleteAccountDesc", { name: deleteWallet.name })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteWallet(null)}
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

function typeLabelKey(type: string): DictKey {
  const map: Record<string, DictKey> = {
    CASH: "methodCash",
    BANK: "methodBank",
    E_WALLET: "methodEwallet",
    CARD: "methodCard",
  };
  return map[type] ?? "methodCash";
}

function WalletDialog({
  open,
  onOpenChange,
  mode,
  wallet,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  wallet?: WalletWithBalance | null;
  currency: string;
}) {
  const { t, locale } = useI18n();
  const [type, setType] = useState<WalletType>(
    (wallet?.type as WalletType) ?? "CASH"
  );
  const [color, setColor] = useState(wallet?.color ?? COLOR_OPTIONS[0]);

  useEffect(() => {
    if (!open) return;
    const to = setTimeout(() => {
      setType((wallet?.type as WalletType) ?? "CASH");
      setColor(wallet?.color ?? COLOR_OPTIONS[0]);
    }, 0);
    return () => clearTimeout(to);
  }, [open, wallet]);

  const action = mode === "edit" ? updateWalletAction : createWalletAction;
  const [state, boundAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(() => onOpenChange(false), 0);
    return () => clearTimeout(to);
  }, [state, onOpenChange]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form action={boundAction} className="space-y-4">
          {mode === "edit" && wallet && (
            <input type="hidden" name="id" value={wallet.id} />
          )}
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {mode === "edit" ? t("editAccountTitle") : t("addAccountTitle")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {mode === "edit" ? t("editAccountDesc") : t("addAccountDesc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-3">
            <Field label={t("accountNameLabel")} htmlFor="wallet-name">
              <Input
                id="wallet-name"
                name="name"
                defaultValue={wallet?.name}
                placeholder={t("accountNamePlaceholder")}
                required
              />
            </Field>

            <Field label={t("accountTypeLabel")}>
              <div className="flex gap-2">
                {WALLET_TYPES.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setType(w)}
                    aria-pressed={type === w}
                    className={
                      "flex-1 rounded-md border px-2 py-2 text-xs font-medium " +
                      (type === w
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {t(typeLabelKey(w))}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </Field>

            <Field label={t("colorLabel")}>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={c}
                    className={
                      "h-7 w-7 rounded-full transition-transform " +
                      (color === c
                        ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                        : "hover:scale-110")
                    }
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <input type="hidden" name="color" value={color} />
            </Field>

            {mode === "edit" && wallet && (
              <p className="text-xs text-muted-foreground">
                {t("accountBalance")}:{" "}
                {formatMoney(wallet.balance, currency, locale)}
              </p>
            )}

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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

function TransferDialog({
  open,
  onOpenChange,
  wallets,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallets: { id: string; name: string }[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState<Date | null>(new Date());

  useEffect(() => {
    if (!open) return;
    const to = setTimeout(() => {
      setFrom(wallets[0]?.id ?? "");
      setTo(wallets[1]?.id ?? "");
      setDate(new Date());
    }, 0);
    return () => clearTimeout(to);
  }, [open, wallets]);

  const [state, boundAction, isPending] = useActionState(
    createTransferAction,
    null
  );

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(() => onOpenChange(false), 0);
    return () => clearTimeout(to);
  }, [state, onOpenChange]);

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form action={boundAction} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("transferTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("transferDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("fromLabel")}>
                <Select
                  value={from}
                  onValueChange={(v: string | null) => setFrom(v ?? "")}
                  disabled={isPending}
                  items={wallets.map((w) => ({ value: w.id, label: w.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("fromLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem value={w.id} key={w.id} label={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="fromAccountId" value={from} />
              </Field>

              <Field label={t("toLabel")}>
                <Select
                  value={to}
                  onValueChange={(v: string | null) => setTo(v ?? "")}
                  disabled={isPending}
                  items={wallets.map((w) => ({ value: w.id, label: w.name }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("toLabel")} />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem value={w.id} key={w.id} label={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="toAccountId" value={to} />
              </Field>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput
                name="amount"
                label={t("amountLabel")}
                currency={currency}
                required
                disabled={isPending}
              />

              <Field label={t("dateLabel")}>
                <DatePicker value={date} onChange={setDate} locale={locale} />
                <input
                  type="hidden"
                  name="date"
                  value={date ? format(date, "yyyy-MM-dd") : ""}
                />
              </Field>
            </div>

            <Field label={t("notesLabel")} htmlFor="tr-desc">
              <Input
                id="tr-desc"
                name="description"
                placeholder={t("notesPlaceholder")}
                disabled={isPending}
              />
            </Field>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <ResponsiveDialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("transfer")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}