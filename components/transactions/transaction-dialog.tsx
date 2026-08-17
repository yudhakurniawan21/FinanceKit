"use client";

import { useEffect, useState, useActionState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker, MoneyInput } from "@/components/ui/date-picker";
import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { minorToMajor } from "@/lib/currencies";
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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  transaction?: Transaction | null;
  categories: Category[];
  currency: string;
  locale: string;
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
  const [method, setMethod] = useState<string>(transaction?.method ?? "");
  const [desc, setDesc] = useState(transaction?.description ?? "");

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      if (mode === "create") {
        setDate(new Date());
        setType("EXPENSE");
        setCategory("");
        setMethod("");
        setDesc("");
      } else {
        setDate(transaction ? new Date(transaction.date) : new Date());
        setType((transaction?.type as "INCOME" | "EXPENSE") ?? "EXPENSE");
        setCategory(transaction?.categoryId ?? "");
        setMethod(transaction?.method ?? "");
        setDesc(transaction?.description ?? "");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [open, mode, transaction]);

  const action =
    mode === "edit" ? updateTransactionAction : createTransactionAction;
  const [state, boundAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (!state?.success) return;
    const t = setTimeout(() => onOpenChange(false), 0);
    return () => clearTimeout(t);
  }, [state?.success, onOpenChange]);

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

  const categoryOptions = categories.filter((c) => c.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={boundAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? t("editTxTitle") : t("addTxTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit"
                ? t("editTxDesc")
                : t("addTxDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("dateLabel")}</Label>
              <DatePicker value={date} onChange={setDate} locale={locale} />
              <input
                type="hidden"
                name="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
              />
            </div>

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

            <div className="space-y-1">
              <Label>{t("typeLabel")}</Label>
              <div className="flex gap-2">
                {typeOptions.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setType(o.value)}
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
            </div>

            <div className="space-y-1">
              <Label>{t("categoryLabel")}</Label>
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
                <SelectTrigger>
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
            </div>

            <div className="space-y-1">
              <Label>{t("methodLabel")}</Label>
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
                <SelectTrigger>
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
            </div>

            <div className="space-y-1">
              <Label htmlFor="tx-desc">{t("notesLabel")}</Label>
              <Textarea
                id="tx-desc"
                name="description"
                rows={3}
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                disabled={isPending}
                placeholder={t("notesPlaceholder")}
              />
            </div>

            {mode === "edit" && transaction && (
              <input type="hidden" name="id" value={transaction.id} />
            )}

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
