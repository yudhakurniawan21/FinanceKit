"use client";

import { useEffect, useRef, useState, useActionState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tags } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { minorToMajor } from "@/lib/currencies";
import {
  createCategoryAction,
  deleteCategoryAction,
  updateCategoryBudgetAction,
} from "@/app/actions/categories";
import { CATEGORY_ICONS } from "@/lib/constants";
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
}: {
  categories: Category[];
  currency: string;
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [state, action, isPending] = useActionState(createCategoryAction, null);

  useEffect(() => {
    if (!state?.success) return;
    const t = setTimeout(() => {
      setDialogOpen(false);
      router.refresh();
    }, 0);
    return () => clearTimeout(t);
  }, [state?.success, router]);

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
        <h2 className="text-lg font-semibold">Kategori</h2>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tambah Kategori
        </Button>
      </div>

      {/* Add category dialog (controlled) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form action={action}>
            <DialogHeader>
              <DialogTitle>Tambah Kategori Baru</DialogTitle>
              <DialogDescription>
                Beri nama, pilih jenis, dan (opsional) atur anggaran bulanan.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="space-y-1">
                <Label htmlFor="cat-name">Nama</Label>
                <Input
                  id="cat-name"
                  name="name"
                  placeholder="Makanan & Minum"
                  required
                />
              </div>

              <TypeField />

              <div className="space-y-1">
                <Label htmlFor="cat-budget">
                  Anggaran bulanan (opsional)
                </Label>
                <Input
                  id="cat-budget"
                  name="budget"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="cth. 500000"
                />
              </div>

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
                onClick={() => setDialogOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan…" : "Simpan"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* List */}
      {(["INCOME", "EXPENSE"] as const).map((type) => {
        const items =
          type === "INCOME" ? grouped.income : grouped.expense;
        return (
          <CategoryGroup
            key={type}
            label={type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
            items={items}
            currency={currency}
            onBudget={(cat, v) => handleBudget(cat, v)}
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
            <AlertDialogTitle>Hapus kategori?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteCat
                ? `Kategori "${deleteCat.name}" akan dihapus. Transaksi yang sudah ada tidak akan dihapus, tetapi kategori-nya menjadi tidak terikat.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteCat(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Menghapus…" : "Ya, hapus"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypeField() {
  const [type, setType] = useState("EXPENSE");
  return (
    <div className="space-y-1">
      <Label>Jenis</Label>
      <div className="flex gap-2">
        {(["INCOME", "EXPENSE"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={
              "flex-1 rounded-md border px-3 py-2 text-sm font-medium " +
              (type === t
                ? "border-primary bg-primary/10 text-primary"
                : "border-input text-muted-foreground")
            }
          >
            {t === "INCOME" ? "Pemasukan" : "Pengeluaran"}
          </button>
        ))}
      </div>
      <input type="hidden" name="type" value={type} />
    </div>
  );
}

function IconField() {
  const [icon, setIcon] = useState("Plus");
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

function ColorField() {
  const [color, setColor] = useState(COLOR_OPTIONS[0]);
  return (
    <div className="space-y-1">
      <Label>Warna</Label>
      <div className="flex items-center gap-2">
        <Select
          value={color}
          onValueChange={(v: string | null) => setColor(v ?? "")}
          items={COLOR_OPTIONS.map((c) => ({ value: c, label: c }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLOR_OPTIONS.map((c) => (
              <SelectItem value={c} key={c} label={c}>
                <span className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: c }}
                  />
                  {c}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="color" value={color} />
      </div>
    </div>
  );
}

interface CategoryGroupProps {
  label: string;
  items: Category[];
  currency: string;
  onBudget: (cat: Category, value: string) => void;
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
  const [value, setValue] = useState(
    cat.budget == null ? "" : String(minorToMajor(cat.budget, currency))
  );
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current === value) return;
    prevValue.current = value;
    const t = setTimeout(() => onBudget(cat, value), 800);
    return () => clearTimeout(t);
  }, [value, cat, onBudget]);

  return (
    <>
      <Label htmlFor={`budget-${cat.id}`} className="sr-only">
        Anggaran
      </Label>
      <Input
        id={`budget-${cat.id}`}
        type="number"
        min={0}
        className="w-28"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="0"
      />
    </>
  );
}

function CategoryGroup({
  label,
  items,
  currency,
  onBudget,
  onDelete,
}: CategoryGroupProps) {
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
              Belum ada kategori {label.toLowerCase()}.
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
        {items.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2 transition-colors hover:border-primary/50 hover:bg-muted/30"
          >
            <div className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: cat.color ?? "var(--muted-foreground)" }}
              />
              <span className="font-medium">{cat.name}</span>
              <Badge variant="secondary" className="text-xs">
                {cat.type === "INCOME" ? "Masuk" : "Keluar"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <BudgetInput cat={cat} currency={currency} onBudget={onBudget} />
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={() => onDelete(cat)}
              >
                <Trash2 className="h-4 w-4" />
                <span className="sr-only">Hapus</span>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
