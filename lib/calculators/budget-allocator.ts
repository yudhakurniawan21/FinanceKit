// Alokator Anggaran 50/30/20.
// Mesin murni (pure functions), tanpa IO.
// Semua nilai uang dalam satuan minor unit (integer) agar konsisten dengan
// penyimpanan minor-unit aplikasi. Pembulatan ke integer.

export type TierKey = "NEEDS" | "WANTS" | "SAVINGS";

export interface AllocCategory {
  id: string;
  name: string;
  spendMinor: number; // pengeluaran aktual bulan berjalan (minor unit)
  budgetMinor: number | null; // anggaran saat ini (minor unit)
  tier: TierKey | null;
  isSavings: boolean;
  isIncome: boolean;
}

export interface AllocTargets {
  needsMinor: number;
  wantsMinor: number;
  savingsMinor: number;
}

export interface AllocTotals {
  needsMinor: number;
  wantsMinor: number;
  savingsMinor: number;
  unclassifiedMinor: number;
}

export interface SuggestedBudget {
  categoryId: string;
  suggestedMinor: number;
}

export const TIER_RATIO: Record<TierKey, number> = {
  NEEDS: 0.5,
  WANTS: 0.3,
  SAVINGS: 0.2,
};

const TARGET_KEY: Record<TierKey, keyof AllocTargets> = {
  NEEDS: "needsMinor",
  WANTS: "wantsMinor",
  SAVINGS: "savingsMinor",
};

export function allocTargets(avgIncomeMinor: number): AllocTargets {
  return {
    needsMinor: Math.round(avgIncomeMinor * TIER_RATIO.NEEDS),
    wantsMinor: Math.round(avgIncomeMinor * TIER_RATIO.WANTS),
    savingsMinor: Math.round(avgIncomeMinor * TIER_RATIO.SAVINGS),
  };
}

export function allocTotals(categories: AllocCategory[]): AllocTotals {
  const totals: AllocTotals = {
    needsMinor: 0,
    wantsMinor: 0,
    savingsMinor: 0,
    unclassifiedMinor: 0,
  };
  for (const c of categories) {
    if (c.isIncome) continue;
    const tier = c.isSavings ? "SAVINGS" : c.tier;
    switch (tier) {
      case "NEEDS":
        totals.needsMinor += c.spendMinor;
        break;
      case "WANTS":
        totals.wantsMinor += c.spendMinor;
        break;
      case "SAVINGS":
        totals.savingsMinor += c.spendMinor;
        break;
      default:
        totals.unclassifiedMinor += c.spendMinor;
    }
  }
  return totals;
}

// Alokasi proporsional berdasar pengeluaran aktual per kategori dalam satu
// tier. Hanya tier konsumsi (NEEDS/WANTS) yang punya anggaran kategori di
// aplikasi — target SAVINGS dialokasikan langsung ke tabungan/goals.
// Kategori tanpa pengeluaran dilewati. Anggaran dibulatkan ke bawah;
// sisa target diberikan ke kategori terakhir dalam tier yang sama.
export function suggestBudgets(
  categories: AllocCategory[],
  avgIncomeMinor: number
): SuggestedBudget[] {
  const targets = allocTargets(avgIncomeMinor);
  const out: SuggestedBudget[] = [];

  for (const tier of ["NEEDS", "WANTS"] as const) {
    const tierCats = categories.filter(
      (c) => !c.isIncome && (c.isSavings ? "SAVINGS" : (c.tier ?? "")) === tier
    );
    if (tierCats.length === 0) continue;
    const tierSpend = tierCats.reduce((s, c) => s + c.spendMinor, 0);
    const target = targets[TARGET_KEY[tier]];
    if (tierSpend <= 0) continue;

    for (let i = 0; i < tierCats.length; i++) {
      const c = tierCats[i];
      const isLast = i === tierCats.length - 1;
      let suggested = Math.floor((target * c.spendMinor) / tierSpend);
      if (isLast) {
        const allocated = out
          .filter((o) => {
            const cat = tierCats.find((x) => x.id === o.categoryId);
            return cat != null;
          })
          .reduce((s, o) => s + o.suggestedMinor, 0);
        suggested = Math.max(0, target - allocated);
      }
      out.push({ categoryId: c.id, suggestedMinor: suggested });
    }
  }

  return out;
}
