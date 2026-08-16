import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  WalletCards,
  ReceiptText,
  Target,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Check,
  ArrowRight,
} from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <WalletCards className="h-5 w-5" />
            </span>
            <span className="text-base font-semibold">FinansialKit</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/sign-in">
              <Button variant="ghost" size="sm">
                Masuk
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero band (sage) ────────────────────────────── */}
      <section className="bg-muted">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3 py-1 text-sm font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Pencatatan keuangan pribadi + AI insights
            </span>
            <h1 className="text-display-xl font-display tracking-tight">
              Kelola keuangan pribadi dengan tenang
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              Catat transaksi, atur anggaran, dan dapatkan insight AI dari
              kebiasaan belanjamu — semua dalam satu aplikasi yang sederhana,
              cepat, dan privat.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/sign-in">
                <Button size="lg">
                  Mulai Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#fitur">
                <Button size="lg" variant="ghost">
                  Lihat fitur
                </Button>
              </a>
            </div>
            <p className="text-sm text-muted-foreground">
              Tanpa kartu kredit. Data tetap milikmu.
            </p>
          </div>

          {/* Mock dashboard card */}
          <div className="rounded-3xl bg-card p-6 shadow-[0_12px_40px_rgba(14,15,12,0.08)] ring-1 ring-border sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ringkasan Bulan Ini
                </p>
                <p className="text-2xl font-bold">Rp 6.800.000</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Agu 2026
              </span>
            </div>

            {/* Mini bar chart (CSS-only) */}
            <div className="mt-6 flex h-28 items-end gap-2">
              {[35, 55, 40, 70, 50, 85].map((h, i) => (
                <div
                  key={i}
                  className={
                    "flex-1 rounded-t-md " +
                    (i % 2 === 0 ? "bg-primary" : "bg-secondary")
                  }
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              {["Mar", "Apr", "Mei", "Jun", "Jul", "Agu"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>

            {/* Mock rows */}
            <div className="mt-6 space-y-3 border-t border-border pt-5">
              <MockRow
                color="bg-positive"
                label="Gaji Bulanan"
                value="+ Rp 8.500.000"
                positive
              />
              <MockRow
                color="bg-destructive"
                label="Makanan & Minum"
                value="- Rp 1.250.000"
              />
              <MockRow
                color="bg-warning"
                label="Transportasi"
                value="- Rp 450.000"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Features (white) ────────────────────────────── */}
      <section id="fitur" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-display-sm font-display tracking-tight">
              Semua yang kamu butuhkan untuk memahami uangmu
            </h2>
            <p className="text-muted-foreground">
              Tiga pilar sederhana — catat, rencanakan, pahami.
            </p>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <FeatureCard
              tone="sage"
              icon={<ReceiptText className="h-5 w-5" />}
              title="Catat Transaksi"
              desc="Pemasukan dan pengeluaran dalam hitungan detik. Kategorikan, beri metode pembayaran, dan cari kembali dengan mudah."
            />
            <FeatureCard
              tone="white"
              icon={<Target className="h-5 w-5" />}
              title="Anggaran Bulanan"
              desc="Tetapkan anggaran per kategori dan pantau sisanya secara real-time sebelum bulan berakhir."
            />
            <FeatureCard
              tone="green"
              icon={<Sparkles className="h-5 w-5" />}
              title="AI Insights"
              desc="Ringkasan dan rekomendasi hemat otomatis dari datamu — dihasilkan langsung oleh AI, bukan tebakan."
              cta
            />
          </div>
        </div>
      </section>

      {/* ── Dark polarity band ──────────────────────────── */}
      <section className="bg-foreground text-background">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="space-y-4">
            <h2 className="text-display-sm font-display tracking-tight text-primary">
              Uangmu. Datamu. Privasimu.
            </h2>
            <p className="leading-relaxed text-background/70">
              FinansialKit dirancang dengan satu prinsip: data keuangan adalah
              hal paling pribadi yang kamu miliki.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              "Login aman dengan akun Google",
              "Analisis otomatis untuk kebiasaan belanja",
              "Rekomendasi hemat yang bisa langsung diterapkan",
              "Bisa dipakai penuh di ponsel maupun desktop",
            ].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="h-4 w-4" />
                </span>
                <span className="text-background/90">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA band (sage) ─────────────────────────────── */}
      <section className="bg-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-20">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <WalletCards className="h-8 w-8" />
          </div>
          <h2 className="max-w-xl text-display-sm font-display tracking-tight">
            Sudah punya akun?
          </h2>
          <p className="max-w-md text-muted-foreground">
            Lanjutkan mencatat dan lihat perkembangan keuanganmu hari ini.
          </p>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              Masuk ke FinansialKit
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer (ink) ────────────────────────────────── */}
      <footer className="bg-foreground text-background/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <WalletCards className="h-4 w-4" />
            </span>
            <span className="font-semibold text-background">FinansialKit</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-primary" />
              Pemasukan & pengeluaran
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Anggaran terkendali
            </span>
          </div>
          <p className="text-sm">© 2026 FinansialKit</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  tone,
  icon,
  title,
  desc,
  cta,
}: {
  tone: "sage" | "white" | "green";
  icon: React.ReactNode;
  title: string;
  desc: string;
  cta?: boolean;
}) {
  const tones = {
    sage: "bg-muted",
    white: "bg-card ring-1 ring-border",
    green: "bg-primary/15",
  } as const;
  return (
    <div
      className={
        "group rounded-3xl p-6 transition-transform hover:-translate-y-1 sm:p-8 " +
        tones[tone]
      }
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-card text-foreground ring-1 ring-border">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
      {cta && (
        <Link
          href="/insights"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
        >
          Pelajari AI Insights
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function MockRow({
  color,
  label,
  value,
  positive,
}: {
  color: string;
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2.5">
        <span className={"h-2.5 w-2.5 rounded-full " + color} />
        <span className="text-sm">{label}</span>
      </div>
      <span
        className={
          "text-sm font-semibold " +
          (positive ? "text-positive" : "text-destructive")
        }
      >
        {value}
      </span>
    </div>
  );
}