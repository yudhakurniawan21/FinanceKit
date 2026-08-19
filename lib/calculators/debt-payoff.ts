// ── Simulasi Pelunasan Utang (Minimum / Snowball / Avalanche) ────────────
// Mesin murni (pure functions) — tanpa IO. Nilai uang dalam major unit
// dengan pembulatan per bulan (precision = minor unit mata uang).
//
// Bunga dibayar lebih dulu dari setiap pembayaran; sisa pembayaran
// mengurangi pokok. Strategi:
//  - minimum   : hanya cicilan minimum (baseline).
//  - snowball  : dana ekstra ke utang saldo terkecil (kemenangan psikologis).
//  - avalanche : dana ekstra ke utang berbunga tertinggi (optimal matematis).

export type PayoffStrategy = "minimum" | "snowball" | "avalanche";

export interface DebtInput {
  id: string;
  name: string;
  /** Sisa pokok (major unit). */
  balance: number;
  /** Suku bunga tahunan (%, mis. 12.5). */
  annualRatePct: number;
  /** Cicilan minimum per bulan (major unit). */
  minPayment: number;
}

export interface DebtSchedulePoint {
  month: number;
  /** Sisa total seluruh utang setelah bulan ini (major). */
  totalRemaining: number;
  paid: boolean;
}

export interface PayoffResult {
  strategy: PayoffStrategy;
  paidOff: boolean;
  /** Jumlah bulan sampai lunas (0 jika tidak lunas dalam MAX_MONTHS). */
  months: number;
  totalPaid: number;
  totalInterest: number;
  schedule: DebtSchedulePoint[];
  /** Urutan id utang yang lunas (empty jika tidak ada yang lunas). */
  payoffOrder: string[];
}

export const MAX_MONTHS = 720; // 60 tahun — batas aman simulasi

interface DebtState extends DebtInput {
  monthlyRate: number;
  paid: boolean;
  interestDue: number;
  interestPaid: number;
}

function buildStates(debts: DebtInput[], precision: number): DebtState[] {
  const p = Math.max(0, Math.min(8, Math.round(precision)));
  return debts.map((d) => ({
    ...d,
    monthlyRate: Math.max(0, d.annualRatePct || 0) / 100 / 12,
    paid: false,
    interestDue: 0,
    interestPaid: 0,
    ...(p >= 0 ? {} : {}),
  }));
}

/**
 * Simulasi satu strategi. `extraPerMonth` hanya dipakai oleh snowball &
 * avalanche (minimum = 0).
 */
export function simulatePayoff(
  debts: DebtInput[],
  strategy: PayoffStrategy,
  extraPerMonth: number,
  precision = 2
): PayoffResult | null {
  if (debts.length === 0) return null;

  const p = Math.max(0, Math.min(8, Math.round(precision)));
  const round = (v: number) => Math.round(v * 10 ** p) / 10 ** p;
  const extra = strategy === "minimum" ? 0 : Math.max(0, extraPerMonth || 0);

  const states = buildStates(debts, p);
  const schedule: DebtSchedulePoint[] = [];
  const payoffOrder: string[] = [];
  let totalPaid = 0;
  let totalInterest = 0;
  let paidOff = false;

  const remainingOf = (d: DebtState) => {
    const interestLeft = Math.max(0, d.interestDue - d.interestPaid);
    return interestLeft + d.balance;
  };

  const allocate = (d: DebtState, amount: number) => {
    const pay = Math.min(amount, remainingOf(d));
    if (pay <= 0) return;
    const interestLeft = Math.max(0, d.interestDue - d.interestPaid);
    const interestPortion = Math.min(pay, interestLeft);
    d.interestPaid += interestPortion;
    d.balance = round(d.balance - (pay - interestPortion));
    totalPaid = round(totalPaid + pay);
    totalInterest = round(totalInterest + interestPortion);
    if (d.balance <= 0 && !d.paid) {
      d.paid = true;
      payoffOrder.push(d.id);
    }
  };

  for (let month = 1; month <= MAX_MONTHS; month++) {
    const active = states.filter((d) => !d.paid);
    if (active.length === 0) {
      paidOff = true;
      break;
    }

    // 1. Akumulasi bunga bulan ini (pokok aktif berbunga).
    for (const d of active) {
      d.interestDue = round(d.balance * d.monthlyRate);
      d.interestPaid = 0;
    }

    if (strategy === "minimum") {
      // Tiap utang membayar cicilan minimumnya sendiri.
      for (const d of active) {
        allocate(d, Math.max(0, d.minPayment || 0));
      }
    } else {
      // Snowball/avalanche: total dana = cicilan minimum semua utang aktif
      // + dana ekstra. Urutan fokus: saldo terkecil (snowball) atau bunga
      // tertinggi (avalanche).
      const order = [...active].sort(
        strategy === "avalanche"
          ? (a, b) => b.annualRatePct - a.annualRatePct
          : (a, b) => a.balance - b.balance
      );
      let budget = round(
        extra + active.reduce((s, d) => s + Math.max(0, d.minPayment || 0), 0)
      );

      // Pass 1: cicilan minimum untuk semua utang.
      for (const d of order) {
        if (budget <= 0) break;
        const pay = Math.min(budget, Math.max(0, d.minPayment || 0));
        allocate(d, pay);
        budget = round(budget - pay);
      }
      // Pass 2: sisa dana ke utang fokus pertama yang belum lunas.
      for (const d of order) {
        if (budget <= 0) break;
        if (d.paid) continue;
        allocate(d, budget);
        budget = round(budget - Math.min(budget, remainingOf(d)));
        if (d.paid) continue;
      }
    }

    const totalRemaining = round(
      states.reduce((s, d) => s + (d.paid ? 0 : remainingOf(d)), 0)
    );
    schedule.push({
      month,
      totalRemaining,
      paid: states.every((d) => d.paid),
    });
  }

  const last = schedule[schedule.length - 1];
  return {
    strategy,
    paidOff,
    months: paidOff ? (last?.month ?? 0) : 0,
    totalPaid: round(totalPaid),
    totalInterest: round(totalInterest),
    schedule,
    payoffOrder,
  };
}

export interface PayoffComparison {
  minimum: PayoffResult | null;
  snowball: PayoffResult | null;
  avalanche: PayoffResult | null;
}

export function comparePayoffStrategies(
  debts: DebtInput[],
  extraPerMonth: number,
  precision = 2
): PayoffComparison {
  return {
    minimum: simulatePayoff(debts, "minimum", 0, precision),
    snowball: simulatePayoff(debts, "snowball", extraPerMonth, precision),
    avalanche: simulatePayoff(debts, "avalanche", extraPerMonth, precision),
  };
}

// Format durasi bulan → "1 tahun 4 bulan" (angka saja; label dipisah di UI).
export function monthsToParts(months: number): { years: number; months: number } {
  return { years: Math.floor(months / 12), months: months % 12 };
}