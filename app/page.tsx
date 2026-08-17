import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo, LogoMark } from "@/components/layout/logo";
import { Reveal } from "@/components/landing/reveal";
import { CountUp } from "@/components/landing/count-up";
import { HeroMock } from "@/components/landing/hero-mock";
import { Marquee } from "@/components/landing/marquee";
import { NetWorthSection } from "@/components/landing/net-worth-section";
import {
  ReceiptText,
  Target,
  Repeat,
  Landmark,
  Sparkles,
  ArrowRight,
  Check,
  TrendingUp,
  TrendingDown,
  Scale,
} from "lucide-react";

const FEATURES = [
  {
    icon: <ReceiptText className="h-5 w-5" />,
    title: "Catat Transaksi",
    desc: "Pemasukan dan pengeluaran dalam hitungan detik. Pilih kategori, akun, dan metode pembayaran — lalu cari kembali kapan pun.",
  },
  {
    icon: <Target className="h-5 w-5" />,
    title: "Anggaran per Kategori",
    desc: "Tetapkan batas belanja untuk tiap kategori dan pantau sisa anggaran dengan progress bar real-time sebelum bulan berakhir.",
  },
  {
    icon: <Repeat className="h-5 w-5" />,
    title: "Transaksi Berulang",
    desc: "Gaji, langganan, dan tagihan dicatat otomatis sesuai jadwal. Nyalakan atau matikan dalam satu ketukan.",
  },
  {
    icon: <Landmark className="h-5 w-5" />,
    title: "Akun & Transfer",
    desc: "Dompet, rekening bank, e-wallet, hingga kartu kredit — lengkap dengan transfer antar akun yang langsung tercatat.",
  },
  {
    icon: <Scale className="h-5 w-5" />,
    title: "Net Worth",
    desc: "Total aset dikurangi kewajiban dalam satu angka, dengan grafik tren 90 hari dan snapshot harian otomatis.",
    href: "/net-worth",
    cta: "Buka halaman Net Worth",
  },
  {
    icon: <Sparkles className="h-5 w-5" />,
    title: "AI Insights",
    desc: "Ringkasan dan rekomendasi hemat otomatis dari datamu — dihasilkan langsung oleh AI, bukan tebakan.",
    href: "/insights",
    cta: "Pelajari AI Insights",
  },
];

const PRIVACY_POINTS = [
  "Login aman dengan akun Google",
  "Tren kekayaan & net worth dipantau otomatis setiap hari",
  "Transaksi berulang dicatat tanpa perlu diingat-ingat",
  "Bisa dipakai penuh di ponsel maupun desktop",
];

