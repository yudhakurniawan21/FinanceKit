"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, RefreshCcw, Repeat } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
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
  createRecurringAction,
  updateRecurringAction,
  deleteRecurringAction,
  toggleRecurringAction,
  processRecurringNowAction,
} from "@/app/actions/recurring";
import { formatMoney, minorToMajor } from "@/lib/currencies";
import { formatDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/client";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { RecurringWithRefs } from "@/lib/db/recurring";
import type { Category } from "@/lib/generated/prisma/client";

const FREQUENCIES = ["DAILY", "WEEKLY", "MONTHLY", "YEARLY"] as const;
type Frequency = (typeof FREQUENCIES)[number];

export function RecurringManager({
  recurring,
  categories,
  wallets,
  currency,
  dateFormat,
  timeZone,
  locale,
}: {
  recurring: RecurringWithRefs[];
  categories: Category[];
  wallets: { id: string; name: string }[];
  currency: string;
  dateFormat: string;
  timeZone: string;
  locale: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editRec, setEditRec] = useState<RecurringWithRefs | null>(null);
  const [deleteRec, setDeleteRec] = useState<RecurringWithRefs | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState<string | null>(null);

  async function handleProcess() {
    setProcessing(true);
    setProcessMsg(null);
    try {
      const res = await processRecurringNowAction();
      if (res?.created != null && res.created > 0) {
        setProcessMsg(t("processedCount", { count: String(res.created) }));
      }
      router.refresh();
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!deleteRec) return;
    setDeleting(true);
    try {
      await deleteRecurringAction(deleteRec.id);
      setDeleteRec(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          variant="outline"
          disabled={processing}
          onClick={handleProcess}
        >
          <RefreshCcw className={"mr-2 h-4 w-4" + (processing ? " animate-spin" : "")} />
          {t("processNow")}
        </Button>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addRecurring")}
        </Button>
      </div>

      {processMsg && (
        <p className="text-sm font-medium text-positive">{processMsg}</p>
      )}

      {recurring.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Repeat className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">{t("noRecurringYet")}</p>
            <p className="text-sm text-muted-foreground">
              {t("addRecurringFirst")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {recurring.map((rec) => {
            const isIncome = rec.type === "INCOME";
            return (
              <Card key={rec.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Repeat
                        className={
                          "h-5 w-5 shrink-0 " +
                          (rec.isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground/30")
                        }
                      />
                      <p className="min-w-0 truncate font-medium">
                        {rec.description}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await toggleRecurringAction(rec.id, !rec.isActive);
                        router.refresh();
                      }}
                      aria-pressed={rec.isActive}
                      className={
                        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors " +
                        (rec.isActive
                          ? "bg-positive"
                          : "bg-muted-foreground/30")
                      }
                    >
                      <span
                        className={
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
                          (rec.isActive ? "translate-x-4.5" : "translate-x-0.5")
                        }
                      />
                      <span className="sr-only">{t("activeLabel")}</span>
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <Badge variant="secondary">
                      {t(frequencyKey(rec.frequency))}
                    </Badge>
                    {rec.category && <span>{rec.category.name}</span>}
                    {rec.account && <span>{rec.account.name}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t("nextRunLabel")}:{" "}
                    {formatDate(rec.nextRunDate, dateFormat, timeZone, locale)}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2 border-t pt-2">
                    <span
                      className={
                        "min-w-0 truncate text-sm font-semibold tabular-nums " +
                        (isIncome ? "text-positive" : "text-destructive")
                      }
                    >
                      {isIncome ? "+ " : "- "}
                      {formatMoney(rec.amount, currency, locale)}
                    </span>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditRec(rec)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">{t("edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteRec(rec)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("delete")}</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <RecurringDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        categories={categories}
        wallets={wallets}
        currency={currency}
        locale={locale}
      />

      {editRec && (
        <RecurringDialog
          key={editRec.id}
          open
          onOpenChange={() => setEditRec(null)}
          mode="edit"
          recurring={editRec}
          categories={categories}
          wallets={wallets}
          currency={currency}
          locale={locale}
        />
      )}

      <AlertDialog
        open={!!deleteRec}
        onOpenChange={(o) => !o && setDeleteRec(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteRecurringTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRec
                ? t("deleteRecurringDesc", { name: deleteRec.description })
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteRec(null)}
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

function frequencyKey(freq: string): DictKey {
  const map: Record<string, DictKey> = {
    DAILY: "freqDaily",
    WEEKLY: "freqWeekly",
    MONTHLY: "freqMonthly",
    YEARLY: "freqYearly",
  };
  return map[freq] ?? "freqMonthly";
}

function RecurringDialog({
  open,
  onOpenChange,
  mode,
  recurring,
  categories,
  wallets,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  recurring?: RecurringWithRefs | null;
  categories: Category[];
  wallets: { id: string; name: string }[];
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<"INCOME" | "EXPENSE">(
    (recurring?.type as "INCOME" | "EXPENSE") ?? "EXPENSE"
  );
  const [frequency, setFrequency] = useState<Frequency>(
    (recurring?.frequency as Frequency) ?? "MONTHLY"
  );
  const [category, setCategory] = useState(recurring?.categoryId ?? "");
  const [method, setMethod] = useState(recurring?.method ?? "");
  const [account, setAccount] = useState(recurring?.accountId ?? "");
  const [startDate, setStartDate] = useState<Date | null>(
    recurring ? new Date(recurring.startDate) : new Date()
  );

  useEffect(() => {
    if (!open) return;
    const to = setTimeout(() => {
      if (mode === "edit" && recurring) {
        setType(recurring.type as "INCOME" | "EXPENSE");
        setFrequency(recurring.frequency as Frequency);
        setCategory(recurring.categoryId ?? "");
        setMethod(recurring.method ?? "");
        setAccount(recurring.accountId ?? "");
        setStartDate(new Date(recurring.startDate));
      } else {
        setType("EXPENSE");
        setFrequency("MONTHLY");
        setCategory("");
        setMethod("");
        setAccount(wallets.length === 1 ? wallets[0].id : "");
        setStartDate(new Date());
      }
    }, 0);
    return () => clearTimeout(to);
  }, [open, mode, recurring, wallets]);

  const action = mode === "edit" ? updateRecurringAction : createRecurringAction;
  const [state, boundAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(() => onOpenChange(false), 0);
    return () => clearTimeout(to);
  }, [state, onOpenChange]);

  const categoryOptions = categories.filter((c) => c.type === type);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={boundAction} className="space-y-4">
          {mode === "edit" && recurring && (
            <input type="hidden" name="id" value={recurring.id} />
          )}
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? t("editRecurringTitle") : t("addRecurringTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit" ? t("editRecurringDesc") : t("addRecurringDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rec-desc">{t("recurringDescLabel")}</Label>
              <Input
                id="rec-desc"
                name="description"
                defaultValue={recurring?.description}
                placeholder={t("recurringDescPlaceholder")}
                required
                disabled={isPending}
              />
            </div>

            <MoneyInput
              name="amount"
              label={t("amountLabel")}
              defaultValue={
                recurring
                  ? minorToMajor(recurring.amount, currency)
                  : undefined
              }
              currency={currency}
              required
              disabled={isPending}
            />

            <div className="space-y-1">
              <Label>{t("typeLabel")}</Label>
              <div className="flex gap-2">
                {(["INCOME", "EXPENSE"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setType(o)}
                    aria-pressed={type === o}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                      (type === o
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {t(o === "INCOME" ? "income" : "expense")}
                  </button>
                ))}
              </div>
              <input type="hidden" name="type" value={type} />
            </div>

            <div className="space-y-1">
              <Label>{t("frequencyLabel")}</Label>
              <div className="flex gap-2">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFrequency(f)}
                    className={
                      "flex-1 rounded-md border px-2 py-2 text-xs font-medium " +
                      (frequency === f
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {t(frequencyKey(f))}
                  </button>
                ))}
              </div>
              <input type="hidden" name="frequency" value={frequency} />
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
                      {c.name}
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
                  { value: "CASH", label: t("methodCash") },
                  { value: "BANK", label: t("methodBank") },
                  { value: "E_WALLET", label: t("methodEwallet") },
                  { value: "CARD", label: t("methodCard") },
                ]}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectMethodPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="" label="—">—</SelectItem>
                  <SelectItem value="CASH" label={t("methodCash")}>
                    {t("methodCash")}
                  </SelectItem>
                  <SelectItem value="BANK" label={t("methodBank")}>
                    {t("methodBank")}
                  </SelectItem>
                  <SelectItem value="E_WALLET" label={t("methodEwallet")}>
                    {t("methodEwallet")}
                  </SelectItem>
                  <SelectItem value="CARD" label={t("methodCard")}>
                    {t("methodCard")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="method" value={method} />
            </div>

            {wallets.length > 0 && (
              <div className="space-y-1">
                <Label>{t("accountLabel")}</Label>
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
                  <SelectTrigger>
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
              </div>
            )}

            <div className="space-y-1">
              <Label>{t("startDateLabel")}</Label>
              <DatePicker value={startDate} onChange={setStartDate} locale={locale} />
              <input
                type="hidden"
                name="startDate"
                value={startDate ? format(startDate, "yyyy-MM-dd") : ""}
              />
            </div>

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
              {isPending ? t("saving") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}