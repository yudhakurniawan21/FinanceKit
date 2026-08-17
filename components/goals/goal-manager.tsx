"use client";

import { useEffect, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Pencil, PiggyBank, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { differenceInMonths } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  createGoalAction,
  updateGoalAction,
  adjustGoalAmountAction,
  deleteGoalAction,
} from "@/app/actions/goals";
import { formatMoney, minorToMajor } from "@/lib/currencies";
import { formatDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n/client";
import type { Goal } from "@/lib/generated/prisma/client";

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
}: {
  goals: Goal[];
  currency: string;
  dateFormat: string;
  timeZone: string;
  locale: string;
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
                        <p className="font-medium leading-tight">{goal.name}</p>
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

  useEffect(() => {
    if (!open) return;
    const to = setTimeout(() => {
      setColor(goal?.color ?? COLOR_OPTIONS[0]);
      setDeadline(goal?.deadline ? new Date(goal.deadline) : null);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={boundAction} className="space-y-4">
          {mode === "edit" && goal && (
            <input type="hidden" name="id" value={goal.id} />
          )}
          <DialogHeader>
            <DialogTitle>
              {mode === "edit" ? t("editGoalTitle") : t("addGoalTitle")}
            </DialogTitle>
            <DialogDescription>
              {mode === "edit" ? t("editGoalDesc") : t("addGoalDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="goal-name">{t("goalNameLabel")}</Label>
              <Input
                id="goal-name"
                name="name"
                defaultValue={goal?.name}
                placeholder={t("goalNamePlaceholder")}
                required
              />
            </div>

            <MoneyInput
              name="targetAmount"
              label={t("targetLabel")}
              defaultValue={
                goal ? minorToMajor(goal.targetAmount, currency) : undefined
              }
              currency={currency}
              required
            />

            <div className="space-y-1">
              <Label>{t("deadlineLabel")}</Label>
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
            </div>

            <div className="space-y-1">
              <Label>{t("colorLabel")}</Label>
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

function AdjustDialog({
  goal,
  onClose,
  currency,
}: {
  goal: Goal;
  onClose: () => void;
  currency: string;
}) {
  const { t, locale } = useI18n();
  const [direction, setDirection] = useState<"DEPOSIT" | "WITHDRAW">("DEPOSIT");
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
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form action={boundAction} className="space-y-4">
          <input type="hidden" name="id" value={goal.id} />
          <DialogHeader>
            <DialogTitle>{t("adjustTitle")}</DialogTitle>
            <DialogDescription>{t("adjustDesc")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label>{t("typeLabel")}</Label>
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
            </div>

            <MoneyInput
              name="amount"
              label={t("amountLabel")}
              currency={currency}
              required
              disabled={isPending}
            />

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

          <DialogFooter>
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}