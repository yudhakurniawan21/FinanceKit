import { getCurrentUser } from "@/lib/session";
import { listGoals } from "@/lib/db/goals";
import { listWallets } from "@/lib/db/wallets";
import { GoalManager } from "@/components/goals/goal-manager";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function GoalsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/goals");
  }

  const [goals, wallets] = await Promise.all([
    listGoals(user.user.id),
    listWallets(user.user.id),
  ]);

  const currency = user.settings?.currency ?? "IDR";
  const dateFormat = user.settings?.dateFormat ?? "dd/MM/yyyy";
  const timeZone = user.settings?.timeZone ?? "Asia/Jakarta";
  const locale = user.settings?.locale ?? "id-ID";
  const t = createTranslator(locale);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navGoals")}</h1>
        <p className="text-sm text-muted-foreground">{t("goalsPageDesc")}</p>
      </div>
      <GoalManager
        goals={goals}
        currency={currency}
        dateFormat={dateFormat}
        timeZone={timeZone}
        locale={locale}
        wallets={wallets}
      />
    </div>
  );
}