const STATS = [
  { end: 100, suffix: "%", label: "Datamu tetap milikmu — tanpa iklan, tanpa penjualan data" },
  { end: 6, suffix: "", label: "Fitur inti yang saling terhubung" },
  { end: 90, suffix: " hari", label: "Riwayat tren net worth tersimpan otomatis" },
  { end: 3, suffix: "", label: "Bahasa antarmuka" },
];

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-foreground">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/sign-in">
              <Button size="sm">
                Mulai Gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero (ink) ──────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0e0f0c] text-[#e8ebe6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_55%_at_85%_10%,rgba(159,232,112,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_40%_at_5%_90%,rgba(56,200,255,0.08),transparent_70%)]" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div className="space-y-6">
            <span className="fk-hero-in inline-flex items-center gap-1.5 rounded-full bg-[#9fe870]/15 px-3 py-1 text-sm font-semibold text-[#9fe870] ring-1 ring-[#9fe870]/30">
              <Sparkles className="h-4 w-4" />
              Pencatatan keuangan pribadi + AI insights
            </span>
            <h1
              className="fk-hero-in text-display-xl font-display tracking-tight"
              style={{ animationDelay: "0.1s" }}
            >
              Kelola keuangan pribadi{" "}
              <span className="text-[#9fe870]">dengan tenang</span>
            </h1>
            <p
              className="fk-hero-in max-w-lg text-lg leading-relaxed text-white/60"
              style={{ animationDelay: "0.2s" }}
            >
              Catat transaksi, atur anggaran per kategori, pantau net worth, dan
              biarkan transaksi berulang tercatat otomatis — semua privat dalam
              satu aplikasi yang sederhana dan cepat.
            </p>
            <div
              className="fk-hero-in flex flex-wrap items-center gap-3"
              style={{ animationDelay: "0.3s" }}
            >
              <Link href="/sign-in">
                <Button size="lg" className="bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad]">
                  Mulai Gratis
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#fitur">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-[#e8ebe6] hover:bg-white/10 hover:text-[#e8ebe6]"
                >
                  Lihat fitur
                </Button>
              </a>
            </div>
            <p
              className="fk-hero-in text-sm text-white/50"
              style={{ animationDelay: "0.4s" }}
            >
              Tanpa kartu kredit. Data tetap milikmu.
            </p>
          </div>

          <div className="fk-hero-in" style={{ animationDelay: "0.5s" }}>
            <HeroMock />
          </div>
        </div>
      </section>

      {/* ── Marquee (lime) ──────────────────────────────── */}
      <Marquee />

      {/* ── Features (light) ────────────────────────────── */}
      <section id="fitur" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <Reveal>
            <div className="max-w-2xl space-y-3">
              <h2 className="text-display-sm font-display tracking-tight">
                Semua yang kamu butuhkan untuk memahami uangmu
              </h2>
              <p className="text-muted-foreground">
                Dari mencatat sampai memantau kekayaan — enam fitur inti yang
                saling terhubung.
              </p>
            </div>
          </Reveal>

          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature, i) => (
              <Reveal key={feature.title} delay={(i % 3) * 90}>
                <FeatureCard {...feature} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Net Worth (ink) ─────────────────────────────── */}
      <NetWorthSection />

      {/* ── Privasi & statistik (sage) ──────────────────── */}
      <section className="bg-muted">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2">
            <Reveal>
              <div className="space-y-4">
                <h2 className="text-display-sm font-display tracking-tight">
                  Uangmu. Datamu. Privasimu.
                </h2>
                <p className="max-w-md leading-relaxed text-muted-foreground">
                  FinansialKit dirancang dengan satu prinsip: data keuangan
                  adalah hal paling pribadi yang kamu miliki.
                </p>
              </div>
            </Reveal>
            <div className="grid grid-cols-2 gap-x-8 gap-y-10">
              {STATS.map((stat, i) => (
                <Reveal key={stat.label} delay={i * 80}>
                  <div className="space-y-2">
                    <p className="font-display text-4xl tracking-tight sm:text-5xl">
                      <CountUp end={stat.end} suffix={stat.suffix} />
                    </p>
                    <p className="text-sm leading-snug text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <ul className="mt-14 grid gap-4 sm:grid-cols-2">
            {PRIVACY_POINTS.map((item, i) => (
              <Reveal key={item} delay={i * 70}>
                <li className="flex items-center gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-border">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-4 w-4" />
                  </span>
                  <span className="text-sm font-medium">{item}</span>
                </li>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── CTA (ink) ───────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#0e0f0c] text-[#e8ebe6]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_70%_at_50%_0%,rgba(159,232,112,0.14),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6 sm:py-24">
          <Reveal>
            <LogoMark className="h-16 w-16 drop-shadow-[0_0_24px_rgba(159,232,112,0.5)] sm:h-20 sm:w-20" />
          </Reveal>
          <Reveal delay={100}>
            <h2 className="max-w-xl text-display-sm font-display tracking-tight">
              Mulai catat keuanganmu{" "}
              <span className="text-[#9fe870]">hari ini</span>
            </h2>
          </Reveal>
          <Reveal delay={180}>
            <p className="max-w-md text-white/60">
              Lanjutkan mencatat dan lihat perkembangan keuanganmu — tanpa kartu
              kredit, data tetap milikmu.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <Link href="/sign-in">
              <Button size="lg" className="bg-[#9fe870] text-[#0e0f0c] hover:bg-[#cdffad]">
                Mulai Gratis
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── Footer (ink) ────────────────────────────────── */}
      <footer className="border-t border-white/10 bg-[#0e0f0c] text-white/60">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
          <Logo className="text-white" markClassName="h-8 w-8" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#9fe870]" />
              Pemasukan & pengeluaran
            </span>
            <span className="flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-[#9fe870]" />
              Net worth & anggaran
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4 text-[#ff6b6b]" />
              Transaksi berulang
            </span>
          </div>
          <p className="text-sm">© 2026 FinansialKit</p>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="group flex h-full flex-col rounded-3xl bg-card p-6 ring-1 ring-border transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_-16px_rgba(159,232,112,0.45)] hover:ring-[#9fe870]/60 sm:p-8">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-foreground transition-transform duration-300 group-hover:scale-110">
        {icon}
      </span>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
        {desc}
      </p>
      {href && cta && (
        <Link
          href={href}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
        >
          {cta}
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}