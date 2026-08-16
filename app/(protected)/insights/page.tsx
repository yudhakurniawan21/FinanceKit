import { getCurrentUser } from "@/lib/session";
import {
  sumByType,
  expenseByCategory,
  listTransactions,
} from "@/lib/db/transactions";
import { startOfMonth, endOfMonth } from "@/lib/formatting";
import { formatMoney } from "@/lib/currencies";
import { InsightPanel } from "@/components/insights/insight-panel";
import { redirect } from "next/navigation";

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/insights");
  }

  const currency = user.settings?.currency ?? "IDR";
  const now = new Date();
  const mStart = startOfMonth(now);
  const mEnd = endOfMonth(now);

  const [stats, byCat, recent] = await Promise.all([
    sumByType(user.user.id, mStart, mEnd),
    expenseByCategory(user.user.id, mStart, mEnd),
    listTransactions(user.user.id, { start: mStart, end: mEnd, limit: 8 }),
  ]);

  const typeLabel = (t: string) =>
    t === "INCOME" ? "pemasukan" : "pengeluaran";

  const context = [
    `Ringkasan keuangan bulan ini (${currency}):`,
    `- Pemasukan: ${formatMoney(stats.income, currency)}`,
    `- Pengeluaran: ${formatMoney(stats.expense, currency)}`,
    `- Total pengeluaran per kategori: ${byCat
      .map((c) => `${c.name} (${formatMoney(c.amount, currency)})`)
      .join(", ") || "n/a"}`,
    `- Transaksi terbaru: ${recent
      .map(
        (t) =>
          `${typeLabel(t.type)} ${formatMoney(t.amount, currency)}${t.description ? ` (${t.description})` : ""}`
      )
      .join("; ") || "n/a"}`,
  ].join("\n");

  const presetPrompts = [
    {
      label: "Ringkasan Bulan",
      prompt:
        "Berikan ringkasan apa saja yang terjadi dengan keuangan bulan ini (3-4 poin): pola pengeluaran, kategori terbesar, dan apakah saya akan berada di atas atau di bawah anggaran. Jawab singkat dalam Bahasa Indonesia.",
    },
    {
      label: "Saran Hemat",
      prompt:
        "Berikan 3 saran hemat yang nyata berdasarkan pola pengeluaran bulan ini. Fokus pada kategori dengan proporsi besar. Jawab dalam Bahasa Indonesia.",
    },
    {
      label: "Cek vs Anggaran",
      prompt:
        "Bandingkan total pengeluaran bulan ini terhadap anggaran yang telah ditetapkan. Beri peringatan jika ada kategori melebihi anggaran. Jawab singkat dalam Bahasa Indonesia.",
    },
  ];

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">AI Insights</h1>
        <p className="text-sm text-muted-foreground">
          Insight keuangan berbasis data transaksi Anda — memakai Poolside
          (poolside/laguna-s-2.1).
        </p>
      </div>
      <InsightPanel context={context} presetPrompts={presetPrompts} />
    </div>
  );
}
