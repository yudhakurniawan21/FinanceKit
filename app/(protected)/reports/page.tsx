import { getCurrentUser } from "@/lib/session";
import {
  sumByType,
  categoryTotals,
  dailyTotals,
} from "@/lib/db/transactions";
import { monthBounds } from "@/lib/formatting";
import { ReportView } from "@/components/reports/report-view";
import { createTranslator, langCode } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/reports");
  }

  const currency = user.settings?.currency ?? "IDR";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  const sp = await searchParams;
  const rawMonth = sp.month ?? "";
  const valid = /^\d{4}-(0[1-9]|1[0-2])$/.test(rawMonth);

  let year: number;
  let monthIndex: number; // 0-based
  if (valid) {
    year = Number(rawMonth.slice(0, 4));
    monthIndex = Number(rawMonth.slice(5, 7)) - 1;
  } else {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
    }).formatToParts(now);
    const p: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") p[part.type] = part.value;
    }
    year = Number(p.year ?? now.getFullYear());
    monthIndex = Number(p.month ?? "01") - 1;
  }

  const anchor = new Date(Date.UTC(year, monthIndex, 15));
  const { start: mStart, end: mEnd } = monthBounds(anchor, timeZone);
  const prevAnchor = new Date(Date.UTC(year, monthIndex - 1, 15));
  const { start: pStart, end: pEnd } = monthBounds(prevAnchor, timeZone);

  const [cur, prev, expByCat, incByCat, daily] = await Promise.all([
    sumByType(user.user.id, mStart, mEnd),
    sumByType(user.user.id, pStart, pEnd),
    categoryTotals(user.user.id, mStart, mEnd, "EXPENSE"),
    categoryTotals(user.user.id, mStart, mEnd, "INCOME"),
    dailyTotals(user.user.id, mStart, mEnd),
  ]);

  const monthLabel = new Intl.DateTimeFormat(langCode(locale), {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(anchor);
  const prevLabel = new Intl.DateTimeFormat(langCode(locale), {
    timeZone,
    month: "long",
    year: "numeric",
  }).format(prevAnchor);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navReports")}</h1>
        <p className="text-sm text-muted-foreground">{t("reportsPageDesc")}</p>
      </div>
      <ReportView
        month={rawMonth || `${year}-${String(monthIndex + 1).padStart(2, "0")}`}
        monthLabel={monthLabel}
        prevLabel={prevLabel}
        cur={cur}
        prev={prev}
        expenseByCategory={expByCat}
        incomeByCategory={incByCat}
        daily={daily}
        currency={currency}
        locale={locale}
      />
    </div>
  );
}