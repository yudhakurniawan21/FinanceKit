import { getCurrentUser } from "@/lib/session";
import { SettingsForm } from "@/components/settings/settings-form";
import { createTranslator } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/sign-in?callbackUrl=/settings");
  }

  const t = createTranslator(user.settings?.locale ?? "id-ID");

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-display-sm font-display">{t("navSettings")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("settingsPageDesc")}
        </p>
      </div>
      <SettingsForm settings={user.settings} />
    </div>
  );
}
