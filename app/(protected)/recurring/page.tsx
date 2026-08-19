import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { ensureDefaultWallet, listWallets } from "@/lib/db/wallets";
import { listRecurring } from "@/lib/db/recurring";
import prisma from "@/lib/prisma";
import { RecurringManager } from "@/components/recurring/recurring-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/recurring");
  }

  const [categories, wallets, recurring, liabilities] = await Promise.all([
    ensureDefaultCategories(user.user.id),
    ensureDefaultWallet(user.user.id).then(() => listWallets(user.user.id)),
    listRecurring(user.user.id),
    prisma.netWorthItem.findMany({
      where: { userId: user.user.id, type: "LIABILITY" },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navRecurring")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("recurringPageDesc")}
        </p>
      </div>
      <RecurringManager
        recurring={recurring}
        categories={categories}
        wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
        liabilities={liabilities}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
      />
    </div>
  );
}