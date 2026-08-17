import Link from "next/link";
import { ArrowRight, Check, History, Scale } from "lucide-react";

const LINE =
  "M0,120 C60,104 90,112 130,88 C170,64 210,80 250,58 C290,36 332,52 400,26";
const AREA = `${LINE} L400,150 L0,150 Z`;

const BULLETS = [
  "Aset likuid tersinkron otomatis dari saldo akunmu",
  "Tambahkan aset & kewajiban manual — properti, kendaraan, cicilan",
  "Snapshot harian tersimpan otomatis, grafik tren 90 hari",
];

const LEGEND = [
  { dot: "bg-[#9fe870]", label: "Total Aset", value: "+Rp 52,4 jt" },
  { dot: "bg-[#ff6b6b]", label: "Total Kewajiban", value: "-Rp 5,6 jt" },
  { dot: "bg-white", label: "Saldo Bersih", value: "Rp 46,8 jt" },
];

export function NetWorthSection() {
  return (
    <section className="relative overflow-hidden bg-[#0e0f0c] text-[#e8ebe6]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_75%_30%,rgba(159,232,112,0.14),transparent_70%)]" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
        <div className="space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#9fe870]/15 px-3 py-1 text-sm font-semibold text-[#9fe870]">
            <Scale className="h-4 w-4" />
            Net Worth
          </span>
          <h2 className="text-display-sm font-display tracking-tight">
            Seluruh kekayaanmu dalam{" "}
            <span className="text-[#9fe870]">satu angka</span>
          </h2>
          <p className="max-w-lg leading-relaxed text-white/60">
            Total aset dikurangi kewajiban — dihitung otomatis dan dipantau
            setiap hari, sehingga kamu selalu tahu posisi keuanganmu tanpa
            menunggu akhir bulan.
          </p>
          <ul className="space-y-3">
            {BULLETS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#9fe870] text-[#0e0f0c]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-white/80">{item}</span>
              </li>
            ))}
          </ul>
          <Link
            href="/net-worth"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9fe870] underline-offset-4 hover:underline"
          >
            Buka halaman Net Worth
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <div className="fk-float absolute -top-5 right-4 z-10 flex items-center gap-2 rounded-2xl bg-[#163300] px-4 py-2 text-sm shadow-xl ring-1 ring-white/15">
            <History className="h-4 w-4 text-[#9fe870]" />
            <span className="text-white/70">Snapshot harian</span>
            <span className="font-semibold text-[#9fe870]">otomatis</span>
          </div>

          <div className="rounded-3xl bg-[#163300] p-6 ring-1 ring-white/15 sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-white/60">Saldo bersih hari ini</p>
                <p className="text-2xl font-bold text-white">Rp 46,8 juta</p>
              </div>
              <span className="rounded-full bg-[#9fe870]/15 px-3 py-1 text-xs font-semibold text-[#9fe870]">
                +12,4% · 90 hari
              </span>
            </div>

            <svg
              viewBox="0 0 400 160"
              className="mt-6 w-full"
              role="img"
              aria-label="Grafik tren net worth 90 hari"
            >
              <defs>
                <linearGradient id="fk-area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#9fe870" stopOpacity="0.28" />
                  <stop offset="1" stopColor="#9fe870" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4">
                {[30, 60, 90, 120].map((y) => (
                  <line key={y} x1="0" x2="400" y1={y} y2={y} />
                ))}
              </g>
              <path className="fk-chart-area" d={AREA} fill="url(#fk-area)" />
              <path
                className="fk-chart-line"
                d={LINE}
                fill="none"
                stroke="#9fe870"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle
                className="fk-chart-dot"
                cx="400"
                cy="26"
                r="5"
                fill="#9fe870"
              />
              <circle cx="400" cy="26" r="2" fill="#0e0f0c" />
            </svg>
            <div className="mt-2 flex justify-between text-xs text-white/50">
              <span>3 bln lalu</span>
              <span>1 bln lalu</span>
              <span>Hari ini</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            {LEGEND.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-2xl bg-[#163300] px-4 py-2 text-sm ring-1 ring-white/15"
              >
                <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
                <span className="text-white/70">{item.label}</span>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}