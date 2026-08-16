"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { TransactionDialog } from "@/components/transactions/transaction-dialog";
import { deleteTransactionAction } from "@/app/actions/transactions";
import { formatDate } from "@/lib/formatting";
import { formatMoney, formatNumber } from "@/lib/currencies";
import type { Category } from "@/lib/generated/prisma/client";
import type { TransactionWithCategory } from "@/lib/db/transactions";

type SortKey = "date" | "description" | "category" | "method" | "amount";
type SortDir = "asc" | "desc";


export function TransactionManager({
  transactions,
  categories,
  currency,
  dateFormat,
  timeZone,
}: {
  transactions: TransactionWithCategory[];
  categories: Category[];
  currency: string;
  dateFormat: string;
  timeZone: string;
}) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editTx, setEditTx] = useState<TransactionWithCategory | null>(null);
  const [deleteTx, setDeleteTx] = useState<TransactionWithCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeType, setActiveType] = useState<"ALL" | "INCOME" | "EXPENSE">("ALL");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // refresh list setelah dialog tertutup (create/edit).
  useEffect(() => {
    if (!addOpen && !editTx) {
      router.refresh();
    }
  }, [addOpen, editTx, router]);

  const filtered = useMemo(() => {
    let list = transactions;
    if (activeType !== "ALL") {
      list = list.filter((t) => t.type === activeType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description?.toLowerCase().includes(q) ?? false) ||
          (t.category?.name?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [transactions, activeType, search]);

  const sorted = useMemo(() => {
    const factor = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "date":
          return (a.date.getTime() - b.date.getTime()) * factor;
        case "amount":
          return (a.amount - b.amount) * factor;
        case "description":
          return (
            (a.description ?? "").localeCompare(b.description ?? "", "id") *
            factor
          );
        case "category":
          return (
            (a.category?.name ?? "").localeCompare(
              b.category?.name ?? "",
              "id"
            ) * factor
          );
        case "method":
          return (
            (a.method ?? "").localeCompare(b.method ?? "", "id") * factor
          );
        default:
          return 0;
      }
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const paged = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  function handleSort(key: SortKey) {
    setPage(1);
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "amount" ? "desc" : "asc");
    }
  }

  const catMap = useMemo(
    () =>
      Object.fromEntries(
        categories.map((c) => [
          c.id,
          { name: c.name, color: c.color ?? "var(--muted-foreground)" },
        ])
      ),
    [categories]
  );

  async function handleDelete() {
    if (!deleteTx) return;
    setDeleting(true);
    try {
      await deleteTransactionAction(deleteTx.id);
      setDeleteTx(null);
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  const income = transactions.filter((t) => t.type === "INCOME").reduce((a, t) => a + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((a, t) => a + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {(["ALL", "INCOME", "EXPENSE"] as const).map((t) => (
            <Button
              key={t}
              variant={activeType === t ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setActiveType(t);
                setPage(1);
              }}
            >
              {t === "ALL" ? "Semua" : t === "INCOME" ? "Pemasukan" : "Pengeluaran"}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-48">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Tambah
          </Button>
        </div>
      </div>

      <div className="flex gap-6 text-sm">
        <span>
          Pemasukan:{" "}
          <span className="font-medium text-positive">
            {formatMoney(income, currency)}
          </span>
        </span>
        <span>
          Pengeluaran:{" "}
          <span className="font-medium text-destructive">
            {formatMoney(expense, currency)}
          </span>
        </span>
        <span>
          Net:{" "}
          <span className="font-medium">
            {formatMoney(income - expense, currency)}
          </span>
        </span>
      </div>

      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead
                label="Tanggal"
                sortKey="date"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Deskripsi"
                sortKey="description"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Kategori"
                sortKey="category"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Metode"
                sortKey="method"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
              />
              <SortableHead
                label="Jumlah"
                sortKey="amount"
                activeKey={sortKey}
                dir={sortDir}
                onSort={handleSort}
                className="text-right"
              />
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                    <div>
                      <p className="font-medium text-foreground">
                        {transactions.length === 0
                          ? "Belum ada transaksi"
                          : "Tidak ada hasil"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {transactions.length === 0
                          ? "Mulai catat pemasukan dan pengeluaran Anda."
                          : "Coba ubah filter atau kata kunci pencarian."}
                      </p>
                    </div>
                    {transactions.length === 0 && (
                      <Button size="sm" onClick={() => setAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Tambah transaksi pertama
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paged.map((tx) => {
                const cat = tx.categoryId ? catMap[tx.categoryId] : null;
                const isIncome = tx.type === "INCOME";
                return (
                  <TableRow key={tx.id} className="transition-colors hover:bg-muted/50">
                    <TableCell>{formatDate(tx.date, dateFormat, timeZone)}</TableCell>
                    <TableCell>{tx.description ?? <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>
                      {cat ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {tx.method ? (
                        <Badge variant="outline">{methodLabel(tx.method)}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={
                        "text-right font-semibold tabular-nums " +
                        (isIncome ? "text-positive" : "text-destructive")
                      }
                    >
                      {isIncome ? "+ " : "- "}
                      {formatMoney(tx.amount, currency)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditTx(tx)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => setDeleteTx(tx)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {filtered.length > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            Menampilkan{" "}
            {formatNumber((safePage - 1) * pageSize + 1)}–
            {formatNumber(Math.min(safePage * pageSize, filtered.length))} dari{" "}
            {formatNumber(filtered.length)} transaksi
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Halaman sebelumnya"
              disabled={safePage <= 1}
              onClick={() => setPage(safePage - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {getPageItems(safePage, totalPages).map((p, i) =>
              p === "…" ? (
                <span
                  key={`ellipsis-${i}`}
                  className="px-1.5 text-sm text-muted-foreground"
                >
                  …
                </span>
              ) : (
                <Button
                  key={p}
                  variant={p === safePage ? "default" : "outline"}
                  size="icon-sm"
                  aria-current={p === safePage ? "page" : undefined}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Halaman berikutnya"
              disabled={safePage >= totalPages}
              onClick={() => setPage(safePage + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            Baris per halaman
            <Select
              value={String(pageSize)}
              onValueChange={(v: string | null) => {
                setPageSize(Number(v ?? 10));
                setPage(1);
              }}
              items={[10, 25, 50].map((n) => ({
                value: String(n),
                label: String(n),
              }))}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 25, 50].map((n) => (
                  <SelectItem key={n} value={String(n)} label={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      )}

      {/* Create dialog */}
      <TransactionDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        mode="create"
        categories={categories}
        currency={currency}
      />

      {/* Edit dialog */}
      {editTx && (
        <TransactionDialog
          open={!!editTx}
          onOpenChange={(o) => (o ? null : setEditTx(null))}
          mode="edit"
          transaction={editTx}
          categories={categories}
          currency={currency}
        />
      )}

      {/* Konfirmasi hapus */}
      <AlertDialog
        open={!!deleteTx}
        onOpenChange={(o) => !o && setDeleteTx(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTx
                ? `Transaksi ${formatMoney(deleteTx.amount, currency)}${
                    deleteTx.description ? ` — ${deleteTx.description}` : ""
                  } akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              onClick={() => setDeleteTx(null)}
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

function methodLabel(method: string) {
  const map: Record<string, string> = {
    CASH: "Tunai",
    BANK: "Bank",
    E_WALLET: "Dompet Digital",
    CARD: "Kartu",
  };
  return map[method] ?? method;
}

function SortableHead({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const active = activeKey === sortKey;
  const Icon = active
    ? dir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;
  return (
    <TableHead
      className={className}
      aria-sort={
        active ? (dir === "asc" ? "ascending" : "descending") : undefined
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={
          "inline-flex items-center gap-1 text-sm font-medium transition-colors " +
          (active
            ? "text-foreground"
            : "text-muted-foreground hover:text-foreground")
        }
      >
        {label}
        <Icon
          className={
            "h-3.5 w-3.5 " + (active ? "" : "text-muted-foreground/60")
          }
        />
      </button>
    </TableHead>
  );
}

function getPageItems(current: number, total: number): Array<number | "…"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: Array<number | "…"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < total - 1) items.push("…");
  items.push(total);
  return items;
}
