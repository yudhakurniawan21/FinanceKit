// ── Kalkulator Bunga Majemuk & Simulasi Investasi ────────────────────────
// Mesin murni (pure functions) — tanpa IO, aman dipakai server & client.
// Semua nilai uang dalam major unit (desimal sesuai precision / minor unit
// mata uang). Pembulatan dilakukan tiap bulan agar deret tetap akurat.

export interface CompoundInput {
  /** Modal awal (major unit). */
  principal: number;
  /** Setoran rutin per bulan (major unit). */
  monthlyContribution: number;
  /** Imbal hasil tahunan (% per tahun, mis. 8.5). */
  annualRatePct: number;
  /** Jangka waktu dalam tahun (1–50). */
  years: number;
  /** Laju inflasi tahunan (%) untuk nilai riil. */
  inflationPct: number;
  /** Jumlah desimal pembulatan (minor unit mata uang). */
  precision: number;
}

export interface CompoundYearPoint {
  year: number;
  /** Total modal yang sudah disetor s.d. akhir tahun ini. */
  contributions: number;
  /** Total imbal hasil / bunga (major). */
  interest: number;
  /** Nilai nominal akhir tahun (major). */
  total: number;
  /** Nilai riil terkoreksi inflasi (major). */
  realValue: number;
}

export interface CompoundResult {
  series: CompoundYearPoint[];
  totalContributions: number;
  totalInterest: number;
  finalValue: number;
  finalRealValue: number;
  /** Daya beli akhir relatif terhadap nilai nominal (%). */
  purchasingPowerPct: number;
}

export function simulateCompound(input: CompoundInput): CompoundResult {
  const p = Math.max(0, Math.min(8, Math.round(input.precision)));
  const years = Math.max(1, Math.min(50, Math.round(input.years || 1)));
  const rate = Math.max(0, input.annualRatePct || 0) / 100;
  const inflation = Math.max(0, input.inflationPct || 0) / 100;
  const principal = Math.max(0, input.principal || 0);
  const monthly = Math.max(0, input.monthlyContribution || 0);
  const monthlyRate = rate / 12;
  const round = (v: number) => Math.round(v * 10 ** p) / 10 ** p;

  // Konvensi: setoran di akhir bulan (ordinary annuity) — sisa bulan
  // terlebih dahulu berbunga, lalu ditambahkan setoran.
  let balance = round(principal);
  let contributions = round(principal);
  const series: CompoundYearPoint[] = [];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      balance = round(balance * (1 + monthlyRate));
      balance = round(balance + monthly);
      contributions = round(contributions + monthly);
    }
    const interest = round(balance - contributions);
    const realValue = round(balance / (1 + inflation) ** y);
    series.push({
      year: y,
      contributions: round(contributions),
      interest,
      total: balance,
      realValue,
    });
  }

  const last = series[series.length - 1];
  const finalValue = last?.total ?? principal;
  const finalRealValue = last?.realValue ?? principal;

  return {
    series,
    totalContributions: last?.contributions ?? principal,
    totalInterest: last?.interest ?? 0,
    finalValue,
    finalRealValue,
    purchasingPowerPct:
      finalValue > 0 ? (finalRealValue / finalValue) * 100 : 0,
  };
}

// Skema instrumen umum — dipakai sebagai preset cepat di UI.
export interface InstrumentPreset {
  key: string;
  label: string;
  annualRatePct: number;
  description: string;
}

export const COMMON_INSTRUMENTS: InstrumentPreset[] = [
  { key: "money_market", label: "Reksa Dana Pasar Uang", annualRatePct: 5, description: "Rendah risiko" },
  { key: "bonds", label: "Obligasi / SBN", annualRatePct: 6.5, description: "Menengah" },
  { key: "stocks", label: "Indeks Saham", annualRatePct: 10, description: "Tinggi-tinggi, jangka panjang" },
];