"use client";

import { CountUp } from "@/components/landing/count-up";
import { Repeat, Scale } from "lucide-react";

const BARS = [35, 55, 40, 70, 50, 85];
const MONTHS = ["Mar", "Apr", "Mei", "Jun", "Jul", "Agu"];

export function HeroMock() {
  return (
    <div className="relative">
      <div className="fk-float absolute -top-6 -left-2 z-10 flex items-center gap-2 rounded-2xl bg-[#163300] px-4 py-2.5 text-sm shadow-2xl ring-1 ring-white/15 sm:-left-8">
        <Scale className="h-4 w-4 text-[#9fe870]" />
        <span className="text-white/70">Net Worth</span>
        <span className="font-bold text-[#9fe870]">+Rp 45,2 jt</span>
      </div>
      <div className="fk-float-slow absolute -right-2 -bottom-5 z-10 flex items-center gap-2 rounded-2xl bg-[#163300] px-4 py-2.5 text-sm shadow-2xl ring-1 ring-white/15 sm:-right-6">
        <Repeat className="h-4 w-4 text-[#38c8ff]" />
        <span className="text-white/70">Tagihan listrik</span>
        <span className="font-semibold text-white">otomatis tercatat</span>
      </div>

      <div className="rounded-3xl bg-[#163300] p-6 shadow-[0_24px_80px_-24px_rgba(159,232,112,0.35)] ring-1 ring-white/15 sm:p-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Saldo Total</p>
            <p className="text-2xl font-bold text-white sm:text-3xl">
              <CountUp end={6800000} prefix="Rp " />
            </p>
          </div>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            Agu 2026
          </span>
        </div>

        <div className="mt-6 flex h-28 items-end gap-2">
          {BARS.map((h, i) => (
            <div
              key={i}
              className={
                "fk-bar flex-1 rounded-t-md " +
                (i % 2 === 0 ? "bg-[#9fe870]" : "bg-white/20")
              }
              style={{ height: `${h}%`, animationDelay: `${0.6 + i * 0.09}s` }}
            />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-white/50">
          {MONTHS.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>

        <div className="mt-6 space-y-3 border-t border-white/10 pt-5">
          {[
            { dot: "bg-[#9fe870]", label: "Gaji Bulanan", value: "+ Rp 8.500.000", positive: true },
            { dot: "bg-[#ff6b6b]", label: "Makanan & Minum", value: "- Rp 1.250.000" },
            { dot: "bg-[#ffd11a]", label: "Transportasi", value: "- Rp 450.000" },
          ].map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className={`h-2.5 w-2.5 rounded-full ${row.dot}`} />
                <span className="text-sm text-white/80">{row.label}</span>
              </div>
              <span
                className={
                  "text-sm font-semibold " +
                  (row.positive ? "text-[#9fe870]" : "text-[#ff6b6b]")
                }
              >
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}