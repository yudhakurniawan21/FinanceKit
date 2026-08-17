import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { ensureDefaultWallet, listWallets } from "@/lib/db/wallets";
import {
  getNetWorthSummary,
  listNetWorthSnapshots,
  recordNetWorthSnapshot,
} from "@/lib/db/net-worth";
import { NetWorthManager } from "@/components/net-worth/net-worth-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function NetWorthPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/net-worth");
  }

  const [summary, snapshots, wallets] = await Promise.all([
    getNetWorthSummary(user.user.id),
    listNetWorthSnapshots(user.user.id, 90),
    ensureDefaultCategories(user.user.id)
      .then(() => ensureDefaultWallet(user.user.id))
      .then(() => listWallets(user.user.id)),
    // Pastikan snapshot hari ini ada (idempoten) agar grafik punya titik awal.
    recordNetWorthSnapshot(user.user.id),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navNetWorth")}</h1>
        <p className="text-sm text-muted-foreground">{t("netWorthPageDesc")}</p>
      </div>
      <NetWorthManager
        summary={summary}
        snapshots={snapshots}
        wallets={wallets}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
      />
    </div>
  );
}