import { getCurrentUser } from "@/lib/session";
import { ensureDefaultCategories } from "@/lib/db/categories";
import { listTransactions } from "@/lib/db/transactions";
import { TransactionManager } from "@/components/transactions/transaction-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function TransactionsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/transactions");
  }

  const [categories, transactions] = await Promise.all([
    ensureDefaultCategories(user.user.id),
    listTransactions(user.user.id),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navTransactions")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("txPageDesc")}
        </p>
      </div>
      <TransactionManager
        transactions={transactions}
        categories={categories}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
      />
    </div>
  );
}
