import { getCurrentUser } from "@/lib/session";
import { ensureDefaultWallet, listWallets, listTransfers } from "@/lib/db/wallets";
import { AccountManager } from "@/components/accounts/account-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function AccountsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/accounts");
  }

  const [wallets, transfers] = await Promise.all([
    ensureDefaultWallet(user.user.id).then(() => listWallets(user.user.id)),
    listTransfers(user.user.id),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navAccounts")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("accountsPageDesc")}
        </p>
      </div>
      <AccountManager
        wallets={wallets}
        transfers={transfers}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
      />
    </div>
  );
}