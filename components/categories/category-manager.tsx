"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tags, Pencil, Pipette } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { minorToMajor } from "@/lib/currencies";
import { formatMoney } from "@/lib/currencies";
import { MoneyInput, useMoneyMask } from "@/components/ui/money-input";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryBudgetAction,
  updateCategoryAction,
} from "@/app/actions/categories";
import { CATEGORY_ICONS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n/client";
import type { Category } from "@/lib/generated/prisma/client";

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

export function CategoryManager({
  categories,
  currency,
  spentByCategory,
}: {
  categories: Category[];
  currency: string;
  spentByCategory: Record<string, number>;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editCat, setEditCat] = useState<Category | null>(null);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [state, action, isPending] = useActionState(createCategoryAction, null);

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(() => {
      setDialogOpen(false);
      router.refresh();
    }, 0);
    return () => clearTimeout(to);
  }, [state, router]);

  const grouped = (() => {
    const income = categories.filter((c) => c.type === "INCOME");
    const expense = categories.filter((c) => c.type === "EXPENSE");
    return { income, expense };
  })();

  async function handleDelete() {
    if (!deleteCat) return;
    setDeleting(true);
    try {
      await deleteCategoryAction(deleteCat.id);
      setDeleteCat(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  async function handleBudget(cat: Category, value: string) {
    const major = value ? Number(value) : null;
    if (value && Number.isNaN(major)) return;
    await updateCategoryBudgetAction(cat.id, major!);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("categoriesTitle")}</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("addCategory")}
        </Button>
      </div>

      {/* Add category dialog (controlled) */}
      <AddCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        state={state}
        isPending={isPending}
        action={action}
        currency={currency}
      />

      {/* Edit category dialog */}
      {editCat && (
        <CategoryEditDialog
          key={editCat.id}
          cat={editCat}
          onClose={() => setEditCat(null)}
        />
      )}

      {/* List */}
      {(["INCOME", "EXPENSE"] as const).map((type) => {
        const items =
          type === "INCOME" ? grouped.income : grouped.expense;
        return (
          <CategoryGroup
            key={type}
            label={type === "INCOME" ? t("income") : t("expense")}
            items={items}
            currency={currency}
            spentByCategory={spentByCategory}
            onBudget={(cat, v) => handleBudget(cat, v)}
            onEdit={(cat) => setEditCat(cat)}
            onDelete={(cat) => setDeleteCat(cat)}
          />
        );
      })}

      {/* Konfirmasi hapus kategori */}
      <AlertDialog
        open={!!deleteCat}
        onOpenChange={(o) => !o && setDeleteCat(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteCatTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCat ? t("deleteCatDesc", { name: deleteCat.name }) : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteCat(null)}
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

// ── Dialog tambah kategori ─────────────────────────────────
function AddCategoryDialog({
  open,
  onOpenChange,
  state,
  isPending,
  action,
  currency,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: { error?: string; success?: boolean } | null;
  isPending: boolean;
  action: (formData: FormData) => void;
  currency: string;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={action}>
          <DialogHeader>
            <DialogTitle>{t("addCategoryTitle")}</DialogTitle>
            <DialogDescription>
              {t("addCategoryDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cat-name">{t("nameLabel")}</Label>
              <Input
                id="cat-name"
                name="name"
                placeholder={t("namePlaceholder")}
                required
              />
            </div>

            <TypeField value={type} onChange={setType} />

            {type === "EXPENSE" && (
              <MoneyInput
                name="budget"
                label={t("budgetLabel")}
                currency={currency}
                placeholder={t("budgetPlaceholder")}
              />
            )}

            <IconField />

            <ColorField />

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
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

// ── Dialog edit kategori (nama/ikon/warna) ────────────────
function CategoryEditDialog({
  cat,
  onClose,
}: {
  cat: Category;
  onClose: () => void;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [state, action, isPending] = useActionState(updateCategoryAction, null);

  useEffect(() => {
    if (!state?.success) return;
    const to = setTimeout(() => {
      onClose();
      router.refresh();
    }, 0);
    return () => clearTimeout(to);
  }, [state, onClose, router]);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form action={action}>
          <input type="hidden" name="id" value={cat.id} />
          <DialogHeader>
            <DialogTitle>{t("editCategoryTitle")}</DialogTitle>
            <DialogDescription>
              {t("editCategoryDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-1">
              <Label htmlFor="cat-edit-name">{t("nameLabel")}</Label>
              <Input
                id="cat-edit-name"
                name="name"
                defaultValue={cat.name}
                required
              />
            </div>

            <IconField defaultValue={cat.icon ?? "Plus"} />

            <ColorField defaultValue={cat.color ?? COLOR_OPTIONS[0]} />

            {state?.error && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
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

function TypeField({
  value,
  onChange,
}: {
  value: "INCOME" | "EXPENSE";
  onChange: (t: "INCOME" | "EXPENSE") => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <Label>{t("typeLabel")}</Label>
      <div className="flex gap-2">
        {(["INCOME", "EXPENSE"] as const).map((t2) => (
          <button
            key={t2}
            type="button"
            onClick={() => onChange(t2)}
            className={
              "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
              (value === t2
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground")
            }
          >
            {t(t2 === "INCOME" ? "income" : "expense")}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={value} />
    </div>
  );
}

function IconField({ defaultValue = "Plus" }: { defaultValue?: string }) {
  const [icon, setIcon] = useState(defaultValue);
  return (
    <div className="space-y-1">
      <Label>Icon</Label>
      <div className="flex items-center gap-2">
        <Select
          value={icon}
          onValueChange={(v: string | null) => setIcon(v ?? "")}
          items={CATEGORY_ICONS.map((c) => ({ value: c.name, label: c.name }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORY_ICONS.map((c) => (
              <SelectItem value={c.name} key={c.name} label={c.name}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="icon" value={icon} />
      </div>
    </div>
  );
}

function ColorField({ defaultValue = COLOR_OPTIONS[0] }: { defaultValue?: string }) {
  const { t } = useI18n();
  const [color, setColor] = useState(defaultValue);
  const isPreset = COLOR_OPTIONS.includes(color);

  return (
    <div className="space-y-1">
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

interface CategoryGroupProps {
  label: string;
  items: Category[];
  currency: string;
  spentByCategory: Record<string, number>;
  onBudget: (cat: Category, value: string) => void;
  onEdit: (cat: Category) => void;
  onDelete: (cat: Category) => void;
}

function BudgetInput({
  cat,
  currency,
  onBudget,
}: {
  cat: Category;
  currency: string;
  onBudget: (cat: Category, value: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const { inputProps } = useMoneyMask({
    defaultValue:
      cat.budget == null ? "" : String(minorToMajor(cat.budget, currency)),
    currency,
    onChangeRaw: (v) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onBudget(cat, v), 800);
    },
  });

  return (
    <Input
      id={`budget-${cat.id}`}
      className="w-28"
      placeholder="0"
      {...inputProps}
    />
  );
}

function CategoryGroup({
  label,
  items,
  currency,
  spentByCategory,
  onBudget,
  onEdit,
  onDelete,
}: CategoryGroupProps) {
  const { t } = useI18n();
  if (!items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Tags className="h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              {t("noCategories", { type: label.toLowerCase() })}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">
          {label} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {items.map((cat) => {
          const hasBudget = cat.type === "EXPENSE" && cat.budget != null;
          const spent = hasBudget ? (spentByCategory[cat.id] ?? 0) : 0;
          const over = hasBudget ? spent > (cat.budget ?? 0) : false;
          const pct =
            hasBudget && (cat.budget ?? 0) > 0
              ? Math.min(100, (spent / (cat.budget ?? 0)) * 100)
              : 0;

          return (
            <div
              key={cat.id}
              className="rounded-xl border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/30"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color ?? "var(--muted-foreground)" }}
                  />
                  <span className="truncate font-medium">{cat.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEdit(cat)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">{t("edit")}</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onDelete(cat)}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">{t("delete")}</span>
                  </Button>
                </div>
              </div>

              {cat.type === "EXPENSE" && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Label
                    htmlFor={`budget-${cat.id}`}
                    className="text-xs font-normal text-muted-foreground"
                  >
                    {t("budgetLabel")}
                  </Label>
                  <BudgetInput
                    cat={cat}
                    currency={currency}
                    onBudget={onBudget}
                  />
                </div>
              )}

              {hasBudget && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={
                        "h-full rounded-full " +
                        (over ? "bg-destructive" : "bg-positive")
                      }
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p
                    className={
                      "text-xs " +
                      (over ? "text-destructive" : "text-muted-foreground")
                    }
                  >
                    {t("budgetUsedOf", {
                      spent: formatMoney(spent, currency),
                      total: formatMoney(cat.budget ?? 0, currency),
                    })}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}