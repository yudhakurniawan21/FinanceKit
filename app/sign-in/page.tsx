"use client";

import { Suspense, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Logo, LogoMark } from "@/components/layout/logo";
import { ArrowLeft, Check, Sparkles } from "lucide-react";

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInContent />
    </Suspense>
  );
}

const BULLETS = [
  "Net worth & snapshot harian otomatis",
  "Transaksi berulang dicatat otomatis",
  "Anggaran per kategori, transfer antar akun, AI insights",
];

const BARS = [35, 55, 40, 70, 50, 85];

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = useSession();
  // Hanya izinkan callbackUrl internal (cegah open redirect ke situs luar).
  const callback = (() => {
    const raw = searchParams.get("callbackUrl") || "/dashboard";
    return raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
      ? raw
      : "/dashboard";
  })();

  // Jika sudah terautentikasi, lanjutkan ke halaman yang dituju.
  useEffect(() => {
    if (!isPending && session?.user) {
      router.replace(callback);
    }
  }, [isPending, session, router, callback]);

  if (isPending) return null;
  if (session?.user) return null;

  async function handleGoogleSignIn() {
    await signIn.social({
      provider: "google",
      callbackURL: callback,
    });
  }

  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-2">
      {/* ── Panel brand (ink) ─────────────────────────── */}
      <section className="relative hidden overflow-hidden bg-[#0e0f0c] p-10 text-[#e8ebe6] lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_0%,rgba(159,232,112,0.16),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_40%_at_0%_100%,rgba(56,200,255,0.08),transparent_70%)]" />

        <Link href="/" className="fk-hero-in relative w-fit text-white">
          <Logo markClassName="h-8 w-8" />
        </Link>

        <div className="relative space-y-8">
          <div className="space-y-4">
            <h1
              className="fk-hero-in text-display-sm font-display tracking-tight"
              style={{ animationDelay: "0.1s" }}
            >
              Kelola keuangan pribadi{" "}
              <span className="text-[#9fe870]">dengan tenang</span>
            </h1>
            <p
              className="fk-hero-in max-w-md leading-relaxed text-white/60"
              style={{ animationDelay: "0.2s" }}
            >
              Satu aplikasi privat untuk mencatat, merencanakan, dan memahami
              uangmu.
            </p>
          </div>

          <ul className="space-y-3">
            {BULLETS.map((item, i) => (
              <li
                key={item}
                className="fk-hero-in flex items-center gap-3 text-sm text-white/80"
                style={{ animationDelay: `${0.25 + i * 0.08}s` }}
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9fe870] text-[#0e0f0c]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div
            className="fk-hero-in max-w-sm rounded-2xl bg-[#163300] p-5 ring-1 ring-white/15"
            style={{ animationDelay: "0.5s" }}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/60">Saldo bulan ini</p>
                <p className="text-xl font-bold text-white">Rp 6.800.000</p>
              </div>
              <span className="rounded-full bg-[#9fe870]/15 px-2.5 py-1 text-[11px] font-semibold text-[#9fe870]">
                +12,4%
              </span>
            </div>
            <div className="mt-4 flex h-16 items-end gap-1.5">
              {BARS.map((h, i) => (
                <div
                  key={i}
                  className={
                    "fk-bar flex-1 rounded-t " +
                    (i % 2 === 0 ? "bg-[#9fe870]" : "bg-white/20")
                  }
                  style={{ height: `${h}%`, animationDelay: `${0.7 + i * 0.09}s` }}
                />
              ))}
            </div>
          </div>
        </div>

        <p className="fk-hero-in relative text-sm text-white/40" style={{ animationDelay: "0.6s" }}>
          © 2026 FinansialKit
        </p>
      </section>

      {/* ── Panel form (light) ────────────────────────── */}
      <section className="relative flex items-center justify-center bg-background p-4 sm:p-8">
        <div className="absolute right-4 top-4 z-10">
          <ThemeToggle />
        </div>

        <div className="fk-hero-in w-full max-w-sm space-y-8">
          {/* Heading mobile */}
          <div className="flex flex-col items-center gap-3 text-center lg:hidden">
            <LogoMark className="h-14 w-14" />
            <h1 className="font-display text-2xl tracking-tight">
              Masuk ke FinansialKit
            </h1>
          </div>

          <div className="rounded-3xl bg-card p-6 ring-1 ring-border sm:p-8">
            <h2 className="text-lg font-semibold">Selamat datang kembali</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Masuk dengan akun Google untuk melanjutkan mencatat keuanganmu.
            </p>
            <Button
              variant="outline"
              className="mt-6 w-full gap-2"
              onClick={handleGoogleSignIn}
            >
              <GoogleLogo />
              <span>Masuk dengan Google</span>
            </Button>
            <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Tanpa kartu kredit. Data tetap milikmu.
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke beranda
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

// Ikon "G" berwarna Google (tanpa SVG eksternal yang rapuh).
function GoogleLogo() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-[3px] bg-gradient-to-br from-[#EA4335] via-[#FBBC01] to-[#4285F4] text-[10px] font-bold text-white">
      G
    </span>
  );
}