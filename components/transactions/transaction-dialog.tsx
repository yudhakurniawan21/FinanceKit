"use client";

import { useEffect, useState, useActionState } from "react";
import { format } from "date-fns";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { MoneyInput } from "@/components/ui/money-input";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { minorToMajor, formatMoney } from "@/lib/currencies";
import { useI18n } from "@/lib/i18n/client";
import type { Category, Transaction } from "@/lib/generated/prisma/client";

export function TransactionDialog({
  open,
  onOpenChange,
  mode,
  transaction,
  categories,
  currency,
  locale,
  wallets,
  goals,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  transaction?: Transaction | null;
  categories: Category[];
  currency: string;
  locale: string;
  wallets: { id: string; name: string }[];
  goals: { id: string; name: string; currentAmount: number; targetAmount: number }[];
}) {
  const { t } = useI18n();
  const [date, setDate] = useState<Date | null>(
    transaction ? new Date(transaction.date) : new Date()
  );
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    (transaction?.type as "INCOME" | "EXPENSE") ?? "EXPENSE"
  );
  const [category, setCategory] = useState<string>(
    transaction?.categoryId ?? ""
  );
  const [goal, setGoal] = useState<string>(transaction?.goalId ?? "");
  const [method, setMethod] = useState<string>(transaction?.method ?? "");
  const [account, setAccount] = useState<string>(
    transaction?.accountId ?? ""
  );
  const [desc, setDesc] = useState(transaction?.description ?? "");

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (mode === "create") {
        setDate(new Date());
        setType("EXPENSE");
        setCategory("");
        setGoal("");
        setMethod("");
        setAccount(wallets.length === 1 ? wallets[0].id : "");
        setDesc("");
      } else {
        setDate(transaction ? new Date(transaction.date) : new Date());
        setType((transaction?.type as "INCOME" | "EXPENSE") ?? "EXPENSE");
        setCategory(transaction?.categoryId ?? "");
        setGoal(transaction?.goalId ?? "");
        setMethod(transaction?.method ?? "");
        setAccount(transaction?.accountId ?? "");
        setDesc(transaction?.description ?? "");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, mode, transaction, wallets]);

  const action =
    mode === "edit" ? updateTransactionAction : createTransactionAction;
  const [state, boundAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (!state?.success) return;
    const t = setTimeout(() => onOpenChange(false), 0);
    return () => clearTimeout(t);
  }, [state, onOpenChange]);

  const typeOptions: Array<{ value: "INCOME" | "EXPENSE"; label: string }> = [
    { value: "INCOME", label: t("income") },
    { value: "EXPENSE", label: t("expense") },
  ];

  const methodOptions: Array<{ value: string; label: string }> = [
    { value: "CASH", label: t("methodCash") },
    { value: "BANK", label: t("methodBank") },
    { value: "E_WALLET", label: t("methodEwallet") },
    { value: "CARD", label: t("methodCard") },
  ];

  // Kategori tabungan tampil di kedua jenis: EXPENSE = setor, INCOME = penarikan.
  const categoryOptions = categories.filter(
    (c) => c.type === type || c.isSavings
  );
  // Kategori tabungan yang tertaut goal → goal terisi otomatis.
  // "" = belum dipilih (fallback ke tautan kategori); "__none__" = sengaja tanpa tujuan.
  const selectedCategory = categories.find((c) => c.id === category);
  const showGoal = (selectedCategory?.isSavings ?? false) && category !== "";
  const selectedGoalId =
    goal === "" ? (selectedCategory?.goalId ?? "") : goal === "__none__" ? "" : goal;

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <form action={boundAction} className="space-y-4">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {mode === "edit" ? t("editTxTitle") : t("addTxTitle")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {mode === "edit"
                ? t("editTxDesc")
                : t("addTxDesc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-3">
            <Field label={t("typeLabel")}>
              <div className="flex gap-2">
                {typeOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setType(o.value)}
                    aria-pressed={type === o.value}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                      (type === o.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput
                name="amount"
                label={t("amountLabel")}
                defaultValue={
                  transaction
                    ? minorToMajor(transaction.amount, currency)
                    : undefined
                }
                currency={currency}
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

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t("categoryLabel")}>
                <Select
                  value={category}
                  onValueChange={(v: string | null) => setCategory(v ?? "")}
                  disabled={isPending}
                  items={[
                    { value: "", label: t("noCategory") },
                    ...categoryOptions.map((c) => ({
                      value: c.id,
                      label: c.name,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectCategoryPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label={t("noCategory")}>
                      {t("noCategory")}
                    </SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem value={c.id} key={c.id} label={c.name}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.color ?? "var(--muted-foreground)" }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="categoryId" value={category} />
              </Field>

              <Field label={t("methodLabel")}>
                <Select
                  value={method}
                  onValueChange={(v: string | null) => setMethod(v ?? "")}
                  disabled={isPending}
                  items={[
                    { value: "", label: "—" },
                    ...methodOptions.map((m) => ({
                      value: m.value,
                      label: m.label,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectMethodPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label="—">—</SelectItem>
                    {methodOptions.map((m) => (
                      <SelectItem value={m.value} key={m.value} label={m.label}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="method" value={method} />
              </Field>
            </div>

            {wallets.length > 0 && (
              <Field label={t("accountLabel")}>
                <Select
                  value={account}
                  onValueChange={(v: string | null) => setAccount(v ?? "")}
                  disabled={isPending}
                  items={[
                    { value: "", label: t("noAccount") },
                    ...wallets.map((w) => ({
                      value: w.id,
                      label: w.name,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectAccountPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="" label={t("noAccount")}>
                      {t("noAccount")}
                    </SelectItem>
                    {wallets.map((w) => (
                      <SelectItem value={w.id} key={w.id} label={w.name}>
                        {w.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="accountId" value={account} />
              </Field>
            )}

            {showGoal && (
              <Field label={t("goalLabel")}>
                <Select
                  value={selectedGoalId || "__none__"}
                  onValueChange={(v: string | null) =>
                    setGoal(v === "__none__" ? "__none__" : (v ?? ""))
                  }
                  disabled={isPending}
                  items={[
                    { value: "__none__", label: t("noGoal") },
                    ...goals.map((g) => ({
                      value: g.id,
                      label: g.name,
                    })),
                  ]}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectGoalPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" label={t("noGoal")}>
                      {t("noGoal")}
                    </SelectItem>
                    {goals.map((g) => (
                      <SelectItem value={g.id} key={g.id} label={g.name}>
                        <span className="flex items-center justify-between gap-3">
                          {g.name}
                          <span className="text-xs text-muted-foreground">
                            {formatMoney(g.currentAmount, currency, locale)} /{" "}
                            {formatMoney(g.targetAmount, currency, locale)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="goalId" value={selectedGoalId} />
              </Field>
            )}

            <Field label={t("notesLabel")} htmlFor="tx-desc">
              <Textarea
                id="tx-desc"
                name="description"
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={isPending}
                placeholder={t("notesPlaceholder")}
              />
            </Field>

            {mode === "edit" && transaction && (
              <input type="hidden" name="id" value={transaction.id} />
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
              {isPending
                ? t("saving")
                : mode === "edit"
                  ? t("save")
                  : t("add")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
