"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, PiggyBank, ArrowDownToLine, ArrowUpFromLine, ShieldCheck } from "lucide-react";
import { differenceInMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { DatePicker } from "@/components/ui/date-picker";
import { MoneyInput } from "@/components/ui/money-input";
import {
  createGoalAction,
  updateGoalAction,
  adjustGoalAmountAction,
  deleteGoalAction,
} from "@/app/actions/goals";
import { formatMoney, minorToMajor } from "@/lib/currencies";
import { formatDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Goal } from "@/lib/generated/prisma/client";
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

export function GoalManager({
  goals,
  currency,
  dateFormat,
  timeZone,
  locale,
  wallets,
}: {
  goals: Goal[];
  currency: string;
  dateFormat: string;
  timeZone: string;
  locale: string;
  wallets: WalletWithBalance[];
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [adjustGoal, setAdjustGoal] = useState<Goal | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<Goal | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!deleteGoal) return;
    setDeleting(true);
    try {
      await deleteGoalAction(deleteGoal.id);
      setDeleteGoal(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {goals.length} {t("navGoals").toLowerCase()}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addGoal")}
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <PiggyBank className="h-8 w-8 text-muted-foreground/40" />
            <p className="font-medium">{t("noGoalsYet")}</p>
            <p className="text-sm text-muted-foreground">{t("addGoalFirst")}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {goals.map((goal) => {
            const pct =
              goal.targetAmount > 0
                ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
                : 0;
            const achieved = goal.currentAmount >= goal.targetAmount;
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const monthsLeft = goal.deadline
              ? differenceInMonths(new Date(goal.deadline), new Date())
              : null;

            return (
              <Card
                key={goal.id}
                className="transition-colors hover:border-primary/50"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-lg"
                        style={{
                          backgroundColor: `${goal.color ?? "#454745"}22`,
                          color: goal.color ?? "var(--foreground)",
                        }}
                      >
                        <PiggyBank className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 font-medium leading-tight">
                          {goal.name}
                          {goal.isEmergency && (
                            <Badge
                              variant="outline"
                              className="gap-1 px-1.5 py-0 text-[10px] text-positive"
                            >
                              <ShieldCheck className="h-3 w-3" />
                              {t("badgeEmergency")}
                            </Badge>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {goal.deadline
                            ? monthsLeft != null && monthsLeft >= 0
                              ? t("monthsLeft", { count: String(monthsLeft) })
                              : t("noDeadline")
                            : t("noDeadline")}
                          {goal.deadline ? (
                            <> · {formatDate(goal.deadline, dateFormat, timeZone, locale)}</>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditGoal(goal)}>
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">{t("edit")}</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => setDeleteGoal(goal)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">{t("delete")}</span>
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={
                          "h-full rounded-full " +
                          (achieved ? "bg-positive" : "bg-primary")
                        }
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {achieved
                        ? t("achieved")
                        : t("goalProgress", {
                            current: formatMoney(goal.currentAmount, currency, locale),
                            target: formatMoney(goal.targetAmount, currency, locale),
                          })}
                    </p>
                    {!achieved && (
                      <p className="text-xs font-medium">
                        {t("remainingLabel")}:{" "}
                        {formatMoney(remaining, currency, locale)}
                      </p>
                    )}
                    {!achieved &&
                      goal.deadline &&
                      monthsLeft != null &&
                      monthsLeft > 0 && (
                        <p className="text-xs font-medium text-positive">
                          {t("goalMonthlyNeeded", {
                            amount: formatMoney(
                              Math.ceil(remaining / monthsLeft),
                              currency,
                              locale
                            ),
                          })}
                        </p>
                      )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => setAdjustGoal(goal)}
                    >
                      <ArrowDownToLine className="mr-1.5 h-4 w-4" />
                      {t("deposit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setAdjustGoal(goal)}
                    >
                      <ArrowUpFromLine className="mr-1.5 h-4 w-4" />
                      {t("withdraw")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        currency={currency}
        locale={locale}
      />

      {editGoal && (
        <GoalDialog
          key={editGoal.id}
          open
          onOpenChange={() => setEditGoal(null)}
          mode="edit"
          goal={editGoal}
          currency={currency}
          locale={locale}
        />
      )}

      {adjustGoal && (
        <AdjustDialog
          key={adjustGoal.id}
          goal={adjustGoal}
          onClose={() => setAdjustGoal(null)}
          currency={currency}
          wallets={wallets}
        />
      )}

      <AlertDialog
        open={!!deleteGoal}
        onOpenChange={(o) => !o && setDeleteGoal(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteGoalTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteGoal ? t("deleteGoalDesc", { name: deleteGoal.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteGoal(null)}
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

function GoalDialog({
  open,
  onOpenChange,
  mode,
  goal,
  currency,
  locale,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  goal?: Goal | null;
  currency: string;
  locale: string;
}) {
  const { t } = useI18n();
  const [color, setColor] = useState(goal?.color ?? COLOR_OPTIONS[0]);
  const [deadline, setDeadline] = useState<Date | null>(
    goal?.deadline ? new Date(goal.deadline) : null
  );
  const [createCategory, setCreateCategory] = useState(true);
  const [isEmergency, setIsEmergency] = useState(goal?.isEmergency ?? false);

  useEffect(() => {
    if (!open) return;
    const to = setTimeout(() => {
      setColor(goal?.color ?? COLOR_OPTIONS[0]);
      setDeadline(goal?.deadline ? new Date(goal.deadline) : null);
      setCreateCategory(true);
      setIsEmergency(goal?.isEmergency ?? false);
    }, 0);
    return () => clearTimeout(to);
  }, [open, goal]);

  const action = mode === "edit" ? updateGoalAction : createGoalAction;
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
          {mode === "edit" && goal && (
            <input type="hidden" name="id" value={goal.id} />
          )}
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>
              {mode === "edit" ? t("editGoalTitle") : t("addGoalTitle")}
            </ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              {mode === "edit" ? t("editGoalDesc") : t("addGoalDesc")}
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-3">
            <Field label={t("goalNameLabel")} htmlFor="goal-name">
              <Input
                id="goal-name"
                name="name"
                defaultValue={goal?.name}
                placeholder={t("goalNamePlaceholder")}
                required
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <MoneyInput
                name="targetAmount"
                label={t("targetLabel")}
                defaultValue={
                  goal ? minorToMajor(goal.targetAmount, currency) : undefined
                }
                currency={currency}
                required
              />

              <Field label={t("deadlineLabel")}>
                <DatePicker
                  value={deadline}
                  onChange={setDeadline}
                  locale={locale}
                />
                <input
                  type="hidden"
                  name="deadline"
                  value={deadline ? deadline.toISOString().slice(0, 10) : ""}
                />
              </Field>
            </div>

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

            {mode === "create" && (
              <label className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4"
                  checked={createCategory}
                  onChange={(e) => setCreateCategory(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {t("autoCategoryLabel")}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {t("savingsCategoryHint")}
                  </span>
                </span>
                <input
                  type="hidden"
                  name="createCategory"
                  value={createCategory ? "on" : "off"}
                />
              </label>
            )}

            <label className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/40 px-3 py-2.5">
              <input
                type="checkbox"
                className="mt-0.5 h-4 w-4"
                checked={isEmergency}
                onChange={(e) => setIsEmergency(e.target.checked)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">
                  {t("goalIsEmergency")}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {t("goalEmergencyHint")}
                </span>
              </span>
              <input
                type="hidden"
                name="isEmergency"
                value={isEmergency ? "on" : "off"}
              />
            </label>

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

function AdjustDialog({
  goal,
  onClose,
  currency,
  wallets,
}: {
  goal: Goal;
  onClose: () => void;
  currency: string;
  wallets: WalletWithBalance[];
}) {
  const { t, locale } = useI18n();
  const [direction, setDirection] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
  const [linked, setLinked] = useState(wallets.length > 0);
  const [accountId, setAccountId] = useState<string>(
    wallets.length === 1 ? wallets[0].id : ""
  );
  const [state, boundAction, isPending] = useActionState(
    adjustGoalAmountAction,
    null
  );

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(onClose, 0);
    return () => clearTimeout(to);
  }, [state, onClose]);

  return (
    <ResponsiveDialog open onOpenChange={(o) => !o && onClose()}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <form action={boundAction} className="space-y-4">
          <input type="hidden" name="id" value={goal.id} />
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>{t("adjustTitle")}</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>{t("adjustDesc")}</ResponsiveDialogDescription>
          </ResponsiveDialogHeader>

          <div className="space-y-3">
            <Field label={t("typeLabel")}>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDirection("DEPOSIT")}
                  className={
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                    (direction === "DEPOSIT"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground")
                  }
                >
                  {t("deposit")}
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("WITHDRAW")}
                  className={
                    "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                    (direction === "WITHDRAW"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input text-muted-foreground")
                  }
                >
                  {t("withdraw")}
                </button>
              </div>
              <input type="hidden" name="direction" value={direction} />
            </Field>

            <MoneyInput
              name="amount"
              label={t("amountLabel")}
              currency={currency}
              required
              disabled={isPending}
            />

            <div>
              <Field label={t("linkModeLabel")}>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setLinked(true)}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                      (linked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {t("goalLinkMode")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinked(false)}
                    className={
                      "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
                      (!linked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input text-muted-foreground")
                    }
                  >
                    {t("goalManualMode")}
                  </button>
                </div>
              </Field>
              <input type="hidden" name="linked" value={linked ? "on" : "off"} />
            </div>

            {linked && wallets.length > 0 && (
              <Field
                label={
                  direction === "DEPOSIT"
                    ? t("goalSourceAccount")
                    : t("goalTargetAccount")
                }
              >
                <Select
                  value={accountId}
                  onValueChange={(v: string | null) => setAccountId(v ?? "")}
                  disabled={isPending}
                  items={wallets.map((w) => ({
                    value: w.id,
                    label: `${w.name} — ${formatMoney(w.balance, currency, locale)}`,
                  }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectAccountPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((w) => (
                      <SelectItem value={w.id} key={w.id} label={w.name}>
                        <span className="flex w-full items-center justify-between gap-3">
                          {w.name}
                          <span className="text-xs text-muted-foreground">
                            {formatMoney(w.balance, currency, locale)}
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="accountId" value={accountId} />
                {accountId && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("accountBalanceHint", {
                      amount: formatMoney(
                        wallets.find((w) => w.id === accountId)?.balance ?? 0,
                        currency,
                        locale
                      ),
                    })}
                  </p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("goalLinkHint")}
                </p>
              </Field>
            )}

            {!linked && (
              <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                {t("goalManualHint")}
              </p>
            )}

            <p className="text-xs text-muted-foreground">
              {t("goalProgress", {
                current: formatMoney(goal.currentAmount, currency, locale),
                target: formatMoney(goal.targetAmount, currency, locale),
              })}
            </p>

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
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
              {isPending
                ? t("saving")
                : direction === "DEPOSIT"
                  ? t("deposit")
                  : t("withdraw")}
            </Button>
          </ResponsiveDialogFooter>
        </form>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}